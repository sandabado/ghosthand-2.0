import assert from 'node:assert/strict';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';

registerHooks({resolve(specifier,context,nextResolve){
  try{return nextResolve(specifier,context);}catch(error){if(error.code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.')&&!extname(specifier))return nextResolve(specifier+'.ts',context);throw error;}
}});
const {TIMING}=await import('../src/core/config.ts');
const {stillSwordBladePath,stillSwordProjection,stillWeaponLayout}=await import('../src/systems/cut/still-sword.ts');
const {mergeCeremonyPose,openingCeremonyPose}=await import('../src/systems/cut/merge-pose.ts');
const {CEREMONY_SWORD,CEREMONY_SCABBARD,buildCeremonySwordProfile}=await import('../src/systems/cut/sword-geometry.ts');
const {buildSwordProfile}=await import('../src/systems/smithy/geometry.ts');
const {handPlaneTransform,SUMMON_HAND_ASSETS,SUMMON_HAND_SCALE}=await import('../src/systems/ink/hand-assets.ts');
const checks=[];
const check=(name,run)=>{try{run();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,error:String(error)});}};
const near=(a,b,tolerance=1e-7)=>Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(a),Math.abs(b));
const views=[[320,568],[390,844],[768,1024],[1280,900],[1440,1000],[2560,1440]];
const modes=[['merge',.30,-.12],['opening',.30,-.12],['opening',-.55,-.48],['opening',.55,.08]];
const receivedPose=(mode,width,height,x,y)=>mode==='opening'
  ?openingCeremonyPose(TIMING.threshold.swordStart+TIMING.threshold.swordDuration,width/height,TIMING.threshold,x,y)
  :mergeCeremonyPose(TIMING.merge.swordStart+TIMING.merge.swordDuration,width/height,TIMING.merge);

check('The still blade silhouette reaches the same canonical collar and full steel tip',()=>{
  const values=stillSwordBladePath().match(/-?\d+(?:\.\d+)?/g).map(Number),xs=values.filter((_,at)=>at%2===0);
  assert(near(Math.min(...xs),CEREMONY_SWORD.blade.start,1e-6));assert(near(Math.max(...xs),CEREMONY_SWORD.blade.tip[0],1e-6));
});

check('Opening and Merge SVG endpoints project to their actual fully received poses on desktop and portrait layouts',()=>{
  for(const [width,height] of views)for(const [mode,targetX,targetY] of modes){
    const projection=stillSwordProjection(width,height,mode,targetX,targetY),pose=receivedPose(mode,width,height,targetX,targetY);
    const [x,y]=CEREMONY_SWORD.blade.tip,c=Math.cos(projection.rotation),s=Math.sin(projection.rotation);
    const tip=[projection.hilt[0]+projection.scale*(x*c+y*s),projection.hilt[1]+projection.scale*(x*s-y*c)];
    assert(near(tip[0],(pose.tip[0]+1)*width/2));assert(near(tip[1],(1-pose.tip[1])*height/2));
    assert(near(projection.hilt[0],(pose.hilt[0]+1)*width/2));assert(near(projection.hilt[1],(1-pose.hilt[1])*height/2));
  }
});

