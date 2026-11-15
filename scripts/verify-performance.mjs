import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getRenderQuality, renderQualityState, setRenderQualityTier } from '../src/core/render-quality.ts';
import { openingCeremonyPose, mergeCeremonyPose } from '../src/systems/cut/merge-pose.ts';
import { createGovernor, observeGovernor, percentile, nextRenderDeadline } from '../src/core/performance-policy.ts';
import { TIMING } from '../src/core/config.ts';

// Deterministic policy contracts. This script does not measure browser or GPU FPS.
const checks=[];
function check(name,run){
  try{run();checks.push({name,passed:true});}
  catch(error){checks.push({name,passed:false,error:error instanceof Error?error.message:String(error)});}
}
const tiers=['cinematic','balanced','lean'];
const viewports=[[320,740],[390,844],[1250,1300],[1440,1000],[1920,1080],[3840,2160]];
const near=(a,b,tolerance=1e-8)=>Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(a),Math.abs(b));
const finitePose=pose=>[pose.offer,pose.grip,pose.white,pose.sweep,pose.opacity,pose.angle,...pose.hilt,...pose.tip,pose.viewportFraction].every(Number.isFinite);
const sample=(patch={})=>({now:3000,windowMs:1000,fps:60,p95Ms:17,samples:60,critical:false,active:true,reduced:false,...patch});
const observe=(state,patch)=>observeGovernor(state,sample(patch));

check('Percentiles retain real slow samples, reject nonfinite values, and leave inputs untouched',()=>{
  const source=[100,16,16,17,NaN,Infinity,-1,18],copy=[...source];
  assert.equal(percentile(source,.5),17);assert.equal(percentile(source,.95),100);
  assert.deepEqual(source,copy);
  assert.equal(percentile([], .95),null);assert.equal(percentile([NaN,Infinity,-1],.95),null);
  assert.equal(percentile([2,8,12],0),2);assert.equal(percentile([2,8,12],1),12);
  assert.equal(percentile([2,8,12],NaN),8);
});

check('Warmup prevents an immediate quality loss even under severe pressure',()=>{
  const original=createGovernor('cinematic',1000);
  let state=original;
  for(const now of [1000,1500,2000,3499]){
    const result=observe(state,{now,fps:12,p95Ms:90});
    assert.equal(result.changed,false);assert.equal(result.state.tier,'cinematic');
    assert.equal(result.state.badWindows,0);state=result.state;
  }
  assert.deepEqual(original,createGovernor('cinematic',1000),'Observations cannot mutate the prior state');
});

check('An isolated slow window cannot downgrade a settled scene',()=>{
  let state=createGovernor('cinematic',0);
  const slow=observe(state,{now:3000,fps:25,p95Ms:45});
  assert.equal(slow.changed,false);assert.equal(slow.state.tier,'cinematic');state=slow.state;
  const neutral=observe(state,{now:4000,fps:55,p95Ms:23});
  assert.equal(neutral.changed,false);assert.equal(neutral.state.badWindows,0);
  const nextSlow=observe(neutral.state,{now:5000,fps:25,p95Ms:45});
  assert.equal(nextSlow.changed,false);assert.equal(nextSlow.state.tier,'cinematic');
});

check('Sustained pressure lowers only one tier and honors the cooldown',()=>{
  let state=createGovernor('cinematic',0),result;
  for(const now of [3000,4000]){result=observe(state,{now,fps:30,p95Ms:35});state=result.state;}
  assert.equal(result.changed,true);assert.equal(state.tier,'balanced');
  for(const now of [4500,5000,6500]){result=observe(state,{now,fps:30,p95Ms:35});state=result.state;assert.equal(result.changed,false);assert.equal(state.tier,'balanced');}
  result=observe(state,{now:7000,fps:30,p95Ms:35});assert.equal(result.changed,true);assert.equal(result.state.tier,'lean');
});

