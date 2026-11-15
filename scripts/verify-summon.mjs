import assert from 'node:assert/strict';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { TIMING } from '../src/core/config.ts';
import { summonPointer,advanceSummonPointer,canCommitSummon } from '../src/core/summon.ts';
import { graspAnchorPose,openingCeremonyPose,mergeCeremonyPose } from '../src/systems/cut/merge-pose.ts';
import { CEREMONY_SWORD,createCeremonyGrip,createCeremonyGuard,createCeremonyCollar,createCeremonyPommel } from '../src/systems/cut/sword-geometry.ts';
import { buildSwordProfile } from '../src/systems/smithy/geometry.ts';
import { handPlaneTransform,SUMMON_HAND_ASSETS } from '../src/systems/ink/hand-assets.ts';

const checks=[];
function check(name,run){
  try{run();checks.push({name,passed:true});}
  catch(error){checks.push({name,passed:false,error:error instanceof Error?error.message:String(error)});}
}
const near=(a,b,tolerance=1e-8)=>Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(a),Math.abs(b));
const finite=values=>values.every(Number.isFinite);
const clock=TIMING.threshold;
const pose=(elapsed,aspect=1.44,x=.30,y=-.12)=>openingCeremonyPose(elapsed,aspect,clock,x,y);
const poseValues=value=>[value.offer,value.grip,value.white,value.sweep,value.opacity,value.angle,value.viewportFraction,value.receiving,value.leave,...value.hilt,...value.tip];

check('Live pointer targets stay finite and inside the visible receiving region',()=>{
  for(const x of [-100,-1,-.55,0,.30,.55,1,100,NaN,Infinity,-Infinity])for(const y of [-100,-1,-.48,-.12,0,.08,1,100,NaN,Infinity,-Infinity]){
    const point=summonPointer(x,y);assert.equal(point.length,2);assert(finite(point));
    assert(point[0]>=-.55&&point[0]<=.55);assert(point[1]>=-.48&&point[1]<=.08);
  }
  const left=summonPointer(-.4,-.2),right=summonPointer(.4,-.2);
  assert(right[0]-left[0]>.7,'Pointer travel must visibly move the hand, not merely flicker a cursor');
});

check('Pointer damping approaches its target without overshoot at common display rates',()=>{
  const target=[.48,-.4],start=[-.5,.04],results=[];
  for(const hz of [30,60,90,120,144,165]){
    let point=[...start];
    for(let n=0;n<hz;n++){
      const next=advanceSummonPointer(point,target,1/hz);assert(finite(next));
      for(let axis=0;axis<2;axis++)assert(next[axis]>=Math.min(point[axis],target[axis])-1e-10&&next[axis]<=Math.max(point[axis],target[axis])+1e-10);
      point=next;
    }
    assert(Math.hypot(point[0]-target[0],point[1]-target[1])<.01);results.push(point);
  }
  for(const point of results)for(let axis=0;axis<2;axis++)assert(near(point[axis],results[0][axis],1e-5),'Equivalent wall time must not depend on refresh rate');
});

check('Zero, negative or nonfinite pointer time cannot launch the hand away from its current pose',()=>{
  const start=[.3,-.12],target=[-.4,-.4];
  for(const dt of [0,-.01,-100,NaN,Infinity,-Infinity]){
    const point=advanceSummonPointer(start,target,dt);assert(finite(point));
    assert(near(point[0],start[0])&&near(point[1],start[1]));
  }
});

check('Only the idle pointing phase at Threshold accepts a deliberate summon',()=>{
  assert.equal(canCommitSummon('THRESHOLD','pointing'),true);
  for(const scene of ['THRESHOLD','LEGEND','DRAIN','CRAFT_F1','MERGE','FORK','DOJO','OATH',undefined,null,'threshold'])for(const phase of ['pointing','receiving','departing',undefined,null,'unknown']){
    assert.equal(canCommitSummon(scene,phase),scene==='THRESHOLD'&&phase==='pointing');
  }
});