check('Every still anatomy corner matches the live hand plane and keeps the same fist-to-grip scale',()=>{
  const cameraZ=8,tan=Math.tan(Math.PI/8),asset=SUMMON_HAND_ASSETS.gripping;
  for(const [width,height] of views)for(const [mode,targetX,targetY] of modes){
    const projection=stillSwordProjection(width,height,mode,targetX,targetY),pose=receivedPose(mode,width,height,targetX,targetY);
    const halfHeight=cameraZ*tan,halfWidth=halfHeight*width/height;
    const scale=Math.hypot((pose.tip[0]-pose.hilt[0])*halfWidth,(pose.tip[1]-pose.hilt[1])*halfHeight)/Math.hypot(...CEREMONY_SWORD.blade.tip);
    const angle=pose.angle-Math.atan2(CEREMONY_SWORD.blade.tip[1],CEREMONY_SWORD.blade.tip[0])-asset.axis;
    const live=handPlaneTransform(pose.hilt[0]*halfWidth,pose.hilt[1]*halfHeight,SUMMON_HAND_SCALE.gripping*scale,1.5,angle,asset.pivot,cameraZ,0,.18*scale);
    assert(near(projection.hand.width/projection.scale,SUMMON_HAND_SCALE.gripping));
    for(const [u,v] of [[0,0],[1,0],[1,1],[0,1],[asset.pivot[0],1-asset.pivot[1]]]){
      const lx=(u-.5)*live.scale[0],ly=(.5-v)*live.scale[1],c=Math.cos(angle),s=Math.sin(angle);
      const wx=live.position[0]+lx*c-ly*s,wy=live.position[1]+lx*s+ly*c;
      const livePoint=[width/2+wx/(cameraZ-live.position[2])/tan*height/2,height/2-wy/(cameraZ-live.position[2])/tan*height/2];
      const x=(u-asset.pivot[0])*projection.hand.width,y=(v-(1-asset.pivot[1]))*projection.hand.height;
      const hc=Math.cos(projection.hand.rotation),hs=Math.sin(projection.hand.rotation);
      const stillPoint=[projection.hilt[0]+x*hc-y*hs,projection.hilt[1]+x*hs+y*hc];
      assert(near(livePoint[0],stillPoint[0]));assert(near(livePoint[1],stillPoint[1]));
    }
  }
});

check('The opening keeps the committed horizontal catch, lowered palm and full blade clear of the header',()=>{
  for(const [width,height] of views)for(const targetX of [-100,-.55,.30,.55,100])for(const targetY of [-100,-.48,.08,100]){
    const p=stillSwordProjection(width,height,'opening',targetX,targetY);
    assert(near(p.hilt[0],(Math.max(-.55,Math.min(.55,targetX))+1)*width/2));
    assert(near(p.hilt[1],.78*height));
    assert(near(p.tip[1],.14*height));
    assert(p.tip[0]>=0&&p.tip[0]<=width,'The complete opening blade remains inside the viewport at both pointer extremes');
  }
});

check('Invalid viewport sizes resolve to a finite still projection',()=>{
  for(const width of [0,-1,NaN,Infinity])for(const height of [0,-1,NaN,Infinity]){
    const p=stillSwordProjection(width,height);assert([p.width,p.height,p.scale,p.rotation,...p.hilt,...p.tip,p.hand.width,p.hand.height,p.hand.rotation].every(Number.isFinite));
    assert(p.width>0&&p.height>0&&p.scale>0);
  }
});

check('Commission and Oath side views preserve canonical hardware, blade length and the fitted sheath clearance',()=>{
  for(const sheathed of [false,true]){
    const layout=stillWeaponLayout(sheathed),values=stillSwordBladePath(sheathed).match(/-?\d+(?:\.\d+)?/g).map(Number);
    const points=[];for(let at=0;at<values.length;at+=2)points.push([values[at],values[at+1]]);
    const tip=Math.max(...points.map(point=>point[0]));
    assert(near(tip,CEREMONY_SWORD.blade.tip[0]+(sheathed?CEREMONY_SCABBARD.noseClearance:0),1e-6));
    points.push([CEREMONY_SWORD.grip.start,-CEREMONY_SWORD.grip.radius],[CEREMONY_SWORD.grip.end,CEREMONY_SWORD.grip.radius],[CEREMONY_SWORD.guard.center,-CEREMONY_SWORD.guard.halfWidth],[CEREMONY_SWORD.guard.center,CEREMONY_SWORD.guard.halfWidth],[CEREMONY_SWORD.pommel.center-CEREMONY_SWORD.pommel.thickness/2,0]);
    for(const [x,y] of points){assert(x>=layout.minX&&x<=layout.maxX);assert(-y>=layout.top&&-y<=layout.bottom);}
    for(const width of [260,320,390,768,960]){
      const height=width*layout.height/layout.width;
      for(const [x,y] of points){
        const pixelX=(x-layout.minX)*width/layout.width,pixelY=(-y-layout.top)*height/layout.height;
        assert(pixelX>=0&&pixelX<=width);assert(pixelY>=0&&pixelY<=height);
      }
    }
  }
});