check('Healthy promotion needs more sustained evidence than a downgrade',()=>{
  let state=createGovernor('lean',0),result;
  for(let index=0;index<7;index++){
    result=observe(state,{now:3000+index*1000,fps:60,p95Ms:17});state=result.state;
    assert.equal(result.changed,false);assert.equal(state.tier,'lean');
  }
  result=observe(state,{now:10000,fps:60,p95Ms:17});
  assert.equal(result.changed,true);assert.equal(result.state.tier,'balanced');
  assert.equal(result.state.badWindows,0);assert.equal(result.state.goodWindows,0);
});

check('Neutral windows break a promotion streak and prevent boundary oscillation',()=>{
  let state=createGovernor('balanced',0);
  for(let index=0;index<7;index++)state=observe(state,{now:3000+index*1000}).state;
  const neutral=observe(state,{now:10000,fps:55,p95Ms:23});
  assert.equal(neutral.changed,false);assert.equal(neutral.state.goodWindows,0);
  const nextGood=observe(neutral.state,{now:11000});assert.equal(nextGood.changed,false);assert.equal(nextGood.state.tier,'balanced');
  state=createGovernor('balanced',0);
  for(let index=0;index<100;index++){
    const result=observe(state,{now:3000+index*1000,fps:index%2?58:52,p95Ms:index%2?20:26});
    assert.equal(result.changed,false);assert.equal(result.state.tier,'balanced');state=result.state;
  }
});

check('Hidden, reduced, and protected-ceremony samples cannot change quality or preserve a slow streak',()=>{
  for(const excluded of [{active:false},{reduced:true},{critical:true}]){
    let state=observe(createGovernor('cinematic',0),{now:3000,fps:10,p95Ms:100}).state;
    const skipped=observe(state,{now:4000,fps:10,p95Ms:100,...excluded});
    assert.equal(skipped.changed,false);assert.equal(skipped.state.tier,'cinematic');
    assert.equal(skipped.state.badWindows,0);assert.equal(skipped.state.goodWindows,0);
    const next=observe(skipped.state,{now:5000,fps:10,p95Ms:100});assert.equal(next.changed,false);
  }
});

check('Nonfinite and insufficient samples cannot manufacture a downgrade',()=>{
  const invalid=[{now:NaN},{now:Infinity},{windowMs:NaN},{windowMs:Infinity},{windowMs:749},{fps:NaN},{fps:Infinity},{fps:null},{fps:0},{fps:-1},{p95Ms:NaN},{p95Ms:Infinity},{p95Ms:null},{p95Ms:0},{samples:0},{samples:.5},{samples:NaN},{samples:Infinity}];
  for(const patch of invalid){
    const previous=observe(createGovernor('cinematic',0),{now:3000,fps:10,p95Ms:100}).state;
    const result=observe(previous,{now:4000,fps:10,p95Ms:100,...patch});
    assert.equal(result.changed,false,JSON.stringify(patch));assert.equal(result.state.tier,'cinematic');assert.equal(result.state.badWindows,0);
  }
});

check('Sustained severe pressure can lower quality even below twenty frames per window',()=>{
  for(const count of [1,8,19]){
    const first=observe(createGovernor('cinematic',0),{now:3000,fps:count,p95Ms:1000/count,samples:count});
    assert.equal(first.changed,false);
    const second=observe(first.state,{now:4000,fps:count,p95Ms:1000/count,samples:count});
    assert.equal(second.changed,true);assert.equal(second.state.tier,'balanced');
  }
});

check('Long runs stay at the authored outer tiers without an invalid tier escape',()=>{
  for(const [tier,pressure] of [['cinematic',{fps:60,p95Ms:17}],['lean',{fps:20,p95Ms:50}]]){
    let state=createGovernor(tier,0);
    for(let index=0;index<1000;index++){
      const result=observe(state,{now:3000+index*1000,...pressure});
      assert.equal(result.changed,false);assert.equal(result.state.tier,tier);state=result.state;
    }
  }
});

