import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {TIMING,SCENES} from '../src/core/config.ts';
import {travelDestination,travelReady,freshTravel} from '../src/core/travel.ts';
import {sceneFragment} from '../src/core/navigation.ts';

const checks=[];
const check=(name,run)=>{try{run();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,error:String(error)});}};
const source=async path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const director=await source('src/core/director.ts'),engine=await source('src/core/engine.ts');
const body=(text,marker,end)=>{
  const start=text.indexOf(marker);assert(start>=0,`Missing source marker ${marker}`);
  const finish=text.indexOf(end,start+marker.length);assert(finish>start,`Missing source end ${end}`);
  return text.slice(start+marker.length,finish);
};
const callable=(text,name,context)=>runInNewContext(stripTypeScriptTypes(`(function ${name}${body(text,`export function ${name}`, '\n}')}\n})`,{mode:'strip'}),context);
const newState=()=>({scene:'THRESHOLD',thresholdReady:false,thresholdPhase:'pointing',navUnlocked:false,drainReleased:false,drainSettled:false,completedGates:[],pursuitUsed:false,dojoSeal:false,dojoExploring:false,commissionSeal:false,params:{},forkChoice:null,reducedMotion:false,journeyNumber:1,resetVersion:0});
const state=newState(),route=[],marks=[],scheduled=[];
const timeline={kill(){},to(){return this;},fromTo(){return this;},set(){return this;},call(callback,args,at){scheduled.push({callback,at});return this;}};
const noop=()=>{};
const context={
  state,TIMING,SCENES,travelDestination,travelReady,sceneFragment,route,marks,scheduled,requestedNavigation:null,requestNavigation:()=>false,
  useJourney:{getState:()=>state,setState:patch=>Object.assign(state,patch)},
  transitionTo(scene){state.scene=scene;route.push(scene);},
  runtime:{summonEvents:[],ceremonyEvents:[],drain:{},gates:{},cut:{},dojo:{},smithy:{}},performance:{now:()=>1000},logicalTime:1,source:'keyboard',
  timeline:null,shell:null,input:{scrollBurst:0,scrollSerial:0,scrollDirection:0},
  lenis:{scrollTo:noop},soundDirector:{setSilent:noop,emit:noop,reset:noop},
  gsap:{timeline:()=>timeline,killTweensOf:noop},recordSword:moment=>marks.push(moment),initialParams:()=>({}),overlap:null,
  prepareDrain:noop,stopDrainRite:noop,prepareGate:noop,stopGateRites:noop,prepareFork:noop,stopForkRite:noop,
  prepareDojo:noop,stopDojo:noop,prepareSmithy:noop,stopSmithy:noop,clearInput:noop,
  tlPursue(params,finish){context.pursuitFinish=finish;return timeline;},tlPass:()=>timeline,tlFall:()=>timeline,
};
const advance=callable(director,'advanceJourney()',context),navigate=callable(director,"navigate(scene:'DOJO'|'CRAFT_F4'|'COMMISSION'|'FORK'|'OATH')",context),replay=callable(director,'resetJourney()',context);
const finishOpening=runInNewContext(stripTypeScriptTypes(`(()=>{${body(engine,'const finish=()=>{','\n    };')}})`,{mode:'strip'}),context);
const enterScene=runInNewContext(stripTypeScriptTypes(`(function(){${body(engine,'function sceneEntry(){','\n  }')}\n})`,{mode:'strip'}),context);
const updateReader=runInNewContext(stripTypeScriptTypes(`(function(progress){${body(engine,'const updateProgress=(progress:number)=>{','\n  };')}\n})`,{mode:'strip'}),context);

check('Uncommitted opening ignores scroll advancement and early navigation',()=>{
  for(const target of ['DOJO','COMMISSION','FORK'])navigate(target);
  advance();finishOpening();
  assert.equal(state.scene,'THRESHOLD');assert.equal(state.navUnlocked,false);assert.deepEqual(route,[]);
});

check('One successful opening unlocks Work and Start a project at the experience bridge',()=>{
  state.thresholdPhase='receiving';finishOpening();finishOpening();
  assert.equal(state.scene,'LEGEND');assert.equal(state.navUnlocked,true);assert.deepEqual(route,['LEGEND']);
});

