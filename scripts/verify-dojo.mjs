import assert from 'node:assert/strict';
import { mkdir,readFile,readdir,writeFile } from 'node:fs/promises';
import { join,relative,resolve } from 'node:path';
import { DOJO_BOUNDS,stepDojoMotion,clampDojoLook,validDojoBuild,nearestDojoStop } from '../src/core/dojo.ts';
import { strokeComplete } from '../src/core/cut.ts';
import { TIMING,SCENES } from '../src/core/config.ts';
import { travelReady,travelDestination,freshTravel } from '../src/core/travel.ts';
import { DOJO_SCROLLS,dojoSeed,dojoWaypoint,buildDojoData } from '../src/systems/dojo/geometry.ts';

// Pure behavior and source ownership. Browser/input/GPU evidence is separate.
const checks=[];
function check(name,run){
  try{run();checks.push({name,passed:true});}
  catch(error){checks.push({name,passed:false,error:error instanceof Error?error.message:String(error)});}
}
const near=(a,b,epsilon=1e-8)=>Math.abs(a-b)<=epsilon;
const neutral={x:0,z:0,vx:0,vz:0};
const finiteMotion=value=>Object.values(value).every(Number.isFinite);

check('ENTER motion preserves still and zero-time states',()=>{
  assert.deepEqual(stepDojoMotion(neutral,{x:0,z:0},0,1/60),neutral);
  const moving={x:.2,z:-.1,vx:.3,vz:-.2};
  const still=stepDojoMotion(moving,{x:1,z:-1},.1,0);
  for(const key of Object.keys(moving))assert(near(still[key],moving[key]),key);
  assert.deepEqual(stepDojoMotion(moving,{x:1,z:-1},.1,-1),still);
});

check('ENTER rejects non-finite state, input, look, and elapsed time',()=>{
  for(const bad of [NaN,Infinity,-Infinity]){
    const cases=[
      [{...neutral,x:bad},{x:0,z:0},0,.02],
      [{...neutral,z:bad},{x:0,z:0},0,.02],
      [{...neutral,vx:bad},{x:0,z:0},0,.02],
      [{...neutral,vz:bad},{x:0,z:0},0,.02],
      [neutral,{x:bad,z:0},0,.02],[neutral,{x:0,z:bad},0,.02],
      [neutral,{x:0,z:0},bad,.02],[neutral,{x:0,z:0},0,bad],
    ];
    for(const args of cases){const result=stepDojoMotion(...args);assert(finiteMotion(result));assert.deepEqual(result,neutral);}
  }
});

check('Diagonal and extreme input cannot outrun ordinary walking',()=>{
  const axial=stepDojoMotion(neutral,{x:1,z:0},0,.05);
  const diagonal=stepDojoMotion(neutral,{x:1,z:1},0,.05);
  assert(near(Math.hypot(axial.vx,axial.vz),Math.hypot(diagonal.vx,diagonal.vz)));
  assert(near(Math.hypot(axial.x,axial.z),Math.hypot(diagonal.x,diagonal.z)));
  const extreme=stepDojoMotion(neutral,{x:100,z:100},0,.05);
  for(const key of Object.keys(diagonal))assert(near(extreme[key],diagonal[key]),key);
  const rotated=stepDojoMotion(neutral,{x:1,z:1},.25,.05);
  assert(near(Math.hypot(rotated.vx,rotated.vz),Math.hypot(axial.vx,axial.vz)));
  assert(Math.hypot(rotated.vx,rotated.vz)<=DOJO_BOUNDS.speed);
});

check('Damped walking gives the same free-space result across frame partitions',()=>{
  const start={x:.1,z:-.1,vx:.3,vz:-.2},move={x:.4,z:.1};
  let full={...start},halves={...start};
  for(let frame=0;frame<18;frame++)full=stepDojoMotion(full,move,.13,1/30);
  for(let frame=0;frame<36;frame++)halves=stepDojoMotion(halves,move,.13,1/60);
  for(const key of Object.keys(start))assert(near(full[key],halves[key]),`${key}: ${full[key]} vs ${halves[key]}`);
  const gap=stepDojoMotion(start,move,.13,5),capped=stepDojoMotion(start,move,.13,.05);
  for(const key of Object.keys(start))assert(near(gap[key],capped[key]),key);
});

