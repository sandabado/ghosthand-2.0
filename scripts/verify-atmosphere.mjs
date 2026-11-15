import assert from 'node:assert/strict';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SCENE_IDS,TIMING } from '../src/core/config.ts';
import { splitScrollDelta,nativeReadingProgress,journeyGuidance } from '../src/core/journey-ux.ts';
import { freshTravel } from '../src/core/travel.ts';
import { mergeCeremonyPose } from '../src/systems/cut/merge-pose.ts';

// Pure policy and source ownership. Native input and GPU acceptance are separate.
const checks=[];
function check(name,run){
  try{run();checks.push({name,passed:true});}
  catch(error){checks.push({name,passed:false,error:error instanceof Error?error.message:String(error)});}
}
const near=(a,b)=>Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
const clamp=(value,max)=>Math.max(0,Math.min(max,value));
const base={scene:'LEGEND',thresholdPhase:'pointing',thresholdReady:false,drainReleased:false,drainSettled:false,completedGates:[],forgeSeated:[],forgeSettled:[],trainPhase:'idle',ownPhase:'idle',fleetSent:[],fleetSettled:[]};
const guide=(scene,patch={})=>journeyGuidance({...base,scene,...patch});

check('Interior reading consumes distance before the scene spine',()=>{
  assert.deepEqual(splitScrollDelta(70,100,400),{position:170,consumed:70,remainder:0});
  assert.deepEqual(splitScrollDelta(-70,100,400),{position:30,consumed:-70,remainder:0});
});

check('Overshoot carries only unconsumed distance beyond either reading edge',()=>{
  assert.deepEqual(splitScrollDelta(120,350,400),{position:400,consumed:50,remainder:70});
  assert.deepEqual(splitScrollDelta(-120,50,400),{position:0,consumed:-50,remainder:-70});
  assert.deepEqual(splitScrollDelta(120,400,400),{position:400,consumed:0,remainder:120});
  assert.deepEqual(splitScrollDelta(-120,0,400),{position:0,consumed:0,remainder:-120});
});

check('Reversing from an edge reads content instead of forwarding movement',()=>{
  assert.deepEqual(splitScrollDelta(-70,400,400),{position:330,consumed:-70,remainder:0});
  assert.deepEqual(splitScrollDelta(70,0,400),{position:70,consumed:70,remainder:0});
});

check('Empty and negative extents leave finite distance for the outer journey',()=>{
  for(const max of [0,-1,-500])for(const delta of [-600,-.25,0,.25,600]){
    assert.deepEqual(splitScrollDelta(delta,100,max),{position:0,consumed:0,remainder:delta});
  }
});

check('Out-of-range positions normalize before consumption',()=>{
  assert.deepEqual(splitScrollDelta(20,-100,400),{position:20,consumed:20,remainder:0});
  assert.deepEqual(splitScrollDelta(-20,700,400),{position:380,consumed:-20,remainder:0});
  assert.deepEqual(splitScrollDelta(0,700,400),{position:400,consumed:0,remainder:0});
});

check('Fractional trackpad distances retain precision',()=>{
  const result=splitScrollDelta(.1875,11.125,400);
  assert.equal(result.position,11.3125);assert.equal(result.consumed,.1875);assert.equal(result.remainder,0);
  const reverse=splitScrollDelta(-.1875,result.position,400);assert.equal(reverse.position,11.125);assert.equal(reverse.remainder,0);
});

check('Invalid numeric input cannot create nonfinite position, consumption, or carry',()=>{
  const bad=[NaN,Infinity,-Infinity,undefined,null,'100'];
  for(const delta of bad)assert.deepEqual(splitScrollDelta(delta,30,400),{position:30,consumed:0,remainder:0});
  for(const position of bad)assert.deepEqual(splitScrollDelta(10,position,400),{position:10,consumed:10,remainder:0});
  for(const max of bad)assert.deepEqual(splitScrollDelta(10,30,max),{position:0,consumed:0,remainder:10});
});

check('A representative grid stays bounded and conserves signed distance',()=>{
  for(const max of [0,.5,1,560,4000])for(const start of [-10,0,.125,max/2,max,max+100])for(const delta of [-100000,-601,-1,-.125,0,.125,1,601,100000]){
    const result=splitScrollDelta(delta,start,max),normalized=clamp(start,max);
    assert(Object.values(result).every(Number.isFinite));assert(result.position>=0&&result.position<=max);
    assert(near(result.consumed+result.remainder,delta));assert(near(result.position,normalized+result.consumed));
    assert(Math.abs(result.consumed)<=Math.abs(delta));
    if(delta>0){assert(result.consumed>=0&&result.remainder>=0);}else if(delta<0){assert(result.consumed<=0&&result.remainder<=0);}
  }
});