check('Ordinary forward reading reaches work and all practice scenes with zero optional actions',()=>{
  for(const destination of ['DOJO','DRAIN','CRAFT_F1','CRAFT_F2','CRAFT_F3','CRAFT_F4','PURSUIT']){
    assert.equal(travelReady(state),true);advance();assert.equal(state.scene,destination);
  }
  assert.equal(state.pursuitUsed,true);assert.equal(state.drainSettled,false);assert.deepEqual(state.completedGates,[]);
  assert.equal(state.dojoSeal,false);assert.equal(state.commissionSeal,false);
});

check('The actual pursuit completion enters the shared Merge ceremony',()=>{
  enterScene();assert.equal(typeof context.pursuitFinish,'function');context.pursuitFinish();
  assert.equal(state.scene,'MERGE');assert(marks.includes('pursuit'));
});

check('The actual eight-second Merge callback reaches contact without entering Fork',()=>{
  enterScene();const exit=scheduled.filter(step=>step.at===TIMING.merge.fork);
  assert.equal(exit.length,1);exit[0].callback();
  assert.equal(state.scene,'COMMISSION');assert(!route.includes('FORK'));assert(!route.includes('CHAINS_HOLD'));
  assert.equal(context.runtime.ceremonyEvents.at(-1).event,'contact-interactive');
});

check('The exact approved receive, white, flash, cut and silence clock stays unchanged',()=>{
  assert.deepEqual(TIMING.merge,{summon:.4,handStart:1.6,handDuration:2.2,swordStart:3.8,swordDuration:3,flashStart:6.9,flashDuration:.5,cutStart:7,cutDuration:.35,silenceStart:7,silenceEnd:8,fork:8});
  for(const time of [TIMING.merge.summon,TIMING.merge.handStart,TIMING.merge.swordStart,TIMING.merge.flashStart,TIMING.merge.cutStart,TIMING.merge.cutStart+TIMING.merge.cutDuration,TIMING.merge.flashStart+TIMING.merge.flashDuration,TIMING.merge.fork])assert(scheduled.some(step=>step.at===time),`Missing real ceremony callback at ${time}`);
});

check('Contact reaches the ending with neither seal committed',()=>{
  advance();assert.equal(state.scene,'OATH');assert.equal(travelDestination(state),null);
  assert.equal(state.dojoSeal,false);assert.equal(state.commissionSeal,false);
  assert.deepEqual(route,['LEGEND','DOJO','DRAIN','CRAFT_F1','CRAFT_F2','CRAFT_F3','CRAFT_F4','PURSUIT','MERGE','COMMISSION','OATH']);
});

check('Practice completion and seal combinations never gate the main reading route',()=>{
  for(const drainSettled of [false,true])for(const completedGates of [[],[1],[2,4],[1,2,3,4]])for(const dojoSeal of [false,true])for(const commissionSeal of [false,true]){
    for(const [scene,destination] of [['DOJO','DRAIN'],['DRAIN','CRAFT_F1'],['CRAFT_F1','CRAFT_F2'],['CRAFT_F2','CRAFT_F3'],['CRAFT_F3','CRAFT_F4'],['CRAFT_F4','PURSUIT'],['COMMISSION','OATH']]){
      const sample={...newState(),scene,drainSettled,completedGates,dojoSeal,commissionSeal};
      assert.equal(travelReady(sample),true);assert.equal(travelDestination(sample),destination);
    }
  }
});

check('Revisiting work after the single cut cannot stall at Fleet',()=>{
  state.scene='OATH';navigate('DOJO');assert.equal(state.scene,'DOJO');
  for(const destination of ['DRAIN','CRAFT_F1','CRAFT_F2','CRAFT_F3','CRAFT_F4','COMMISSION']){advance();assert.equal(state.scene,destination);}
  assert.equal(state.pursuitUsed,true);
});

check('Work and Start a project stay available throughout every unlocked chapter and optional branch',()=>{
  for(const scene of ['LEGEND','DOJO','DRAIN','CRAFT_F1','CRAFT_F2','CRAFT_F3','CRAFT_F4','PURSUIT','MERGE','FORK','CHAINS_HOLD','COMMISSION','OATH'])for(const destination of ['DOJO','COMMISSION']){
    state.scene=scene;state.navUnlocked=true;navigate(destination);assert.equal(state.scene,destination);
  }
});