check('The render deadline rejects invalid time and resumes without a catch-up burst',()=>{
  for(const bad of [NaN,Infinity,-Infinity])assert.equal(nextRenderDeadline(bad,1).render,false);
  const first=nextRenderDeadline(0,NaN);assert.equal(first.render,true);assert(first.nextDeadline>0);
  assert.equal(nextRenderDeadline(0,first.nextDeadline).render,false);
  const resumed=nextRenderDeadline(30,first.nextDeadline);assert.equal(resumed.render,true);assert(resumed.nextDeadline>30);
  assert.equal(nextRenderDeadline(30,resumed.nextDeadline).render,false);
  const reversed=nextRenderDeadline(.5,10);assert.equal(reversed.render,true);assert(reversed.nextDeadline>.5&&reversed.nextDeadline<1);
  const still=nextRenderDeadline(0,NaN,true);assert(still.nextDeadline>=.099);
  assert.equal(nextRenderDeadline(.02,still.nextDeadline,true).render,false);
});

check('A sixty-hertz schedule preserves phase at sixty, ninety, and high-refresh heartbeats',()=>{
  for(const hz of [30,60,90,120,144,165,240]){
    let deadline=NaN,count=0,last=-Infinity;
    for(let index=0;index<hz*10;index++){
      const now=index/hz,result=nextRenderDeadline(now,deadline);deadline=result.nextDeadline;
      assert(Number.isFinite(deadline));
      if(result.render){assert(now>last);count++;last=now;}
    }
    assert(Math.abs(count-Math.min(60,hz)*10)<=1,`${hz} Hz heartbeat produced ${count} renders over ten seconds`);
  }
});

check('Reduced-motion scheduling stays at ten submissions per second across refresh rates',()=>{
  for(const hz of [30,60,90,120,144,165]){
    let deadline=NaN,count=0;
    for(let index=0;index<hz*10;index++){
      const result=nextRenderDeadline(index/hz,deadline,true);deadline=result.nextDeadline;if(result.render)count++;
    }
    assert(Math.abs(count-100)<=1,`${hz} Hz reduced path produced ${count} renders over ten seconds`);
  }
});

check('Ideal ninety and high-refresh pacing can restore detail after sufficient headroom',()=>{
  for(const hz of [60,90,120,144,165]){
    let deadline=NaN,last=null;const intervals=[];
    for(let index=0;index<hz*3;index++){
      const now=index/hz,result=nextRenderDeadline(now,deadline);deadline=result.nextDeadline;
      if(result.render){if(last!==null)intervals.push((now-last)*1000);last=now;}
    }
    const cadence=intervals.length*1000/intervals.reduce((sum,ms)=>sum+ms,0),p95=percentile(intervals,.95);
    let state=createGovernor('lean',0),result;
    for(let index=0;index<8;index++){result=observe(state,{now:3000+index*1000,fps:cadence,p95Ms:p95,samples:intervals.length});state=result.state;}
    assert.equal(state.tier,'balanced',`${hz} Hz correctly paced frames must not look permanently overloaded`);
  }
});

check('Every quality tier stays finite, positive, and within its physical-pixel budget',()=>{
  for(const tier of tiers)for(const [width,height] of viewports)for(const nativeDpr of [.25,.75,1,1.5,2,3]){
    const quality=getRenderQuality(tier,width<760,nativeDpr,width,height);
    assert.equal(quality.tier,tier);
    for(const key of ['dpr','pixelBudget','smokeCount','smokeSamples','particleFraction','transmissionScale','bloomResolution']){
      assert(Number.isFinite(quality[key])&&quality[key]>0,`${tier} ${width}×${height}: ${key}`);
    }
    assert(quality.dpr<=nativeDpr,`${tier} must not supersample past the device's native ratio`);
    assert(width*height*quality.dpr**2<=quality.pixelBudget+1,`${tier} ${width}×${height} exceeds its declared pixel budget`);
    assert(Number.isInteger(quality.smokeCount)&&Number.isInteger(quality.smokeSamples));
  }
});