check('Partitioning one directional stream preserves final reading and carry',()=>{
  for(const max of [0,100,4000])for(const start of [0,max/3,max])for(const delta of [-900,-.375,0,.375,900]){
    const direct=splitScrollDelta(delta,start,max);let position=start,consumed=0,remainder=0;
    for(let i=0;i<16;i++){const step=splitScrollDelta(delta/16,position,max);position=step.position;consumed+=step.consumed;remainder+=step.remainder;}
    assert(near(position,direct.position));assert(near(consumed,direct.consumed));assert(near(remainder,direct.remainder));
  }
});

check('A short native document can finish its real stage without an unreachable560pixel quota',()=>{
  // Actual failing still-path dimensions: document1251, viewport844, stage981.
  const viewport=844,documentHeight=1251,stageHeight=981,maxScroll=documentHeight-viewport;
  const oldProgress=maxScroll/TIMING.scrollBudget;
  assert.equal(maxScroll,407);assert(oldProgress<.995);
  assert.equal(nativeReadingProgress(-(stageHeight-viewport),stageHeight,viewport),1);
  const progress=nativeReadingProgress(-maxScroll,stageHeight,viewport);assert.equal(progress,1);
  const intent={ready:true,progress,atContentEnd:true,burst:3,readyBurst:2,serial:9,consumedSerial:8,direction:1,elapsedSinceEntry:2,elapsedSinceInput:0};
  assert.equal(freshTravel({...intent,progress:oldProgress},TIMING.travel),false,'The old hidden quota reproduces the block');
  assert.equal(freshTravel(intent,TIMING.travel),true,'A fresh input may leave the fully read native stage');
});

check('Fitting and empty native stages need no scroll quota but retain readiness and stale-intent guards',()=>{
  for(const height of [0,500,844,848])assert.equal(nativeReadingProgress(0,height,844),1);
  const intent={ready:true,progress:nativeReadingProgress(0,0,844),atContentEnd:true,burst:3,readyBurst:2,serial:9,consumedSerial:8,direction:1,elapsedSinceEntry:2,elapsedSinceInput:0};
  assert.equal(freshTravel(intent,TIMING.travel),true);
  for(const patch of [{ready:false},{serial:8},{direction:0},{elapsedSinceEntry:.4},{elapsedSinceInput:TIMING.travel.intentLife+.001}]){
    assert.equal(freshTravel({...intent,...patch},TIMING.travel),false,JSON.stringify(patch));
  }
});

check('Long native reading reverses coherently and invalid dimensions fail closed with bounded progress',()=>{
  const height=3000,viewport=844,span=height-viewport;
  assert.equal(nativeReadingProgress(0,height,viewport),0);assert.equal(nativeReadingProgress(-span/2,height,viewport),.5);
  assert.equal(nativeReadingProgress(-span,height,viewport),1);assert.equal(nativeReadingProgress(-span-100,height,viewport),1);
  assert(nativeReadingProgress(-500,height,viewport)<nativeReadingProgress(-span/2,height,viewport));
  assert.equal(nativeReadingProgress(100,height,viewport),0);
  for(const args of [[NaN,height,viewport],[0,Infinity,viewport],[0,-1,viewport],[0,height,0],[0,height,-1],[0,height,NaN],[0,height,Infinity]])assert.equal(nativeReadingProgress(...args),0);
  for(const h of [0,500,844,848,849,1000,3000,50000])for(const view of [1,320,740,844,1000])for(const top of [-100000,-2500,-100,0,100,100000]){
    const progress=nativeReadingProgress(top,h,view);assert(Number.isFinite(progress)&&progress>=0&&progress<=1);
  }
});

check('Every real scene has a nonempty guide in the closed mode vocabulary',()=>{
  for(const scene of SCENE_IDS){
    const result=guide(scene);assert(['scroll','required','settling','ceremony','end'].includes(result.mode));
    assert.equal(typeof result.label,'string');assert(result.label.trim().length>0);
    if(result.mode==='required')assert(result.selector?.trim().length>0,scene);else assert.equal(result.selector,undefined,scene);
  }
});