check('Fork is an explicit practice sidetrack and holding-room return',()=>{
  for(const scene of ['DRAIN','CRAFT_F1','CRAFT_F2','CRAFT_F3','CRAFT_F4','CHAINS_HOLD']){state.scene=scene;navigate('FORK');assert.equal(state.scene,'FORK');}
  for(const scene of ['LEGEND','DOJO','COMMISSION','OATH']){state.scene=scene;navigate('FORK');assert.equal(state.scene,scene);}
  assert.equal(travelDestination({...state,scene:'CHAINS_HOLD'}),'FORK');
  assert.equal(travelDestination({...state,scene:'FORK',forkChoice:null}),'COMMISSION');
});

check('Zero-action Fork and holding-room visitors can scroll through to contact',()=>{
  const intent={progress:1,atContentEnd:true,burst:5,readyBurst:4,serial:9,consumedSerial:8,direction:1,elapsedSinceEntry:1,elapsedSinceInput:0};
  state.scene='CHAINS_HOLD';state.forkChoice=null;advance();assert.equal(state.scene,'FORK');
  assert(SCENES.FORK.budget>0,'Fork must own an actual reading budget');
  state.params.progress=0;updateReader(1);assert.equal(state.params.progress,1,'The engine must update optional-Fork progress');
  assert.equal(freshTravel({...intent,progress:state.params.progress,ready:travelReady(state)},TIMING.travel),true);
  advance();assert.equal(state.scene,'COMMISSION');
  for(const forkChoice of ['DOJO','CHAINS_HOLD']){
    const sample={...state,scene:'FORK',forkChoice};
    assert.equal(travelReady(sample),false);assert.equal(travelDestination(sample),null);
    assert.equal(freshTravel({...intent,ready:travelReady(sample)},TIMING.travel),false,'Scroll cannot replace the accepted collapse route');
  }
});

check('Scroll travel still rejects stale input, upward input, unfinished reading and timed scenes',()=>{
  const intent={ready:true,progress:1,atContentEnd:true,burst:5,readyBurst:4,serial:9,consumedSerial:8,direction:1,elapsedSinceEntry:1,elapsedSinceInput:0};
  assert.equal(freshTravel(intent,TIMING.travel),true);
  for(const patch of [{direction:-1},{direction:0},{atContentEnd:false},{progress:.9},{elapsedSinceEntry:0},{elapsedSinceInput:TIMING.travel.intentLife+.01},{serial:8},{burst:4}])assert.equal(freshTravel({...intent,...patch},TIMING.travel),false);
  for(const scene of ['PURSUIT','MERGE','OATH'])assert.equal(freshTravel({...intent,ready:travelReady({...newState(),scene})},TIMING.travel),false);
});

check('Explicit replay clears early navigation, exploration, optional marks and the single-use cut',()=>{
  Object.assign(state,{navUnlocked:true,dojoExploring:true,practiceExploring:true,dojoSeal:true,commissionSeal:true,pursuitUsed:true,drainSettled:true,completedGates:[1,2,3,4]});
  replay();
  assert.equal(state.scene,'THRESHOLD');assert.equal(state.thresholdPhase,'pointing');assert.equal(state.navUnlocked,false);
  for(const name of ['dojoExploring','practiceExploring','dojoSeal','commissionSeal','pursuitUsed','drainSettled'])assert.equal(state[name],false,name);
  assert.equal(state.readerEntry,'start');
  assert.equal(state.completedGates.length,0);assert.equal(state.journeyNumber,2);assert.equal(state.resetVersion,1);
});

const report={policy:'story-flow-v2',checkedAt:new Date().toISOString(),allPassed:checks.every(check=>check.passed),checks,
  scope:'Pure route combinations plus actual director and engine completion callbacks executed with isolated timeline/store stubs.',
  supersedes:['V6 required Drain/Craft progression','V7 work-to-Oath destination','V6 mandatory Fork after Merge'],
  historicalEvidence:'Prior policy results are retained in docs/user-pass/inherited-checks/. Superseded expectations are versioned in verify-cut and verify-dojo.',
  limitations:['Stubbed timelines do not measure real timing, native scrolling or focus.','Browser verification must reach contact using only ordinary scrolling after the deliberate opening and exercise optional branch exits.']};
await mkdir(new URL('../docs/user-pass/',import.meta.url),{recursive:true});
await writeFile(new URL('../docs/user-pass/main-journey-checks.json',import.meta.url),`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify(report,null,2));
if(!report.allPassed)process.exitCode=1;