check('Lower tiers reduce supporting workload without increasing another cost budget',()=>{
  for(const [width,height] of viewports){
    const profiles=tiers.map(tier=>getRenderQuality(tier,width<760,3,width,height));
    for(let index=1;index<profiles.length;index++){
      const prior=profiles[index-1],next=profiles[index];
      for(const key of ['dpr','pixelBudget','smokeCount','smokeSamples','particleFraction','shadowSize','transmissionScale','bloomResolution']){
        assert(next[key]<=prior[key],`${next.tier} increases ${key}`);
      }
      assert(next.smokeSamples<prior.smokeSamples&&next.smokeCount<prior.smokeCount,'A lower tier must provide a meaningful atmosphere reduction');
      assert(!(next.shadow&&!prior.shadow),'Shadows cannot return in a lower tier');
    }
  }
});

check('Compact quality never asks for a larger supporting workload than desktop quality',()=>{
  for(const tier of tiers){
    const desktop=getRenderQuality(tier,false,2,390,844),compact=getRenderQuality(tier,true,2,390,844);
    for(const key of ['dpr','pixelBudget','smokeCount','smokeSamples','particleFraction','shadowSize','transmissionScale','bloomResolution'])assert(compact[key]<=desktop[key],key);
  }
});

check('Malformed quality inputs cannot poison renderer dimensions or preset values',()=>{
  for(const tier of [undefined,null,'unknown','constructor','toString','__proto__']){
    const actual=getRenderQuality(tier,false,2,1440,1000),fallback=getRenderQuality('cinematic',false,2,1440,1000);
    assert.deepEqual(actual,fallback,`Invalid tier ${String(tier)} must use a safe profile`);
  }
  for(const bad of [NaN,Infinity,-Infinity,0,-1]){
    const quality=getRenderQuality('lean',true,bad,bad,bad);
    assert(Number.isFinite(quality.dpr)&&quality.dpr>0);
    assert(Number.isFinite(quality.pixelBudget)&&quality.pixelBudget>0);
  }
});

check('Quality profiles are independent values and tier selection rejects prototype names',()=>{
  const expected=getRenderQuality('cinematic',false,2,1440,1000),mutated=getRenderQuality('cinematic',false,2,1440,1000);
  mutated.smokeCount=9999;mutated.dpr=9999;
  assert.deepEqual(getRenderQuality('cinematic',false,2,1440,1000),expected);
  const original=renderQualityState.tier;
  try{
    setRenderQualityTier('balanced');assert.equal(renderQualityState.tier,'balanced');
    for(const invalid of ['unknown','constructor','toString','__proto__']){setRenderQualityTier(invalid);assert.equal(renderQualityState.tier,'balanced');}
  }finally{setRenderQualityTier(original);}
});

check('The deliberate opening receives a green sword before its passage starts',()=>{
  for(const aspect of [.43,.46,.8,1,1.44,1.92,2.4]){
    const clock=TIMING.threshold;
    let previous=openingCeremonyPose(0,aspect,clock);
    assert.equal(previous.opacity,0);assert.equal(previous.sweep,0);
    for(let index=1;index<=160;index++){
      const pose=openingCeremonyPose(index*clock.departure/160,aspect,clock);
      assert(finitePose(pose));
      for(const key of ['offer','grip','opacity']){
        assert(pose[key]>=previous[key]-1e-10,`${key} cannot reverse before the settled opening`);
        assert(pose[key]>=0&&pose[key]<=1,key);
      }
      assert.equal(pose.white,0,'The opening stays green; later Merge owns white conversion');
      assert.equal(pose.sweep,0);
      assert(!['cut','gone'].includes(pose.phase));previous=pose;
    }
    const held=openingCeremonyPose(Math.max(clock.swordStart+clock.swordDuration,clock.gripStart+clock.gripDuration),aspect,clock);
    assert(near(held.opacity,1)&&near(held.offer,1)&&near(held.grip,1)&&near(held.white,0));
    assert.equal(held.phase,'held');
    assert(held.tip[1]>held.hilt[1]&&held.viewportFraction>.18,'The received opening blade must extend above its hilt');
  }
});

