import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {TIMING,SCENES} from '../src/core/config.ts';
import {fragmentTarget,sceneFragment,validReader,validHistory,installNavigation,requestNavigation} from '../src/core/navigation.ts';
import {travelReady} from '../src/core/travel.ts';
import {nativeReadingProgress} from '../src/core/journey-ux.ts';

const checks=[];
const check=(name,run)=>{try{run();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,error:String(error)});}};
const [engine,director]=await Promise.all(['src/core/engine.ts','src/core/director.ts'].map(path=>readFile(new URL(`../${path}`,import.meta.url),'utf8')));
const evaluate=(text,context)=>runInNewContext(stripTypeScriptTypes(text,{mode:'strip'}),context);
function fn(source,name,context,indent='  '){
  const start=source.indexOf(`function ${name}(`),end=source.indexOf(`\n${indent}}`,start);
  assert(start>=0&&end>start,`Missing function ${name}`);return evaluate(`(${source.slice(start,end)}\n})`,context);
}
const snapshot=(scene='DOJO',extra={})=>({scene,offset:0,progress:0,spine:0,reduced:false,fragment:sceneFragment(scene),details:[],focusIndex:-1,...extra});

check('Stable fragments expose both real cases, internal project, About and post-opening Home',()=>{
  for(const [hash,scene] of [['#home','LEGEND'],['#work-wishh','DOJO'],['#work-whole-body','CRAFT_F4'],['#project','COMMISSION'],['#about','OATH']])assert.equal(fragmentTarget(hash).scene,scene);
  assert.equal(fragmentTarget('#about').anchor,'about');
  for(const hash of ['#merge','#pursuit','#javascript:alert(1)','#unknown'])assert.equal(fragmentTarget(hash),null);
});

check('History accepts only readable routes, finite offsets, boolean details and indexed focus',()=>{
  assert.equal(validReader(snapshot()),true);assert.equal(validHistory({ghostHand:1,key:'one',reader:snapshot(),returns:[]}),true);
  for(const patch of [{scene:'MERGE'},{scene:'PURSUIT'},{fragment:'project'},{fragment:'[onclick]'},{offset:-1},{offset:Infinity},{progress:2},{details:['open']},{focusIndex:NaN},{focusIndex:-2},{focusIndex:'button'}])assert.equal(validReader(snapshot('DOJO',patch)),false,JSON.stringify(patch));
  assert.equal(validHistory({ghostHand:1,key:'one',reader:snapshot(),returns:[{scene:'MERGE'}]}),false);
});

check('The installed navigation bridge has one owner and cleans up deterministically',()=>{
  const received=[],remove=installNavigation(request=>received.push(request));
  assert.equal(requestNavigation({kind:'home'}),true);assert.equal(received.length,1);remove();assert.equal(requestNavigation({kind:'home'}),false);
});