check('Opening timing describes descent, catch, departure and a finite automatic exit',()=>{
  assert(clock.swordStart>0&&clock.swordDuration>0&&clock.gripStart>=clock.swordStart&&clock.gripDuration>0);
  assert(clock.gripStart>=clock.swordStart+clock.swordDuration-.25,'The fingers close as the hilt arrives, not while it is still far above the palm');
  assert(clock.departure>=Math.max(clock.swordStart+clock.swordDuration,clock.gripStart+clock.gripDuration));
  assert(clock.unlock+1e-9>=clock.departure+clock.departureDuration);
  assert(clock.unlock<=6,'An entry click should not add another long unresponsive wait');
});

check('The click-local opening begins with no sword and keeps its charge green',()=>{
  for(const aspect of [.43,.46,.8,1,1.44,1.92,2.4]){
    assert.equal(pose(0,aspect).opacity,0);
    for(let n=0;n<=240;n++){
      const actual=pose(n*clock.unlock/240,aspect);
      assert(finite(poseValues(actual)));assert.equal(actual.white,0,'The opening is green; later Merge owns white conversion');
      for(const key of ['offer','grip','opacity','receiving','leave'])assert(actual[key]>=0&&actual[key]<=1,key);
    }
  }
});

check('Hilt-first descent translates one rigid blade toward the palm resolved below the frozen pointer anchor',()=>{
  for(const aspect of [.43,.46,.8,1,1.44,1.92,2.4])for(const target of [[-.4,-.4],[.30,-.12],[.5,.04]]){
    let prior=pose(clock.swordStart,aspect,...target);const initialLength=Math.hypot((prior.tip[0]-prior.hilt[0])*aspect,prior.tip[1]-prior.hilt[1]);
    assert(prior.hilt[1]>target[1]+1.5,'The hilt must approach from above the hand');
    for(let n=1;n<=120;n++){
      const actual=pose(clock.swordStart+n*clock.swordDuration/120,aspect,...target);
      assert(actual.hilt[1]<=prior.hilt[1]+1e-9,'A descending hilt must not rise away from the palm');
      assert(near(actual.hilt[0],target[0]),'The incoming hilt stays on the locked catch axis');
      assert(actual.tip[1]>actual.hilt[1],'The blade points above the approaching hilt');
      assert(near(Math.hypot((actual.tip[0]-actual.hilt[0])*aspect,actual.tip[1]-actual.hilt[1]),initialLength),'A sword may move, but its blade cannot stretch during descent');
      prior=actual;
    }
    assert(near(prior.hilt[0],target[0])&&near(prior.hilt[1],Math.min(target[1],-.56)),'The larger sword lands in the lowered palm while leaving its full blade above the hand');
    assert(prior.tip[1]<=.72+1e-9,'The settled full blade tip must clear the fixed header');
    assert(prior.grip>0,'Grip closure must be underway when the hilt is seated');
    assert(pose(clock.gripStart+clock.gripDuration,aspect,...target).grip>.99,'The hand holds the seated hilt before departure');
  }
});

check('The received weapon rests before the passage and departs completely on the opening clock',()=>{
  for(const aspect of [.46,1,1.44,1.92]){
    const caught=pose(Math.max(clock.swordStart+clock.swordDuration,clock.gripStart+clock.gripDuration),aspect),rest=pose(clock.departure-1e-5,aspect);
    assert(caught.opacity>.99&&caught.grip>.99&&caught.leave===0);
    assert(near(caught.hilt[0],rest.hilt[0])&&near(caught.hilt[1],rest.hilt[1]));
    assert.equal(pose(clock.unlock,aspect).leave,1);
    assert.equal(pose(clock.unlock+60,aspect).opacity,0);
  }
});