check('Room boundaries stop outward motion and permit return without accumulating velocity',()=>{
  for(const direction of [-1,1]){
    let motion={...neutral};
    for(let frame=0;frame<600;frame++){
      motion=stepDojoMotion(motion,{x:direction,z:direction},0,1/60);
      assert(finiteMotion(motion));assert(Math.abs(motion.x)<=DOJO_BOUNDS.x);assert(Math.abs(motion.z)<=DOJO_BOUNDS.z);
    }
    assert(near(motion.x,DOJO_BOUNDS.x*direction));assert(near(motion.z,DOJO_BOUNDS.z*direction));
    assert.equal(motion.vx,0);assert.equal(motion.vz,0);
    const returned=stepDojoMotion(motion,{x:-direction,z:-direction},0,.05);
    assert(Math.abs(returned.x)<Math.abs(motion.x));assert(Math.abs(returned.z)<Math.abs(motion.z));
  }
});

check('Released movement decays rather than drifting indefinitely',()=>{
  let motion=stepDojoMotion(neutral,{x:1,z:0},0,.05);
  const initial=motion.vx;
  for(let frame=0;frame<300;frame++)motion=stepDojoMotion(motion,{x:0,z:0},0,1/60);
  assert(Math.abs(motion.vx)<1e-10);assert(Math.abs(motion.vz)<1e-10);
  assert(motion.x<initial/DOJO_BOUNDS.response+.03,'Stopping distance remains bounded by the damped response');
});

check('Look is finite and bounded independently on each axis',()=>{
  assert.deepEqual(clampDojoLook(.1,-.1),{yaw:.1,pitch:-.1});
  for(const direction of [-1,1])assert.deepEqual(clampDojoLook(direction*100,direction*100),{yaw:direction*DOJO_BOUNDS.yaw,pitch:direction*DOJO_BOUNDS.pitch});
  for(const invalid of [NaN,Infinity,-Infinity]){
    assert.deepEqual(clampDojoLook(invalid,.1),{yaw:0,pitch:.1});
    assert.deepEqual(clampDojoLook(.1,invalid),{yaw:.1,pitch:0});
  }
});

check('Exactly six discrete studies can become focus targets',()=>{
  for(let index=0;index<6;index++)assert.equal(validDojoBuild(index),true);
  for(const index of [-1,6,100,.5,NaN,Infinity,-Infinity,'0',null,undefined])assert.equal(validDojoBuild(index),false);
  const stops=[{index:0,center:100},{index:1,center:300},{index:2,center:500}];
  assert.equal(nearestDojoStop(stops,320,0),1);
  assert.equal(nearestDojoStop(stops,200,2),0,'Equal distances keep the first measured stop');
  assert.equal(nearestDojoStop([{index:12,center:320},{index:3,center:NaN},...stops],490,0),2);
  assert.equal(nearestDojoStop([],200,5),5);assert.equal(nearestDojoStop([],200,9),0);
  assert.equal(nearestDojoStop(stops,NaN,4),4);
});

check('Hanko uses forty finite net pixels, preserving a deliberate reduced-motion equivalent',()=>{
  assert.equal(TIMING.strokePixels,40);
  for(const distance of [0,1,20,39.999,-1,-40,NaN,Infinity,-Infinity])assert.equal(strokeComplete(distance),false);
  for(const distance of [40,40.001,80,240])assert.equal(strokeComplete(distance),true);
  assert.equal(strokeComplete(Math.hypot(0,5)),false,'A long excursion returning to a short net distance is not ready');
});

// Story-flow-v2 places work before optional practice; prior V7 reports are retained.
check('Story-flow-v2 work scrolling reaches practice independently of the optional mark or selected work',()=>{
  assert.equal(SCENES.DOJO.verb,'ENTER');
  for(const dojoSeal of [false,true])for(let selectedMember=0;selectedMember<6;selectedMember++){
    const state={scene:'DOJO',thresholdReady:true,drainSettled:true,completedGates:[1,2,3,4],dojoSeal,selectedMember};
    assert.equal(travelReady(state),true);assert.equal(travelDestination(state),'DRAIN');
  }
});