check('Threshold explains its deliberate summon and the resulting automatic passage',()=>{
  const idle=guide('THRESHOLD');assert.equal(idle.mode,'required');assert(idle.selector?.includes('summon'));
  for(const thresholdPhase of ['receiving','departing']){
    const committed=guide('THRESHOLD',{thresholdPhase});assert.equal(committed.mode,'ceremony');assert.equal(committed.selector,undefined);
  }
});

check('Pursuit and Merge explain ceremony instead of inventing a next action',()=>{
  for(const scene of ['PURSUIT','MERGE']){
    const result=guide(scene,{completedGates:[1,2,3,4],thresholdReady:true,drainReleased:true,drainSettled:true});
    assert.equal(result.mode,'ceremony');assert.equal(result.selector,undefined);
  }
});

// Story flow v2: the owner made these rites optional after the initial visitor review.
check('Story flow v2: Drain remains scrollable before, during and after its optional release',()=>{
  for(const patch of [{},{drainReleased:true},{drainReleased:true,drainSettled:true}]){
    const result=guide('DRAIN',patch);assert.equal(result.mode,'scroll');assert.equal(result.selector,undefined);
  }
});

check('Story flow v2: untouched practice studies never demand a control before scrolling',()=>{
  for(const scene of ['CRAFT_F1','CRAFT_F2','CRAFT_F3','CRAFT_F4']){
    const result=guide(scene);assert.equal(result.mode,'scroll');assert.equal(result.selector,undefined);
  }
});

check('Story flow v2: partially completed practice studies keep the main guidance scrollable',()=>{
  for(const count of [0,1,2]){
    const complete=Array.from({length:count},(_,i)=>i);
    for(const result of [guide('CRAFT_F1',{forgeSeated:complete,forgeSettled:complete}),guide('CRAFT_F4',{fleetSent:complete,fleetSettled:complete})]){
      assert.equal(result.mode,'scroll');assert.equal(result.selector,undefined);
    }
  }
});

check('Story flow v2: optional work in flight cannot turn the main guidance into a wait',()=>{
  for(const [scene,patch] of [['CRAFT_F1',{forgeSeated:[0,1],forgeSettled:[0]}],['CRAFT_F2',{trainPhase:'writing'}],['CRAFT_F3',{ownPhase:'locking'}],['CRAFT_F4',{fleetSent:[0,1],fleetSettled:[0]}]]){
    const result=guide(scene,patch);assert.equal(result.mode,'scroll');assert.equal(result.selector,undefined);
  }
});

check('Completed gate records open scrolling independently of old local visual phases',()=>{
  for(let gate=1;gate<=4;gate++){
    const result=guide(`CRAFT_F${gate}`,{completedGates:[gate],forgeSeated:[0,1,2],forgeSettled:[0],trainPhase:'writing',ownPhase:'locking',fleetSent:[0,1,2],fleetSettled:[0]});
    assert.equal(result.mode,'scroll');assert.equal(result.selector,undefined);
  }
});

check('Dojo and Commission marks remain optional in either local mark state',()=>{
  for(const scene of ['DOJO','COMMISSION'])for(const sealed of [false,true]){
    const result=guide(scene,{dojoSeal:sealed,commissionSeal:sealed});
    assert.equal(result.mode,'scroll');assert.equal(result.selector,undefined);assert(!/seal|mark|hanko/i.test(result.label));
  }
});

check('Fork choice, holding-room return, and terminal Oath remain distinct',()=>{
  const fork=guide('FORK');assert.equal(fork.mode,'scroll');assert.equal(fork.selector,undefined);
  assert.equal(guide('FORK',{forkChoice:'DOJO'}).mode,'ceremony');
  assert.equal(guide('CHAINS_HOLD').mode,'scroll');assert.equal(guide('OATH').mode,'end');
  assert.equal(guide('OATH',{completedGates:[1,2,3,4],thresholdReady:true,drainSettled:true}).selector,undefined);
});

check('A new serial may continue the same burst after the readiness boundary',()=>{
  // Engine records consumedSerial=current and opens only that current burst.
  const boundary={ready:true,progress:1,atContentEnd:true,burst:12,readyBurst:11,serial:80,consumedSerial:80,direction:1,elapsedSinceEntry:2,elapsedSinceInput:0};
  assert.equal(freshTravel(boundary,TIMING.travel),false,'Token present at readiness is consumed');
  assert.equal(freshTravel({...boundary,serial:81},TIMING.travel),true,'New post-ready event does not need a burst gap');
  assert.equal(freshTravel({...boundary,serial:79},TIMING.travel),false,'Earlier serial is not fresh');
});