check('The receiving hand remains at its accepted palm while the sword approaches and only follows the actual cut',()=>{
  for(const aspect of [.46,1,1.44,1.92]){
    const acceptedOpening=pose(Math.max(clock.swordStart+clock.swordDuration,clock.gripStart+clock.gripDuration),aspect);
    for(let n=0;n<=120;n++){
      const incoming=pose(n*clock.unlock/120,aspect),anchor=graspAnchorPose(incoming,acceptedOpening);
      assert.strictEqual(anchor,acceptedOpening,'The hand must not ride upward with the incoming hilt');
    }
    const acceptedMerge=mergeCeremonyPose(TIMING.merge.swordStart+TIMING.merge.swordDuration,aspect,TIMING.merge);
    for(const time of [0,1.6,3.8,4.3,5.2,6.8,6.9,7])assert.strictEqual(graspAnchorPose(mergeCeremonyPose(time,aspect,TIMING.merge),acceptedMerge),acceptedMerge);
    for(const time of [7.0001,7.175,7.35]){
      const swept=mergeCeremonyPose(time,aspect,TIMING.merge);assert(swept.sweep>0);assert.strictEqual(graspAnchorPose(swept,acceptedMerge),swept);
    }
  }
});

check('Opening pose validation rejects nonfinite time or targets without poisoning scene transforms',()=>{
  for(const bad of [NaN,Infinity,-Infinity,undefined,null]){
    const actual=openingCeremonyPose(bad,bad,clock,bad,bad);
    assert(finite(poseValues(actual)));assert.equal(actual.opacity,0);
  }
});

check('Later Merge retains the exact approved receive, white, cut, silence and Fork schedule',()=>{
  assert.deepEqual(TIMING.merge,{summon:.4,handStart:1.6,handDuration:2.2,swordStart:3.8,swordDuration:3,flashStart:6.9,flashDuration:.5,cutStart:7,cutDuration:.35,silenceStart:7,silenceEnd:8,fork:8});
  for(const aspect of [.46,1,1.44,1.92]){
    assert.equal(mergeCeremonyPose(TIMING.merge.swordStart-1e-5,aspect,TIMING.merge).opacity,0);
    assert(mergeCeremonyPose(TIMING.merge.swordStart+TIMING.merge.swordDuration,aspect,TIMING.merge).white>.999);
    assert.equal(mergeCeremonyPose(TIMING.merge.cutStart+TIMING.merge.cutDuration,aspect,TIMING.merge).opacity,0);
  }
});

check('Actual sword geometry joins the wrapped grip, one thin guard, collar and blade on a continuous axis',()=>{
  const grip=createCeremonyGrip(),guard=createCeremonyGuard(),collar=createCeremonyCollar(),pommel=createCeremonyPommel();
  try{
    for(const geometry of [grip,guard,collar,pommel]){
      assert(finite([...geometry.getAttribute('position').array]));geometry.computeBoundingBox();
      assert(finite([...geometry.boundingBox.min.toArray(),...geometry.boundingBox.max.toArray()]));
    }
    const g=guard.boundingBox,c=collar.boundingBox;
    assert(g.max.x-g.min.x<=.05,'The guard is one thin oval plate rather than a thick stack');
    assert(g.max.y-g.min.y>.4&&g.max.z-g.min.z>.25,'The thin guard still has a readable oval silhouette');
    const guardStart=g.min.x+CEREMONY_SWORD.guard.center,guardEnd=g.max.x+CEREMONY_SWORD.guard.center;
    const collarCenter=(CEREMONY_SWORD.collar.start+CEREMONY_SWORD.collar.end)/2;
    const collarStart=c.min.x+collarCenter,collarEnd=c.max.x+collarCenter;
    assert(guardStart-grip.boundingBox.max.x<=.005,'Guard cannot float away from the grip');
    assert(near(guardEnd,collarStart,1e-6),'Collar must meet the guard');
    assert(near(collarEnd,CEREMONY_SWORD.blade.start,1e-6),'Collar must meet the steel root');
    assert(pommel.boundingBox.max.x+CEREMONY_SWORD.pommel.center>=grip.boundingBox.min.x,'Pommel must close the same grip');
    const profile=buildSwordProfile(false),xs=Array.from(profile.positions).filter((_,index)=>index%3===0);
    const bladeOffset=CEREMONY_SWORD.blade.start-Math.min(...xs);
    assert(near(Math.max(...xs)+bladeOffset,CEREMONY_SWORD.blade.tip[0],1e-6),'The same connected blade reaches the rigid pose tip');
  }finally{for(const geometry of [grip,guard,collar,pommel])geometry.dispose();}
});