check('Travel intent expires at the configured age boundary and rejects invalid ages',()=>{
  const ready={ready:true,progress:1,atContentEnd:true,burst:5,readyBurst:4,serial:9,consumedSerial:8,direction:1,elapsedSinceEntry:2};
  const policy=TIMING.travel;
  for(const elapsedSinceInput of [0,.1,policy.intentLife])assert.equal(freshTravel({...ready,elapsedSinceInput},policy),true,`fresh age ${elapsedSinceInput}`);
  for(const elapsedSinceInput of [policy.intentLife+1e-6,2,10,-1,-1e-6,NaN,Infinity,-Infinity]){
    assert.equal(freshTravel({...ready,elapsedSinceInput},policy),false,`invalid or expired age ${elapsedSinceInput}`);
  }
  assert.equal(freshTravel(ready,policy),true,'Callers without an age retain the documented zero-age default');
  assert.equal(freshTravel({...ready,elapsedSinceInput:.25},{settle:.6,intentLife:.2}),false,'A caller-supplied shorter lifetime governs freshness');
  assert.equal(freshTravel({...ready,elapsedSinceInput:.2},{settle:.6,intentLife:.2}),true);
  assert.equal(freshTravel({...ready,elapsedSinceEntry:1,elapsedSinceInput:0},{settle:1.1,intentLife:.85}),false,'Entry settling uses the supplied policy too');
});

check('Revealing the content end later cannot revive an expired downward scroll',()=>{
  const beforeFocus={ready:true,progress:1,atContentEnd:false,burst:5,readyBurst:4,serial:9,consumedSerial:8,direction:1,elapsedSinceEntry:2,elapsedSinceInput:.1};
  assert.equal(freshTravel(beforeFocus,TIMING.travel),false);
  const revealedByFocus={...beforeFocus,atContentEnd:true,elapsedSinceInput:3};
  assert.equal(freshTravel(revealedByFocus,TIMING.travel),false,'Native focus/scrollIntoView does not renew the age of a prior wheel token');
  assert.equal(freshTravel({...revealedByFocus,direction:0,elapsedSinceInput:.1},TIMING.travel),false,'Interactive engagement cancels even an unexpired direction');
  assert.equal(freshTravel({...revealedByFocus,burst:6,serial:10,elapsedSinceInput:0},TIMING.travel),true,'A deliberate new downward input can leave after reading');
});

check('Approved Merge schedule retains its exact overlap, silence, and eight-second contact handoff',()=>{
  assert.deepEqual(TIMING.merge,{summon:.4,handStart:1.6,handDuration:2.2,swordStart:3.8,swordDuration:3,flashStart:6.9,flashDuration:.5,cutStart:7,cutDuration:.35,silenceStart:7,silenceEnd:8,fork:8});
  assert.equal(TIMING.merge.silenceEnd-TIMING.merge.silenceStart,1);
});

const data=buildDojoData();
check('Six finite, distinct hanging stations and a bounded guide are authored deterministically',()=>{
  assert.equal(DOJO_SCROLLS.length,6);
  assert.equal(new Set(DOJO_SCROLLS.map(stop=>stop.position.join(','))).size,6);
  for(const stop of DOJO_SCROLLS){assert.equal(stop.position.length,3);assert(stop.position.every(Number.isFinite));assert(Number.isFinite(stop.yaw));}
  for(let focus=-1;focus<=6;focus+=.125){const point=dojoWaypoint(focus);assert.equal(point.length,3);assert(point.every(Number.isFinite));assert(point.every(value=>Math.abs(value)<30));}
  assert.deepEqual(dojoWaypoint(-100),dojoWaypoint(0));assert.deepEqual(dojoWaypoint(100),dojoWaypoint(5));
});

check('Dojo bar and particle attributes are finite, nondegenerate, and internally consistent',()=>{
  assert(Number.isInteger(data.bars)&&data.bars>0&&data.bars<2000);
  assert.equal(data.matrices.length,data.bars*16);
  for(const name of ['kind','seed','station'])assert.equal(data[name].length,data.bars,name);
  for(const name of ['matrices','kind','seed','station','particlePositions','particleKind','particleSeed'])assert([...data[name]].every(Number.isFinite),name);
  const particles=data.particlePositions.length/3;
  assert(Number.isInteger(particles)&&particles>0&&particles<=2048);
  assert.equal(data.particleKind.length,particles);assert.equal(data.particleSeed.length,particles);
  assert([...data.seed,...data.particleSeed].every(seed=>seed>=0&&seed<1));
  assert([...data.kind].every(kind=>Number.isInteger(kind)&&kind>=0&&kind<=6));
  for(let bar=0;bar<data.bars;bar++){
    const m=data.matrices.subarray(bar*16,(bar+1)*16);
    for(const offset of [0,4,8])assert(Math.hypot(m[offset],m[offset+1],m[offset+2])>0,`bar${bar} scale${offset}`);
    assert(near(m[15],1));
  }
});

check('Guide, offering stone, carved light, and rite-only mark have separate geometry roles',()=>{
  const kinds=new Set(data.kind);
  for(const kind of [0,1,2,3,4,5,6])assert(kinds.has(kind),`Missing geometry role ${kind}`);
  assert([...data.station].every(station=>Number.isInteger(station)&&station>=-1&&station<6));
});