check('Post-ready serials still need live downward intent, finished reading, and settled entry',()=>{
  const good={ready:true,progress:1,atContentEnd:true,burst:12,readyBurst:11,serial:81,consumedSerial:80,direction:1,elapsedSinceEntry:2,elapsedSinceInput:0};
  for(const patch of [{ready:false},{progress:.994},{atContentEnd:false},{direction:0},{direction:-1},{elapsedSinceEntry:.599},{elapsedSinceInput:TIMING.travel.intentLife+.001},{elapsedSinceInput:-1},{elapsedSinceInput:NaN}]){
    assert.equal(freshTravel({...good,...patch},TIMING.travel),false,JSON.stringify(patch));
  }
});

const pose=(elapsed,aspect=1.44,clock=TIMING.merge)=>mergeCeremonyPose(elapsed,aspect,clock);
const channels=['offer','grip','white','sweep','opacity'];
const aspects=[.2,390/844,.75,.799,.8,1,1.44,16/9,2.4,3.5,5];
const projectedFraction=(p,aspect)=>Math.hypot((p.tip[0]-p.hilt[0])*aspect,p.tip[1]-p.hilt[1])/(2*Math.max(aspect,1));

check('Merge pose channels and projected endpoints remain finite over the full ceremony and viewport range',()=>{
  for(const aspect of aspects)for(let frame=0;frame<=1000;frame++){
    const p=pose(frame*.01,aspect);
    for(const channel of channels)assert(Number.isFinite(p[channel])&&p[channel]>=0&&p[channel]<=1,`${aspect}/${frame}/${channel}`);
    assert.equal(p.hilt.length,2);assert.equal(p.tip.length,2);assert([...p.hilt,...p.tip,p.angle,p.viewportFraction].every(Number.isFinite));
    assert(['waiting','offering','accepting','held','white','cut','gone'].includes(p.phase));assert(p.viewportFraction>0);
  }
});

check('Invalid Merge time and aspect inputs return a safe finite canonical pose',()=>{
  const entry=pose(0);
  for(const elapsed of [-1,-100,NaN,Infinity,-Infinity,undefined,null,'5'])assert.deepEqual(pose(elapsed),entry);
  for(const aspect of [0,-1,NaN,Infinity,-Infinity,null,'1.44'])assert.deepEqual(pose(5.8,aspect),pose(5.8));
});

check('Offer, grip, white conversion and sweep are monotonic bounded local progress',()=>{
  let previous=pose(0);
  for(let frame=1;frame<=1800;frame++){
    const current=pose(frame*.005);
    for(const channel of ['offer','grip','white','sweep'])assert(current[channel]+1e-12>=previous[channel],`${frame}/${channel}`);
    if(current.white>0)assert(current.grip>=1-1e-12,'The hand receives before white conversion');
    if(current.sweep>0){assert(current.white>=1-1e-12);assert(current.grip>=1-1e-12);}
    previous=current;
  }
});

check('The approved Merge clock receives by5.3s and completes white conversion by6.8s',()=>{
  assert(near(TIMING.merge.swordStart+TIMING.merge.swordDuration/2,5.3));
  assert(near(TIMING.merge.swordStart+TIMING.merge.swordDuration,6.8));
  const received=pose(5.3),white=pose(6.8);
  assert(received.offer>=1-1e-12);assert(received.grip>=1-1e-12);assert.equal(received.white,0);
  assert(white.white>=1-1e-12);assert.equal(white.sweep,0);assert.equal(white.opacity,1);
  assert.equal(pose(TIMING.merge.swordStart-.001).opacity,0);
});

check('Received sword coverage is independently projected at70percent or more on desktop and mobile',()=>{
  for(const aspect of aspects)for(const elapsed of [5.3,5.8,6.8,6.9]){
    const p=pose(elapsed,aspect),fraction=projectedFraction(p,aspect);
    assert(near(fraction,p.viewportFraction),'Metric agrees with endpoint projection');
    assert(fraction>=.7-1e-12,`${aspect}/${elapsed}: ${fraction}`);
    assert.equal(p.opacity,1);
  }
});

check('The full received sword endpoints fit ordinary desktop and phone viewports before the cut',()=>{
  for(const aspect of [390/844,1.44,16/9])for(const elapsed of [5.3,5.8,6.8,6.99]){
    const p=pose(elapsed,aspect);
    for(const coordinate of [...p.hilt,...p.tip])assert(coordinate>=-1-1e-8&&coordinate<=1+1e-8,`${aspect}/${elapsed}/${coordinate}`);
    assert(projectedFraction(p,aspect)>=.7-1e-12);
  }
});