function harness(initialScene='DOJO',initialHash=sceneFragment(initialScene)){
  const state={scene:initialScene,previousScene:null,readerEntry:null,navigationStack:[],navUnlocked:initialScene!=='THRESHOLD',thresholdReady:initialScene!=='THRESHOLD',thresholdPhase:initialScene==='THRESHOLD'?'pointing':'departing',reducedMotion:false,
    practiceExploring:false,pursuitUsed:true,dojoSeal:true,commissionSeal:true,swordMoments:['opening-glint','merge'],journeyNumber:1,resetVersion:0,visitedScenes:[initialScene],params:{progress:0,sceneMix:1}};
  const view={scene:initialScene,windowY:0,focused:null,timed:0},entries=[{state:null,url:`/${initialHash?`#${initialHash}`:''}`}];let index=0;
  const details=[{open:false},{open:false}],focus=[0,1,2].map(index=>({index,isConnected:true,focus(){view.focused=this;document.activeElement=this;}}));
  const about={open:false,getBoundingClientRect:()=>({top:100+700-shell.scrollTop}),querySelector:()=>focus[2]};
  const shell={isConnected:true,scrollTop:0,querySelectorAll:selector=>selector==='details'?details:focus,querySelector:selector=>selector==='#studio-about'?about:null,getBoundingClientRect:()=>({top:100}),contains:element=>focus.includes(element)};
  const layout={shellMax:600,stageTop:0,stageHeight:1500,stageBottom:1500},document={activeElement:focus[0]};
  const history={get state(){return entries[index].state;},replaceState(value,title,url){entries[index]={state:structuredClone(value),url};},pushState(value,title,url){entries.splice(index+1);entries.push({state:structuredClone(value),url});index++;}};
  const noop=()=>{},timeline={kill(){},to(){return this;},fromTo(){return this;},set(){return this;},call(){return this;}};
  const context={state,SCENES,TIMING,sceneFragment,fragmentTarget,validHistory,travelReady,nativeReadingProgress,
    savedReaders:new Map(),historyEntries:new Map(),readerFocus:new Map(),historySession:'test',historySerial:0,activeHistoryKey:'initial',activeFragment:initialHash,
    requestedNavigation:null,pendingEntry:null,pendingScroll:0,readingSpine:0,refreshReader:null,focusSelector:'a[href],button,input,textarea,select,summary,[tabindex]',
    section:{getAttribute:()=>view.scene},shell,layout,root:{dataset:{reduced:'false'},querySelector:()=>shell},document,innerHeight:844,
    logicalTime:10,enteredAt:9,lastScrollAt:10,readyBurst:0,consumedSerial:0,readiness:travelReady(state),input:{scrollBurst:1,scrollSerial:1,scrollDirection:0,keys:new Set()},
    runtime:{travelEvents:[],summonEvents:[],ceremonyEvents:[]},performance:{now:()=>1000},overlap:null,timeline:null,
    clearInput(){context.input.scrollDirection=0;context.input.keys.clear();},
    gsap:{timeline:()=>timeline,killTweensOf:noop},soundDirector:{setSilent:noop,emit:noop},recordSword:noop,
    prepareDrain:noop,stopDrainRite:noop,prepareGate:noop,stopGateRites:noop,prepareFork(){state.forkChoice=null;},stopForkRite:noop,prepareDojo:noop,stopDojo:noop,prepareSmithy:noop,stopSmithy:noop,
    tlPursue(){view.timed++;return timeline;},tlPass:()=>timeline,tlFall:()=>timeline,
    resizeSpine(){layout.shellMax=600+details.filter(detail=>detail.open).length*400;layout.stageHeight=1500+details.filter(detail=>detail.open).length*400;},
    syncLayout(){if(state.reducedMotion){layout.stageTop=-view.windowY;layout.stageBottom=layout.stageHeight-view.windowY;}},
    lenis:{scrollTo(target){if(state.reducedMotion)view.windowY=target;}},
    window:{history,location:{pathname:'/',search:'',get hash(){return entries[index].url.includes('#')?`#${entries[index].url.split('#')[1]}`:'';}},get scrollY(){return view.windowY;},scrollTo({top}){view.windowY=top;}},
  };
  context.historyKey=()=>`test-${++context.historySerial}`;
  shell.firstElementChild=context.section;Object.defineProperties(shell,{scrollHeight:{get:()=>layout.shellMax+600},clientHeight:{get:()=>600}});
  context.ScrollTrigger={enable(){},disable(){},create(options){view.spineOptions=options;return{enable(){}};}};context.stage={};
  context.fragmentUrl=fragment=>`/${fragment?`#${fragment}`:''}`;
  const updateStart=engine.indexOf('const updateProgress=(progress:number)=>{')+'const updateProgress='.length,updateEnd=engine.indexOf('\n  };',updateStart);
  context.updateProgress=evaluate(`(${engine.slice(updateStart,updateEnd+4)})`,context);
  for(const name of ['captureReader','rememberCurrent','writeHistory','followNavigation','handleNavigation','restoreLocation','placeReaderEntry','sceneEntry','preserveReaderRefresh','restoreReaderRefresh','makeSpine'])context[name]=fn(engine,name,context);
  context.transitionTo=fn(director,'transitionTo',context,'');
  const subStart=engine.indexOf('useJourney.subscribe((s,old)=>{')+'useJourney.subscribe('.length,subEnd=engine.indexOf('\n  });',subStart);
  context.subscription=evaluate(`(${engine.slice(subStart,subEnd+4)})`,context);
  context.useJourney={getState:()=>state,setState(patch){const old={...state};Object.assign(state,patch);context.subscription(state,old);}};
  function commit(){view.scene=state.scene;context.root.dataset.reduced=String(state.reducedMotion);details.forEach(detail=>detail.open=false);document.activeElement=focus[0];assert.equal(context.placeReaderEntry(),true);}
  function read(offset,open=[false,false],focused=1){details.forEach((detail,i)=>detail.open=open[i]);context.resizeSpine();shell.scrollTop=offset;state.params.progress=offset/layout.shellMax;context.readingSpine=SCENES[state.scene].budget*state.params.progress;document.activeElement=focus[focused];context.readerFocus.set(state.scene,focused);}
  function go(delta){index+=delta;assert(index>=0&&index<entries.length);context.restoreLocation();commit();}
  context.writeHistory('replace',initialHash);
  return {state,view,entries,details,focus,about,shell,layout,document,history,context,commit,read,go,index:()=>index};
}

check('Explicit navigation and Return restore exact reader offset, open study and focused control',()=>{
  const h=harness('CRAFT_F4');h.read(850,[false,true],1);h.context.handleNavigation({kind:'scene',scene:'COMMISSION'});h.commit();
  assert.equal(h.state.scene,'COMMISSION');assert.equal(h.state.navigationStack.length,1);
  h.context.handleNavigation({kind:'return'});h.commit();
  assert.equal(h.state.scene,'CRAFT_F4');assert.equal(h.shell.scrollTop,850);assert.equal(h.details[1].open,true);assert.equal(h.view.focused,h.focus[1]);assert.equal(h.state.navigationStack.length,0);
});

check('Both Work entries resume their saved reading place when selected again',()=>{
  const h=harness();h.read(480,[true,false]);h.context.handleNavigation({kind:'scene',scene:'CRAFT_F4'});h.commit();h.read(760,[false,true]);
  h.context.handleNavigation({kind:'scene',scene:'DOJO'});h.commit();assert.equal(h.shell.scrollTop,480);assert.equal(h.details[0].open,true);
  h.context.handleNavigation({kind:'scene',scene:'CRAFT_F4'});h.commit();assert.equal(h.shell.scrollTop,760);assert.equal(h.details[1].open,true);
});

check('Browser Back and Forward restore the exact outgoing positions without replaying ceremonies',()=>{
  const h=harness();h.read(430,[true,false]);h.context.handleNavigation({kind:'scene',scene:'CRAFT_F4'});h.commit();h.read(810,[false,true]);
  h.context.handleNavigation({kind:'scene',scene:'COMMISSION'});h.commit();h.read(210);h.go(-1);assert.equal(h.state.scene,'CRAFT_F4');assert.equal(h.shell.scrollTop,810);
  h.go(-1);assert.equal(h.state.scene,'DOJO');assert.equal(h.shell.scrollTop,430);h.go(1);assert.equal(h.state.scene,'CRAFT_F4');h.go(1);assert.equal(h.state.scene,'COMMISSION');assert.equal(h.shell.scrollTop,210);
  assert.equal(h.view.timed,0);assert.equal(h.state.journeyNumber,1);assert.equal(h.state.dojoSeal,true);assert.equal(h.state.commissionSeal,true);
});

check('Optional Fork and holding-room visits return to the exact launch chapter and expanded details',()=>{
  const h=harness('CRAFT_F4');h.read(890,[true,true]);h.context.handleNavigation({kind:'scene',scene:'FORK'});h.commit();h.context.transitionTo('CHAINS_HOLD');h.commit();
  h.context.handleNavigation({kind:'return'});h.commit();assert.equal(h.state.scene,'CRAFT_F4');assert.equal(h.shell.scrollTop,890);assert(h.details.every(detail=>detail.open));
});

check('Home preserves marks and chooses Threshold before entry, Legend after entry',()=>{
  const before=harness('THRESHOLD','');before.context.handleNavigation({kind:'home'});before.commit();assert.equal(before.state.scene,'THRESHOLD');assert.equal(before.state.thresholdPhase,'pointing');
  const after=harness('COMMISSION');after.context.handleNavigation({kind:'home'});after.commit();assert.equal(after.state.scene,'LEGEND');assert.equal(after.state.dojoSeal,true);assert.equal(after.state.commissionSeal,true);assert.equal(after.state.journeyNumber,1);assert.equal(after.view.timed,0);
});

check('Every explicit direct link enters its readable destination without Summon or cut replay',()=>{
  for(const [hash,scene] of [['home','LEGEND'],['work-wishh','DOJO'],['work-whole-body','CRAFT_F4'],['project','COMMISSION'],['about','OATH']]){
    const h=harness('THRESHOLD',hash);h.entries[0].state=null;h.context.restoreLocation(true);h.commit();assert.equal(h.state.scene,scene);assert.equal(h.state.navUnlocked,true);assert.equal(h.state.journeyNumber,1);assert.equal(h.view.timed,0);
    if(hash==='about')assert.equal(h.about.open,true);
  }
});

check('About is an internal anchored destination and Return restores its story origin',()=>{
  const h=harness();h.read(340,[true,false]);h.context.handleNavigation({kind:'about'});h.commit();assert.equal(h.state.scene,'OATH');assert.equal(h.about.open,true);assert.equal(h.context.window.location.hash,'#about');
  assert(h.about.getBoundingClientRect().top>=100&&h.about.getBoundingClientRect().top<700,'The About summary must be visible inside the reader');
  h.context.handleNavigation({kind:'return'});h.commit();assert.equal(h.state.scene,'DOJO');assert.equal(h.shell.scrollTop,340);assert.equal(h.context.window.location.hash,'#work-wishh');
});

check('Every actual spine refresh preserves the connected About reader and focus after pin reparenting',()=>{
  const h=harness();h.context.handleNavigation({kind:'about'});h.commit();h.context.makeSpine();const top=h.shell.scrollTop;
  for(let repeat=0;repeat<3;repeat++){
    h.view.spineOptions.onRefreshInit();h.shell.scrollTop=0;h.document.activeElement=null;h.view.spineOptions.onRefresh();
    assert.equal(h.shell.scrollTop,top);assert.equal(h.document.activeElement,h.focus[2]);assert(h.about.getBoundingClientRect().top<700);
  }
});

check('Pin refresh never restores an outgoing or pending reader over incoming placement',()=>{
  const h=harness();h.context.makeSpine();h.read(300);h.view.spineOptions.onRefreshInit();h.context.pendingEntry={scene:'DOJO',side:'start'};h.shell.scrollTop=0;h.view.spineOptions.onRefresh();assert.equal(h.shell.scrollTop,0);
  h.context.pendingEntry=null;h.read(320);h.view.spineOptions.onRefreshInit();h.state.scene='COMMISSION';h.shell.scrollTop=0;h.view.spineOptions.onRefresh();assert.equal(h.shell.scrollTop,0);
});

check('History uses one entry per navigation or chapter rather than one per input frame',()=>{
  const h=harness(),count=h.entries.length;for(let i=0;i<30;i++){h.read(i*10);h.context.rememberCurrent();}assert.equal(h.entries.length,count);
  h.context.handleNavigation({kind:'scene',scene:'COMMISSION'});h.commit();assert.equal(h.entries.length,count+1);h.context.handleNavigation({kind:'scene',scene:'COMMISSION'});h.commit();assert.equal(h.entries.length,count+1);
});

check('A second navigation before React commits replaces the pending request without leaking it',()=>{
  const h=harness();h.context.handleNavigation({kind:'scene',scene:'CRAFT_F4'});h.context.handleNavigation({kind:'scene',scene:'COMMISSION'});h.commit();assert.equal(h.state.scene,'COMMISSION');assert.equal(h.context.requestedNavigation,null);assert.equal(h.context.pendingEntry,null);assert.equal(h.context.window.location.hash,'#project');
});

check('Reduced-motion Return restores native reading offset after reopening details',()=>{
  const h=harness();h.state.reducedMotion=true;h.context.root.dataset.reduced='true';h.details[1].open=true;h.context.resizeSpine();h.view.windowY=620;h.context.syncLayout();h.context.readingSpine=300;
  h.context.handleNavigation({kind:'scene',scene:'COMMISSION'});h.commit();h.context.handleNavigation({kind:'return'});h.commit();assert.equal(h.view.windowY,620);assert.equal(h.details[1].open,true);
});

const report={policy:'story-flow-v4-navigation',checkedAt:new Date().toISOString(),allPassed:checks.every(check=>check.passed),checks,
  scope:'Real engine history, navigation, capture and deferred placement functions plus the real director transition and store callback, executed with isolated history/DOM/timeline stubs.',
  limitations:['Browser acceptance must verify native Back/Forward and direct-link initialization, details geometry, focus, Escape and URL updates.','No production routing, SEO, public deployment or real-device performance is established.']};
await mkdir(new URL('../docs/user-pass/',import.meta.url),{recursive:true});await writeFile(new URL('../docs/user-pass/navigation-history-checks.json',import.meta.url),`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify(report,null,2));if(!report.allPassed)process.exitCode=1;
