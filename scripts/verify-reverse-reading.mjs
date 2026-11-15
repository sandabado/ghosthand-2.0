import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {TIMING,SCENES} from '../src/core/config.ts';
import {backwardDestination,freshReverseTravel,freshTravel,travelReady} from '../src/core/travel.ts';

const checks=[];
const check=(name,run)=>{try{run();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,error:String(error)});}};
const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [director,engine]=await Promise.all([read('src/core/director.ts'),read('src/core/engine.ts')]);
const between=(text,marker,end)=>{
  const start=text.indexOf(marker);assert(start>=0,`Missing source marker ${marker}`);
  const finish=text.indexOf(end,start+marker.length);assert(finish>start,`Missing source end ${end}`);
  return text.slice(start+marker.length,finish);
};
const evaluate=(text,context)=>runInNewContext(stripTypeScriptTypes(text,{mode:'strip'}),context);
const directorFunction=(name,context)=>evaluate(`(function ${name}${between(director,`export function ${name}`,'\n}')}\n})`,context);
const engineFunction=(name,context)=>evaluate(`(function(){${between(engine,`function ${name}(){`,'\n  }')}\n})`,context);
const sample=scene=>({scene,thresholdReady:true,thresholdPhase:'departing',drainSettled:false,completedGates:[],pursuitUsed:true,forkChoice:null,navUnlocked:true,
  readerEntry:null,previousScene:null,practiceExploring:false,params:{progress:0,sword:0,flash:0,sceneMix:1,cutProgress:0},visitedScenes:[scene],reducedMotion:false});

check('Reverse reading follows the approved beat order and skips both timed cinematic scenes',()=>{
  const expected={OATH:'COMMISSION',COMMISSION:'CRAFT_F4',CRAFT_F4:'CRAFT_F3',CRAFT_F3:'CRAFT_F2',CRAFT_F2:'CRAFT_F1',CRAFT_F1:'DRAIN',DRAIN:'DOJO',DOJO:'LEGEND',FORK:'CRAFT_F4',CHAINS_HOLD:'FORK'};
  for(const [scene,target] of Object.entries(expected))for(const completedGates of [[],[1,2,3,4]])for(const drainSettled of [false,true])assert.equal(backwardDestination({...sample(scene),completedGates,drainSettled}),target);
  for(const scene of ['THRESHOLD','LEGEND','PURSUIT','MERGE'])assert.equal(backwardDestination(sample(scene)),null);
  let scene='OATH';const route=[scene];while((scene=backwardDestination(sample(scene))))route.push(scene);
  assert.deepEqual(route,['OATH','COMMISSION','CRAFT_F4','CRAFT_F3','CRAFT_F2','CRAFT_F1','DRAIN','DOJO','LEGEND']);
});

check('Accepted Fork collapse blocks reverse escape without changing idle optional branches',()=>{
  assert.equal(backwardDestination(sample('FORK')),'CRAFT_F4');
  for(const forkChoice of ['DOJO','CHAINS_HOLD'])assert.equal(backwardDestination({...sample('FORK'),forkChoice}),null);
});

const fresh={ready:true,progress:0,atContentStart:true,burst:5,readyBurst:4,serial:9,consumedSerial:8,direction:-1,elapsedSinceEntry:1,elapsedSinceInput:0};
check('Reverse travel requires fresh upward input at the completed reader start after entry settles',()=>{
  assert.equal(freshReverseTravel(fresh,TIMING.travel),true);
  assert.equal(freshReverseTravel({...fresh,progress:.005},TIMING.travel),true);
  assert.equal(freshReverseTravel({...fresh,elapsedSinceEntry:TIMING.travel.settle,elapsedSinceInput:TIMING.travel.intentLife},TIMING.travel),true);
  for(const patch of [{ready:false},{progress:.006},{atContentStart:false},{burst:4},{serial:8},{direction:0},{direction:1},{elapsedSinceEntry:TIMING.travel.settle-.001},{elapsedSinceInput:TIMING.travel.intentLife+.001},{elapsedSinceInput:-1}])assert.equal(freshReverseTravel({...fresh,...patch},TIMING.travel),false,JSON.stringify(patch));
  for(const key of ['progress','burst','readyBurst','serial','consumedSerial','direction','elapsedSinceEntry','elapsedSinceInput'])for(const value of [NaN,Infinity,-Infinity])assert.equal(freshReverseTravel({...fresh,[key]:value},TIMING.travel),false,`${key} ${value}`);
});

function harness(){
  const state=sample('COMMISSION'),position={renderedScene:'COMMISSION',windowY:0,resizeCalls:0,syncCalls:0,clears:0},nativeScroll=[],lenisScroll=[];
  const section={getAttribute:name=>name==='data-scene'?position.renderedScene:null};
  const shell={isConnected:true,scrollTop:0};
  const layout={shellMax:900,stageTop:0,stageHeight:1700,stageBottom:1700};
  const input={scrollBurst:5,scrollSerial:9,scrollDirection:-1,scrollSource:'wheel',keys:new Set()};
  const context={state,SCENES,TIMING,backwardDestination,freshReverseTravel,freshTravel,travelReady,requestNavigation:()=>false,writeHistory(){},
    useJourney:{getState:()=>state,setState:patch=>Object.assign(state,patch)},
    pendingEntry:null,pendingScroll:120,readingSpine:0,section,shell,layout,input,root:{dataset:{reduced:'false'}},
    logicalTime:10,enteredAt:9,lastScrollAt:10,readyBurst:4,consumedSerial:8,layoutDirty:false,overlap:null,
    runtime:{travelEvents:[]},performance:{now:()=>1000},innerHeight:844,
    gsap:{timeline:()=>({kill(){},to(){return this;}})},
    clearInput(){position.clears++;input.scrollDirection=0;input.keys.clear();},
    resizeSpine(){position.resizeCalls++;},
    syncLayout(){position.syncCalls++;if(state.reducedMotion){layout.stageTop=-position.windowY;layout.stageBottom=layout.stageTop+layout.stageHeight;}},
    lenis:{scrollTo:target=>lenisScroll.push(target)},
    window:{get scrollY(){return position.windowY;},scrollTo({top}){position.windowY=top;nativeScroll.push(top);}},
  };
  context.transitionTo=directorFunction('transitionTo(scene:SceneId,ceremonial=false,fromEnd=false)',context);
  context.retreatJourney=directorFunction('retreatJourney()',context);
  context.navigate=directorFunction("navigate(scene:'DOJO'|'CRAFT_F4'|'COMMISSION'|'FORK'|'OATH')",context);
  context.updateProgress=evaluate(`(function(progress){${between(engine,'const updateProgress=(progress:number)=>{','\n  };')}\n})`,context);
  context.advanceJourney=()=>{throw new Error('Upward intent must not advance forward');};
  const consumeTravel=engineFunction('consumeTravel',context),placeReaderEntry=engineFunction('placeReaderEntry',context);
  return {state,position,input,context,shell,layout,section,nativeScroll,lenisScroll,consumeTravel,placeReaderEntry};
}

check('The real heartbeat travel callback routes one fresh upward event into an end-entry request',()=>{
  const h=harness();h.consumeTravel();
  assert.equal(h.state.scene,'CRAFT_F4');assert.equal(h.state.readerEntry,'end');assert.equal(h.state.pursuitUsed,true);
  assert.equal(h.context.consumedSerial,9);assert.equal(h.context.runtime.travelEvents.length,1);
  assert.equal(h.context.runtime.travelEvents[0].from,'COMMISSION');assert.equal(h.context.runtime.travelEvents[0].to,'CRAFT_F4');
  h.consumeTravel();assert.equal(h.context.runtime.travelEvents.length,1,'The same event cannot route a second chapter');
});

check('The actual heartbeat rejects stale events, unfinished reading, pending entry and outgoing DOM',()=>{
  for(const mutate of [h=>h.context.lastScrollAt=8,h=>h.shell.scrollTop=12,h=>h.state.params.progress=.1,h=>h.input.scrollDirection=1,h=>h.context.enteredAt=9.5,h=>h.context.pendingEntry={scene:'COMMISSION',side:'end'},h=>h.position.renderedScene='OATH']){
    const h=harness();mutate(h);h.context.advanceJourney=()=>{};h.consumeTravel();assert.equal(h.state.scene,'COMMISSION');assert.equal(h.context.runtime.travelEvents.length,0);
  }
});

check('The actual heartbeat permits native reduced-motion reverse travel only at the stage start',()=>{
  const h=harness();h.state.reducedMotion=true;h.context.root.dataset.reduced='true';h.layout.stageTop=-20;
  h.consumeTravel();assert.equal(h.state.scene,'COMMISSION');
  h.layout.stageTop=0;h.consumeTravel();assert.equal(h.state.scene,'CRAFT_F4');assert.equal(h.state.readerEntry,'end');
});

check('End placement waits for the incoming SceneDirector DOM and motion mode',()=>{
  const h=harness();h.context.pendingEntry={scene:'CRAFT_F4',side:'end'};h.state.scene='CRAFT_F4';h.state.readerEntry='end';h.shell.scrollTop=25;
  assert.equal(h.placeReaderEntry(),false);assert.equal(h.shell.scrollTop,25);assert.equal(h.position.resizeCalls,0);assert.equal(h.lenisScroll.length,0);
  h.position.renderedScene='CRAFT_F4';h.state.reducedMotion=true;
  assert.equal(h.placeReaderEntry(),false,'Do not measure before the still layout commits');assert.equal(h.position.resizeCalls,0);
});

check('Desktop end placement sets reader and spine bottoms once and discards transition momentum',()=>{
  const h=harness();h.state.scene='CRAFT_F4';h.position.renderedScene='CRAFT_F4';h.state.readerEntry='end';h.context.pendingEntry={scene:'CRAFT_F4',side:'end'};
  assert.equal(h.placeReaderEntry(),true);assert.equal(h.shell.scrollTop,900);assert.equal(h.context.readingSpine,SCENES.CRAFT_F4.budget);
  assert.equal(h.lenisScroll.at(-1),SCENES.CRAFT_F4.budget);assert.equal(h.state.params.progress,1);assert.equal(h.state.readerEntry,null);
  assert.equal(h.context.pendingEntry,null);assert.equal(h.context.pendingScroll,0);assert.equal(h.input.scrollDirection,0);
  assert.equal(h.context.consumedSerial,9);assert.equal(h.context.enteredAt,10);assert.equal(h.context.lastScrollAt,-Infinity);
  assert.equal(h.placeReaderEntry(),false);assert.equal(h.lenisScroll.length,1);
});

check('Reduced-motion end placement scrolls the native window to the incoming stage bottom',()=>{
  const h=harness();h.state.reducedMotion=true;h.context.root.dataset.reduced='true';h.context.pendingEntry={scene:'COMMISSION',side:'end'};
  h.state.readerEntry='end';h.position.windowY=180;h.layout.stageTop=-180;
  assert.equal(h.placeReaderEntry(),true);assert.equal(h.nativeScroll.at(-1),1700-844);assert.equal(h.lenisScroll.at(-1),1700-844);
  assert.equal(h.state.params.progress,1);assert.equal(h.layout.stageBottom,844);assert.equal(h.state.readerEntry,null);
});

check('Work and Start a project request top entry even when already viewing that chapter',()=>{
  for(const scene of ['DOJO','COMMISSION']){
    const h=harness();h.state.scene=scene;h.position.renderedScene=scene;h.state.readerEntry=null;h.state.params.progress=1;h.shell.scrollTop=900;
    h.context.navigate(scene);assert.equal(h.state.readerEntry,'start');assert.equal(h.input.scrollDirection,0);assert(h.position.clears>0);
    h.context.pendingEntry={scene,side:h.state.readerEntry};assert.equal(h.placeReaderEntry(),true);
    assert.equal(h.shell.scrollTop,0);assert.equal(h.context.readingSpine,0);assert.equal(h.state.params.progress,0);
  }
});

check('Reverse reading preserves the single-use cut and never repeats the opening',()=>{
  const h=harness();h.state.scene='OATH';h.state.pursuitUsed=true;
  const visited=[];for(let count=0;count<12;count++){
    const old=h.state.scene;h.context.retreatJourney();if(h.state.scene===old)break;visited.push(h.state.scene);
    assert.equal(h.state.readerEntry,'end');assert.equal(h.state.pursuitUsed,true);
  }
  assert.deepEqual(visited,['COMMISSION','CRAFT_F4','CRAFT_F3','CRAFT_F2','CRAFT_F1','DRAIN','DOJO','LEGEND']);
  assert.equal(h.state.scene,'LEGEND');assert(!visited.some(scene=>['THRESHOLD','PURSUIT','MERGE'].includes(scene)));
});

check('Reading upward from a restored About anchor updates terminal Oath progress back to zero',()=>{
  const h=harness();h.state.scene='OATH';h.state.params.progress=1;h.shell.scrollTop=0;h.context.updateProgress(1);
  assert.equal(h.state.params.progress,0,'A zero-budget ending must still expose its reading start for reverse travel');
});

const report={policy:'story-flow-v3-bidirectional',checkedAt:new Date().toISOString(),allPassed:checks.every(check=>check.passed),checks,
  scope:'Reverse route and intent contracts plus the real director, heartbeat travel and reader-placement functions executed with isolated DOM/store/scroll stubs.',
  preserves:['One explicit Summon','The single-use eight-second cut','Existing input freshness and entry-settling guards','One shared heartbeat'],
  limitations:['These stubs do not establish native wheel/touch dispatch, real ScrollTrigger geometry, React commits or visual quality.','Desktop and reduced-motion browser passes must verify incoming bottom placement and forward/back reading across the complete journey.']};
await mkdir(new URL('../docs/user-pass/',import.meta.url),{recursive:true});
await writeFile(new URL('../docs/user-pass/reverse-reading-checks.json',import.meta.url),`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify(report,null,2));
if(!report.allPassed)process.exitCode=1;
