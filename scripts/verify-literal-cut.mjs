import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { TIMING } from '../src/core/config.ts';
import { graspAnchorPose,mergeCeremonyPose,mergeSliceGeometry,mergeSlicePose } from '../src/systems/cut/merge-pose.ts';

const checks=[];
const check=(name,run)=>{try{run();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,error:String(error)});}};
const near=(a,b,tolerance=1e-8)=>Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(a),Math.abs(b));
const aspects=[320/844,390/844,760/1000,.8,1,1.44,2,3.5];
const clock=TIMING.merge,cutEnd=clock.cutStart+clock.cutDuration;
const screen=point=>[(point[0]+1)/2,(1-point[1])/2];
const signed=(point,line)=>point[1]-line.slope*point[0]-line.intercept;

check('Every desktop and portrait seam passes through the fully accepted blade and hilt',()=>{
  for(const aspect of aspects){
    const geometry=mergeSliceGeometry(aspect,clock),held=mergeCeremonyPose(clock.cutStart,aspect,clock);
    for(const point of [held.hilt,held.tip])assert(near(signed(screen(point),geometry),0));
    assert(near(geometry.leftY,geometry.intercept));assert(near(geometry.rightY,geometry.slope+geometry.intercept));
    assert(geometry.leftY<1&&geometry.rightY>0,'The physical seam crosses the viewport');
    assert(near(Math.hypot(...geometry.normal),1));
    assert(near(geometry.normal[0]*aspect+geometry.normal[1]*geometry.slope,0),'Separation must be perpendicular in pixels');
  }
});

check('The cutting blade stays rigid and draws along that same seam on every sampled frame',()=>{
  for(const aspect of aspects){
    const geometry=mergeSliceGeometry(aspect,clock),held=mergeCeremonyPose(clock.cutStart,aspect,clock);
    const heldLength=Math.hypot((held.tip[0]-held.hilt[0])*aspect,held.tip[1]-held.hilt[1]);
    for(let i=0;i<=140;i++){
      const pose=mergeCeremonyPose(clock.cutStart+clock.cutDuration*i/140,aspect,clock);
      for(const point of [pose.hilt,pose.tip])assert(near(signed(screen(point),geometry),0));
      assert(near(Math.hypot((pose.tip[0]-pose.hilt[0])*aspect,pose.tip[1]-pose.hilt[1]),heldLength),'A physical sword cannot stretch during its draw');
      assert(near(pose.angle,held.angle));
    }
  }
});

check('The hand stays at the accepted palm until the blade begins the actual draw',()=>{
  for(const aspect of aspects){
    const held=mergeCeremonyPose(clock.cutStart,aspect,clock);
    for(const time of [0,clock.handStart,clock.swordStart,clock.swordStart+clock.swordDuration,clock.cutStart])assert.strictEqual(graspAnchorPose(mergeCeremonyPose(time,aspect,clock),held),held);
    const moving=mergeCeremonyPose(clock.cutStart+.01,aspect,clock);assert(moving.sweep>0);assert.strictEqual(graspAnchorPose(moving,held),moving);
  }
});

check('The page remains whole throughout the strike and begins separating only after the blade clears',()=>{
  for(const aspect of aspects){
    for(const time of [0,clock.swordStart,clock.cutStart,clock.cutStart+.1,cutEnd]){
      const pose=mergeSlicePose(time,aspect,clock);assert.equal(pose.opening,0);assert(pose.upper.every(value=>value===0));
    }
    assert.equal(mergeCeremonyPose(cutEnd,aspect,clock).opacity,0);
    assert(mergeSlicePose(cutEnd+.01,aspect,clock).opening>0);
  }
});

check('The two page halves separate monotonically along opposite sides of one normal',()=>{
  for(const aspect of aspects){
    let previous=0;
    for(let i=0;i<=180;i++){
      const pose=mergeSlicePose(cutEnd+(clock.fork-cutEnd)*i/180,aspect,clock);
      assert(pose.opening>=previous&&pose.opening<=1);previous=pose.opening;
      assert(near(pose.upper[0],-pose.lower[0]));assert(near(pose.upper[1],-pose.lower[1]));
      assert(near(pose.upper[0]*aspect*pose.normal[1]-pose.upper[1]*pose.normal[0],0));
    }
  }
});

check('Both physical pieces clear the full viewport before the eight-second Fork becomes interactive',()=>{
  for(const aspect of aspects){
    const pose=mergeSlicePose(clock.fork-.04,aspect,clock);assert.equal(pose.opening,1);
    for(let x=0;x<=40;x++)for(let y=0;y<=40;y++)for(const [offset,upper] of [[pose.upper,true],[pose.lower,false]]){
      const source=[x/40-offset[0],y/40-offset[1]],inside=source[0]>=0&&source[0]<=1&&source[1]>=0&&source[1]<=1;
      const onPiece=upper?signed(source,pose)<=0:signed(source,pose)>=0;
      assert(!(inside&&onPiece),'No outgoing page fragment should remain over the next choice');
    }
  }
});

check('Slice inputs fail safely to finite values, including nonfinite clocks and viewport dimensions',()=>{
  for(const aspect of [NaN,Infinity,-Infinity,0,-1,...aspects])for(const time of [NaN,Infinity,-Infinity,-20,0,7,7.175,7.35,7.8,8,100])for(const candidate of [clock,{...clock,cutDuration:0},{...clock,fork:NaN},null]){
    const pose=mergeSlicePose(time,aspect,candidate);
    assert([pose.slope,pose.intercept,pose.leftY,pose.rightY,pose.strike,pose.opening,...pose.normal,...pose.upper,...pose.lower].every(Number.isFinite));
    assert(pose.strike>=0&&pose.strike<=1&&pose.opening>=0&&pose.opening<=1);
  }
});

const report={passed:checks.every(check=>check.passed),checks,scope:'Pure coordinate and timing contracts for the blade, DOM pieces and world compositor. Native visible alignment and perceived realism require the browser pass.'};
await mkdir(new URL('../docs/user-pass/',import.meta.url),{recursive:true});
await writeFile(new URL('../docs/user-pass/literal-cut-checks.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(!report.passed)process.exitCode=1;