check('A click-local opening completes its departure and does not reappear later',()=>{
  for(const aspect of [.46,1,1.44,1.92]){
    const end=openingCeremonyPose(TIMING.threshold.unlock,aspect,TIMING.threshold);
    assert.equal(end.opacity,0);assert.equal(end.leave,1);
    for(const elapsed of [8,30,300,3600])assert.deepEqual(openingCeremonyPose(elapsed,aspect,TIMING.threshold),end);
  }
});

check('Invalid opening time/aspect remains finite and starts from the waiting pose',()=>{
  for(const bad of [NaN,Infinity,-Infinity,undefined,null]){
    const pose=openingCeremonyPose(bad,bad,TIMING.threshold);
    assert(finitePose(pose));assert.equal(pose.opacity,0);assert.equal(pose.sweep,0);
  }
  assert.deepEqual(openingCeremonyPose(-50,1.44,TIMING.threshold),openingCeremonyPose(0,1.44,TIMING.threshold));
});

check('The later Merge still receives, whitens, cuts, and disappears on its locked clock',()=>{
  for(const aspect of [.46,1,1.44,1.92]){
    assert.equal(mergeCeremonyPose(3.79,aspect).opacity,0);
    const white=mergeCeremonyPose(6.8,aspect);assert(near(white.grip,1)&&near(white.white,1)&&near(white.opacity,1));
    assert.equal(white.sweep,0);
    assert(mergeCeremonyPose(7.175,aspect).sweep>0&&mergeCeremonyPose(7.175,aspect).sweep<1);
    const gone=mergeCeremonyPose(7.35,aspect);assert(near(gone.sweep,1)&&near(gone.opacity,0));
    assert.equal(gone.phase,'gone');
  }
});

for(const path of ['src/core/render-quality.ts','src/core/performance-policy.ts','src/core/performance.ts','src/components/Receipt.tsx']){
  const source=await readFile(resolve(path),'utf8');
  check(`${path} uses no independent animation clock or rendering root`,()=>{
    assert(!/\b(?:requestAnimationFrame|setInterval|setTimeout)\s*\(|gsap\.ticker\.|new\s+Clock\s*\(/.test(source));
    assert(!/<(?:Canvas|EffectComposer)\b/.test(source));
  });
}

const result={checkedAt:new Date().toISOString(),checks,allPassed:checks.every(item=>item.passed),
  scope:'Deterministic quality-governor hysteresis, sample validation, supporting-render budgets, opening received-sword pose, locked later Merge pose, and shared-clock ownership. No browser, transfer, GPU FPS, hardware, or subjective visual-performance measurement is performed.',
  limitations:[
    'Physical-pixel budgets are pure profile calculations. Actual renderer dimensions and per-tier visual fidelity require browser inspection.',
    'Opening and Merge poses are CPU contracts. They do not establish visible hilt alignment, hand grip, sword scale in a real viewport, or page-cut appearance.',
    'Passing checks do not establish callback cadence, GPU execution time, presented FPS, physical mobile performance, or native journey navigation.',
    'This command writes the current summon-entry performance receipt and performs no build, historical receipt rewrite, source push, deployment, or account action. V10 reports remain preserved.'
  ]};
await mkdir(resolve('docs/summon-entry'),{recursive:true});
await writeFile(resolve('docs/summon-entry/performance-checks.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if(!result.allPassed)process.exitCode=1;