check('The ending stand touches the actual lower sheath profile at both supports',()=>{
  const profile=buildCeremonySwordProfile(buildSwordProfile(true)),layout=stillWeaponLayout(true);
  assert.equal(layout.supports.length,2);assert.equal(stillWeaponLayout(false).supports.length,0);
  for(const support of layout.supports){
    let intersection=null;
    for(let ring=0;ring<profile.rings-1;ring++){
      const a=(ring*profile.sectionSize+6)*3,b=((ring+1)*profile.sectionSize+6)*3;
      if(support.x>=profile.positions[a]&&support.x<=profile.positions[b]){
        const t=(support.x-profile.positions[a])/(profile.positions[b]-profile.positions[a]);intersection=profile.positions[a+1]+(profile.positions[b+1]-profile.positions[a+1])*t;break;
      }
    }
    assert.notEqual(intersection,null);assert(near(support.y,intersection));assert(support.y>-.62);
  }
});

const {subscribeRenderFailure,renderFailureSnapshot,renderFailureServerSnapshot}=await import('../src/core/render-fallback.ts');
check('Merge and Smithy share one renderer-failure observer and release it after their last subscriber',()=>{
  const priorDocument=globalThis.document,priorObserver=globalThis.MutationObserver,instances=[];
  globalThis.document={documentElement:{dataset:{renderFailed:'false'}}};
  globalThis.MutationObserver=class{constructor(notify){this.notify=notify;this.disconnected=false;instances.push(this);}observe(target,options){assert.strictEqual(target,document.documentElement);assert.deepEqual(options.attributeFilter,['data-render-failed']);}disconnect(){this.disconnected=true;}};
  let first=0,second=0,stopFirst=()=>{},stopSecond=()=>{};
  try{
    stopFirst=subscribeRenderFailure(()=>first++);stopSecond=subscribeRenderFailure(()=>second++);assert.equal(instances.length,1);
    assert.equal(renderFailureSnapshot(),false);assert.equal(renderFailureServerSnapshot(),false);
    document.documentElement.dataset.renderFailed='true';instances[0].notify();assert.equal(renderFailureSnapshot(),true);assert.equal(first,1);assert.equal(second,1);
    stopFirst();instances[0].notify();assert.equal(first,1);assert.equal(second,2);assert.equal(instances[0].disconnected,false);
    stopSecond();assert.equal(instances[0].disconnected,true);
  }finally{stopFirst();stopSecond();globalThis.document=priorDocument;globalThis.MutationObserver=priorObserver;}
});

const mergeSource=await readFile('src/systems/cut/MergeCeremony.tsx','utf8');
check('The live hand light projects back to the actual guard using the bottom-origin anatomy pivot',()=>{
  const expression=mergeSource.match(/uBladeLight\.value\.set\((.+)\);/);assert(expression);
  const evaluate=new Function('imagePivot','lightOffset','resource',`return [${expression[1]}]`),asset=SUMMON_HAND_ASSETS.gripping;
  for(const aspect of [1,1.5,2]){
    const imagePivot={x:asset.pivot[0],y:asset.pivot[1],axis:asset.axis},width=SUMMON_HAND_SCALE.gripping,height=width/aspect;
    const uv=evaluate(imagePivot,CEREMONY_SWORD.guard.center/width,{aspect}),x=(uv[0]-imagePivot.x)*width,y=(uv[1]-imagePivot.y)*height,c=Math.cos(-imagePivot.axis),s=Math.sin(-imagePivot.axis);
    assert(near(x*c-y*s,CEREMONY_SWORD.guard.center));assert(near(x*s+y*c,0));
  }
});

const report={checkedAt:new Date().toISOString(),allPassed:checks.every(check=>check.passed),checks,scope:'Opening/Merge projection, Commission/Oath canonical side views and support contact, shared renderer-failure subscription lifecycle, and live hand-spill guard coordinates. Browser pixels, lazy loading, material realism and physical-device readability remain separate review.'};
await mkdir('docs/user-pass',{recursive:true});await writeFile('docs/user-pass/still-sword-checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
if(!report.allPassed)process.exitCode=1;