check('Room and mote seeds repeat exactly without collapsing to one pattern',()=>{
  const seeds=new Set();
  for(let index=0;index<128;index++){const seed=dojoSeed(index);assert(Number.isFinite(seed)&&seed>=0&&seed<1);seeds.add(seed);}
  assert(seeds.size>96);
  const other=buildDojoData();
  for(const name of ['matrices','kind','seed','station','particlePositions','particleKind','particleSeed'])assert.deepEqual([...data[name]],[...other[name]],name);
});

async function filesAt(path){
  const entries=await readdir(path,{withFileTypes:true});
  return (await Promise.all(entries.map(entry=>entry.isDirectory()?filesAt(join(path,entry.name)):[join(path,entry.name)]))).flat();
}
const renderer=(await filesAt(resolve('src/systems/dojo'))).filter(path=>/\.(?:ts|tsx)$/.test(path));
const visuals=await Promise.all([resolve('src/components/DojoScene.tsx'),resolve('src/app/dojo.css'),...renderer].map(async path=>({path:relative(process.cwd(),path),text:await readFile(path,'utf8')})));
check('Dojo visuals inherit the shared clock, closed palette, and persistent global grade',()=>{
  for(const source of visuals){
    assert(!/\b(?:requestAnimationFrame|setInterval|setTimeout)\s*\(|gsap\.(?:ticker|timeline)|new\s+Clock\s*\(/.test(source.text),`${source.path}: no independent visual clock`);
    assert(!/<(?:Canvas|EffectComposer)\b|\bnew\s+EffectComposer\b/.test(source.text),`${source.path}: no local Canvas/composer`);
    assert(!/#[\da-f]{3,8}\b/i.test(source.text),`${source.path}: no raw color literal`);
    assert(!/PALETTE\.enemy\b|var\(--enemy\)|\buEnemy\b/.test(source.text),`${source.path}: enemy blue is not a Dojo color`);
    assert(!/@keyframes\b/.test(source.text),`${source.path}: no CSS animation clock`);
    assert(!/<Sword\b/.test(source.text),`${source.path}: no full sword outside D01 moments`);
  }
});

const director=await readFile(resolve('src/core/dojo-director.ts'),'utf8');
check('Dojo controller owns no separate ticker and accepts no extra sword or shing moment',()=>{
  assert(!/\b(?:requestAnimationFrame|setInterval|setTimeout)\s*\(|gsap\.ticker\.|new\s+Clock\s*\(/.test(director));
  assert(!/\brecordSword\s*\(|\.emit\(['"]shing['"]\)/.test(director));
});

const engine=await readFile(resolve('src/core/engine.ts'),'utf8');
check('The engine supplies measured intent age and the centralized travel policy',()=>{
  assert(/elapsedSinceInput\s*:\s*logicalTime\s*-\s*lastScrollAt/.test(engine),'Runtime travel cannot silently use the zero-age helper default');
  assert(/freshTravel\([\s\S]*?\}\s*,\s*TIMING\.travel\s*\)/.test(engine),'Runtime travel must consume the centralized policy');
  assert(/lastScrollAt\s*=\s*logicalTime/.test(engine),'Scroll intent records its shared-clock time');
});

const result={
  checkedAt:new Date().toISOString(),checks,allPassed:checks.every(check=>check.passed),
  geometry:{bars:data.bars,scrolls:DOJO_SCROLLS.length,particles:data.particlePositions.length/3,kinds:[...new Set(data.kind)].sort()},
  movementBounds:DOJO_BOUNDS,
  limitations:[
    'Pure helper/source checks do not prove native pointer-lock permission, real input/capture, gyro permission or neutral calibration, native scrolling/content-end travel, exactly-once ritual lifecycle, or emotional quality.',
    'CPU geometry/seed checks do not prove GPU shader compilation, six visually distinct CRT presentations, contextual crimson placement, guide/lantern appearance, resource disposal, or physical GPU presented FPS.',
    'Approved Merge constants are not observed playback timing/audio silence; one-clock source checks are not native callback ownership measurements.',
    'The six scrolls are authored shader studies while real member media and permissions remain absent. No membership, payment, Git push, or website deployment is inferred.'
  ]
};
await mkdir(resolve('docs/dojo-v7'),{recursive:true});
await writeFile(resolve('docs/dojo-v7/geometry-checks.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if(!result.allPassed)process.exitCode=1;