check('Each anatomy pose uses a distinct handle-free asset and an interior normalized pivot',()=>{
  const sources=new Set();
  for(const asset of Object.values(SUMMON_HAND_ASSETS)){
    assert(asset.src.startsWith('/summon-entry/'));assert(!asset.src.includes('/atmosphere-v9/'));
    assert(finite([...asset.pivot,asset.axis]));for(const value of asset.pivot)assert(value>0&&value<1);
    sources.add(asset.src);
  }
  assert.equal(sources.size,3,'Pointing, receiving and grasping must not reuse the incompatible old baked-hilt pose');
});

check('Projected anatomy pivots remain at the hilt through rotation, scale and foreground depth',()=>{
  for(const asset of Object.values(SUMMON_HAND_ASSETS))for(const cameraZ of [5,8,12])for(const rigZ of [0,1.2])for(const width of [1,3,6])for(const angle of [-Math.PI/4,0,Math.PI/6,Math.PI/2])for(const anchor of [[-3,2],[0,0],[4,-2]])for(const offset of [.001,.01,.05,.2]){
    const t=handPlaneTransform(anchor[0],anchor[1],width,1.5,angle,asset.pivot,cameraZ,rigZ,offset);
    const local=[(asset.pivot[0]-.5)*t.scale[0],(asset.pivot[1]-.5)*t.scale[1]];
    const world=[t.position[0]+local[0]*Math.cos(t.rotation)-local[1]*Math.sin(t.rotation),t.position[1]+local[0]*Math.sin(t.rotation)+local[1]*Math.cos(t.rotation)];
    for(let axis=0;axis<2;axis++)assert(near(world[axis]/(cameraZ-t.position[2]),anchor[axis]/(cameraZ-rigZ),1e-10),'Foreground hand offset cannot pull the palm off the projected hilt');
  }
});

for(const path of ['src/core/summon.ts','src/components/ThresholdScene.tsx','src/systems/ink/SummonHand.tsx']){
  const source=await readFile(resolve(path),'utf8');
  check(`${path} adds no second animation owner or renderer`,()=>{
    assert(!/\brequestAnimationFrame\s*\(|\bsetInterval\s*\(|gsap\.ticker\.add\s*\(|<Canvas\b|<EffectComposer\b/.test(source));
  });
}

const directory=resolve('docs/summon-entry');await mkdir(directory,{recursive:true});
const report={checkedAt:new Date().toISOString(),checks,allPassed:checks.every(value=>value.passed),scope:'Pure pointer/commit/pose contracts and narrow source ownership checks for the new user-activated P01 opening. Later Merge timing is checked separately and remains unchanged.',limitations:['Pure math does not establish actual pixel alignment, anatomy, material integrity, green luminance or visible hilt continuity.','Exact-once function eligibility does not prove native DOM event routing; native click/tap/key and replay evidence is required.','These checks do not measure browser or GPU performance, physical phones, or visual quality.']};
const reportPath=resolve(directory,'checks.json');
try{const old=JSON.parse(await readFile(reportPath,'utf8'));if(old.allPassed===false)await writeFile(resolve(directory,`checks.failed-${old.checkedAt.replace(/[:.]/g,'-')}.json`),JSON.stringify(old,null,2)+'\n');}catch{}
await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(!report.allPassed)process.exitCode=1;