check('The cut cannot sweep before7s or make the blade disappear before its final cut interval',()=>{
  for(let frame=0;frame<=700;frame++)assert.equal(pose(frame*.01).sweep,0);
  const end=TIMING.merge.cutStart+TIMING.merge.cutDuration;
  assert(near(end,7.35));assert(pose(7.175).sweep>0&&pose(7.175).sweep<1);assert.equal(pose(end).sweep,1);
  for(const elapsed of [3.96,4.3,5.3,6.8,6.9,7,7.175,7.3])assert.equal(pose(elapsed).opacity,1,`${elapsed}: premature disappearance`);
  assert(pose(end-.02).opacity>0);assert.equal(pose(end).opacity,0);assert.equal(pose(TIMING.merge.fork).opacity,0);
});

check('Reception rests coherently before a continuous cut traverses more than a viewport width',()=>{
  const received=pose(5.3),held=pose(6.99),cut=pose(7.35);
  for(let axis=0;axis<2;axis++){assert(near(received.hilt[axis],held.hilt[axis]));assert(near(received.tip[axis],held.tip[axis]));}
  assert(Math.abs(cut.hilt[0]-held.hilt[0])>2,'The cut crosses more than the NDC viewport width');
  for(const boundary of [5.3,6.8,7]){
    const before=pose(boundary-1e-5),after=pose(boundary+1e-5);
    assert(Math.hypot(...before.hilt.map((value,i)=>value-after.hilt[i]))<.001);
    assert(Math.hypot(...before.tip.map((value,i)=>value-after.tip[i]))<.001);
  }
});

check('Merge pose consumes the injected schedule and invalid policies fall back safely',()=>{
  const shifted={swordStart:1.8,swordDuration:3,cutStart:5,cutDuration:.35,fork:6};
  for(const elapsed of [4.3,4.8,5.8,6.8,7.1,7.2]){
    const a=pose(elapsed),b=pose(elapsed-2,1.44,shifted);
    for(const channel of channels)assert(near(a[channel],b[channel]),`${elapsed}/${channel}`);
    assert(near(a.angle,b.angle));for(let axis=0;axis<2;axis++){assert(near(a.hilt[axis],b.hilt[axis]));assert(near(a.tip[axis],b.tip[axis]));}
  }
  const longer={swordStart:3.8,swordDuration:3.6,cutStart:7.6,cutDuration:.35,fork:8.6};
  assert(pose(6.8,1.44,longer).white<1);assert(pose(7.4,1.44,longer).white>=1-1e-12);
  for(const malformed of [null,{}, {...shifted,swordStart:-1},{...shifted,swordDuration:0},{...shifted,cutDuration:0},{...shifted,cutStart:1},{...shifted,fork:4},{...shifted,swordDuration:NaN}]){
    assert.deepEqual(pose(5.8,1.44,malformed),pose(5.8));
  }
});

for(const path of ['src/core/journey-ux.ts','src/components/JourneyGuide.tsx','src/systems/cut/merge-pose.ts']){
  const source=await readFile(resolve(path),'utf8');
  check(`${path} introduces no independent clock, Canvas, or composer`,()=>{
    assert(!/\b(?:requestAnimationFrame|setInterval|setTimeout)\s*\(|gsap\.ticker\.|new\s+Clock\s*\(/.test(source));
    assert(!/<(?:Canvas|EffectComposer)\b/.test(source));
  });
}

const result={checkedAt:new Date().toISOString(),checks,allPassed:checks.every(item=>item.passed),
  scope:'Pure scroll-distance/guidance and Merge pose contracts plus new-source ownership. Native routing, visible grip/blade/page-cut alignment, shader/lighting quality, actual disposal and physical-device performance require separate evidence.',
  limitations:[
    'Same-burst cases model the documented readiness boundary; they do not establish that browser handlers record it or route native input correctly.',
    'Guidance selectors are policy contracts, not proof that controls are visible, focusable, enabled, or understandable at every viewport.',
    'Merge endpoint projection is a CPU pose contract. It does not prove that the rendered sword matches the endpoints, the real hand grasps its hilt, white light is visible, the page is cut, or the reduced-motion renderer uses the canonical received pose.',
    'This v9-only command changes no historical report and performs no build, source push, public deployment, account action, or audio recording acquisition.'
  ]};
await mkdir(resolve('docs/summon-entry'),{recursive:true});
await writeFile(resolve('docs/summon-entry/ux-checks.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if(!result.allPassed)process.exitCode=1;
