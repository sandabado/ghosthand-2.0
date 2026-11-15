import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const repo=fileURLToPath(new URL('../',import.meta.url));
// Execute the shipped handlers, rather than reimplementing their routing policy.
// This small Element stub covers only their selector vocabulary; native selector,
// focus, layout and touch behavior are verified separately in the browser pass.
const parse=path=>readFileSync(`${repo}/${path}`,'utf8');
const initializer=(source,name)=>{
  const marker=`const ${name}=`,location=source.indexOf(marker);
  assert(location>=0,`Missing handler ${name}`);
  const start=location+marker.length,end=source.indexOf('\n  const ',start);
  assert(end>start,`Missing handler boundary for ${name}`);
  return source.slice(start,end).trim().replace(/;$/,'');
};
const js=code=>stripTypeScriptTypes(code,{mode:'strip'});
class Element {
  constructor(tag='div',classes=[],attributes={},parent=null){Object.assign(this,{tag,classes,attributes,parent});}
  matches(selectors){return selectors.split(',').some(selector=>{selector=selector.trim();const negative=selector.match(/:not\(\[aria-disabled="true"\]\)/);if(negative&&this.attributes['aria-disabled']==='true')return false;selector=selector.replace(/:not\([^)]*\)/,'');if(selector.startsWith('.'))return this.classes.includes(selector.slice(1));if(selector==='[contenteditable="true"]')return this.attributes.contenteditable==='true';return selector===this.tag;});}
  closest(selector){return this.matches(selector)?this:this.parent?.closest(selector)??null;}
}
const engine=parse('src/core/engine.ts'),input={keys:new Set(),scrollDirection:0,scrollBurst:0,scrollSerial:0};
const state={scene:'LEGEND',reducedMotion:false},intents=[];
const env={Element,useJourney:{getState:()=>state},input,document:{pointerLockElement:null},innerHeight:844,TIMING:{scrollBudget:900},layout:{shellMax:600,shellClient:500},logicalTime:4,performance:{now:()=>4},syncLayout(){},commitSummon(){},stopDojoInput(){},clearInput(){},intents};
const handlers=runInNewContext(js(`let pendingScroll=0,touchY=null,touchBlocked=false;const isolated=${initializer(engine,'isolated')};const gestureTarget=${initializer(engine,'gestureTarget')};const scrollIntent=(direction,source,newBurst)=>{if(newBurst)input.scrollBurst++;input.scrollSerial++;input.scrollDirection=direction;intents.push({direction,source});};const onKey=${initializer(engine,'onKey')};const onTouchStart=${initializer(engine,'onTouchStart')};const onTouchMove=${initializer(engine,'onTouchMove')};({onKey,onTouchStart,onTouchMove,gestureTarget,reset(){pendingScroll=0;intents.length=0;input.keys.clear();},snapshot(){return {pendingScroll,touchBlocked,intents:intents.length};}});`),env);
const event=(target,code)=>({target,code,repeat:false,shiftKey:false,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}});
const results=[];
const check=(name,run)=>{
  try{run();results.push({name,passed:true});}
  catch(error){results.push({name,passed:false,error:error instanceof Error?error.message:String(error)});}
};
check('Space leaves story summaries to their native disclosure behavior',()=>{for(const className of ['drain-thread-list','oath8-record']){handlers.reset();const e=event(new Element('summary',[],{},new Element('details',[className])),'Space');handlers.onKey(e);assert.equal(e.defaultPrevented,false);assert.equal(handlers.snapshot().pendingScroll,0);assert.equal(handlers.snapshot().intents,0);}});
check('Home and End remain native caret controls in Train text input',()=>{for(const code of ['Home','End']){handlers.reset();const e=event(new Element('input'),code);handlers.onKey(e);assert.equal(e.defaultPrevented,false);assert.equal(handlers.snapshot().intents,0);assert.equal(input.keys.size,0);}});
check('Story paging remains available outside controls and with PageDown inside text input',()=>{for(const [target,code] of [[new Element(),'Space'],[new Element('summary'),'PageDown'],[new Element('input'),'PageDown'],[new Element(),'End']]){handlers.reset();const e=event(target,code);handlers.onKey(e);assert.equal(e.defaultPrevented,true);assert(handlers.snapshot().pendingScroll>0);assert.equal(handlers.snapshot().intents,1);}});
check('Control-owned key events do not become journey movement',()=>{handlers.reset();const e=event(new Element('button'),'ArrowDown');e.defaultPrevented=true;handlers.onKey(e);assert.equal(handlers.snapshot().intents,0);});
const swipe=target=>{handlers.reset();handlers.onTouchStart({target,touches:[{clientY:600}]});const e={touches:[{clientY:420}],defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};handlers.onTouchMove(e);return {...handlers.snapshot(),prevented:e.defaultPrevented};};
check('Active Drain and Dojo gestures remain isolated from story scrolling',()=>{for(const name of ['drain-look-zone','dojo7-move-pad','dojo7-move-controls']){const result=swipe(new Element('div',[name],{'aria-disabled':'false'}));assert.equal(result.touchBlocked,true);assert.equal(result.pendingScroll,0);assert.equal(result.intents,0);}});
check('Inactive Drain and reduced Dojo controls route swipes into reading',()=>{for(const name of ['drain-look-zone','dojo7-move-pad','dojo7-move-controls']){const disabled=new Element('div',[name],{'aria-disabled':'true'});for(const target of [disabled,new Element('span',[],{},disabled)]){const result=swipe(target);assert.equal(result.touchBlocked,false);assert.equal(result.pendingScroll,180);assert.equal(result.prevented,true);assert.equal(result.intents,1);}}});
check('Reduced motion keeps inactive-pad swipes native while recording travel intent',()=>{state.reducedMotion=true;const result=swipe(new Element('div',['dojo7-move-pad'],{'aria-disabled':'true'}));assert.equal(result.touchBlocked,false);assert.equal(result.prevented,false);assert.equal(result.pendingScroll,0);assert.equal(result.intents,1);state.reducedMotion=false;});
check('Inactive gesture areas explicitly permit vertical native panning',()=>{assert.match(readFileSync(`${repo}/src/app/drain.css`,'utf8'),/\.drain-look-zone\[aria-disabled=true\]\{[^}]*touch-action:pan-y/);assert.match(readFileSync(`${repo}/src/app/dojo.css`,'utf8'),/\.dojo7-move-pad\[aria-disabled=true\],\.dojo7-move-key:disabled\{[^}]*touch-action:pan-y/);});
const receipt=parse('src/components/Receipt.tsx'),details={open:true},receiptState={open:true},effects=[];
const receiptStart=receipt.indexOf('function Receipt(){')+'function Receipt(){'.length;
const receiptBody=receipt.slice(receiptStart,receipt.indexOf('  return <details',receiptStart));
const controls=runInNewContext(js(`(()=>{${receiptBody};return {replay};})()`),{useState:()=>[true,next=>{receiptState.open=next;}],useRef:()=>({current:details}),useJourney:()=>0,useEffect:fn=>effects.push(fn),resetJourney(){assert.equal(details.open,false);assert.equal(receiptState.open,false);receiptState.reset=true;}});
check('Receipt replay closes the native drawer and content before resetting journey',()=>{controls.replay();assert.equal(receiptState.reset,true);});
check('A reset initiated elsewhere also closes the drawer',()=>{details.open=true;receiptState.open=true;effects.at(-1)();assert.equal(details.open,false);assert.equal(receiptState.open,false);});
const foundation=parse('src/components/Foundation.tsx'),effectStart=foundation.indexOf('useLayoutEffect(()=>{')+'useLayoutEffect('.length,layoutCallback=foundation.slice(effectStart,foundation.indexOf('},[scene,resetVersion]);',effectStart)+1);
const focusState={scene:'THRESHOLD',resetVersion:0,focusedScene:{current:{scene:'THRESHOLD',resetVersion:0}},calls:[],root:{current:{querySelector:()=>null}}};
focusState.root.current.querySelector=()=>({tabIndex:0,focus:options=>focusState.calls.push(options)});
const focus=runInNewContext(js(`(${layoutCallback})`),focusState);
check('Initial and StrictMode repeated mounts do not steal entry focus',()=>{focus();focus();assert.equal(focusState.calls.length,0);});
check('Each new scene and replay receive one preventScroll heading focus',()=>{focusState.scene='LEGEND';focus();focus();assert.equal(focusState.calls.length,1);assert.equal(focusState.calls[0].preventScroll,true);focusState.scene='THRESHOLD';focusState.resetVersion=1;focus();assert.equal(focusState.calls.length,2);});
const returns=[];env.handleNavigation=request=>returns.push(request);state.navigationStack=[{}];
check('Idle Escape returns to story while a child-owned cancelled key remains owned',()=>{
  const e=event(new Element(),'Escape');handlers.onKey(e);assert.equal(e.defaultPrevented,true);assert.equal(returns.length,1);
  const owned=event(new Element('button'),'Escape');owned.defaultPrevented=true;handlers.onKey(owned);assert.equal(returns.length,1);
});
check('Escape closes a focused native disclosure before returning to story',()=>{
  let focused=false;const disclosure={open:true,querySelector:()=>({focus(){focused=true;}})},target=new Element('summary');
  target.closest=selector=>selector==='details[open]'?disclosure:null;
  const e=event(target,'Escape');handlers.onKey(e);assert.equal(disclosure.open,false);assert.equal(focused,true);assert.equal(returns.length,1);
});
check('Escape releases pointer lock before returning or closing a disclosure',()=>{
  env.document.pointerLockElement={};let exited=false;env.document.exitPointerLock=()=>{exited=true;env.document.pointerLockElement=null;};
  handlers.onKey(event(new Element(),'Escape'));assert.equal(exited,true);assert.equal(returns.length,1);
});
check('Fork Escape cancels an active stroke but bubbles when the grip is idle',()=>{
  const cut=parse('src/components/CutScenes.tsx'),mode={current:null};let cancellations=0;
  const key=runInNewContext(js(`(${initializer(cut,'onKey')})`),{mode,cancel(){cancellations++;},disabled:false});
  const idle={key:'Escape',defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};key(idle);assert.equal(idle.defaultPrevented,false);assert.equal(cancellations,0);
  mode.current='keyboard';const armed={...idle};key(armed);assert.equal(armed.defaultPrevented,true);assert.equal(cancellations,1);
});
const measuredSources=['src/core/engine.ts','src/components/Receipt.tsx','src/components/Foundation.tsx','src/components/DojoScene.tsx','src/app/drain.css','src/app/dojo.css'];
const report={
  checkedAt:new Date().toISOString(),
  runtime:process.version,
  scope:'Actual source handlers executed with isolated DOM event stubs. CSS checks verify the inactive-state panning declarations.',
  sources:Object.fromEntries(measuredSources.map(path=>[path,createHash('sha256').update(parse(path)).digest('hex')])),
  checks:results,
  passed:results.filter(check=>check.passed).length,
  allPassed:results.every(check=>check.passed),
  limitations:[
    'The Element stub does not establish native selector matching or browser default behavior.',
    'Stubbed hooks exercise the replay and focus callbacks; they do not prove React commit ordering, mounted-element focus or StrictMode lifecycle behavior.',
    'Touch event stubs establish routing intent, not physical-device input, native panning, screen-reader behavior or visual quality.',
    'Root browser acceptance must confirm disclosure activation, input caret movement, inactive-area swipes, scene-heading focus and a visibly uncovered replay.'
  ]
};
const destination=resolve(repo,'docs/user-pass/access-checks.json');
mkdirSync(resolve(repo,'docs/user-pass'),{recursive:true});
writeFileSync(destination,`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify(report,null,2));
if(!report.allPassed)process.exitCode=1;
