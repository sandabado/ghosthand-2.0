import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { TIMING } from '../src/core/config.ts';
import { strokeComplete, stepForkSpring } from '../src/core/cut.ts';
import { travelReady, travelDestination, freshTravel } from '../src/core/travel.ts';
import { buildCutData, cutSeed } from '../src/systems/cut/geometry.ts';

// Deterministic contracts and source ownership, not GPU or native-input proof.
const checks=[];
function check(name,fn){fn();checks.push({name,passed:true});}
const near=(a,b,epsilon=1e-8)=>Math.abs(a-b)<=epsilon;
const scenes=['PURSUIT','MERGE','FORK','CHAINS_HOLD'];

check('Fork stroke requires forty finite pixels rather than a click or short drag',()=>{
  for(const distance of [0,1,20,39.999,-1,-40,NaN,Infinity,-Infinity])assert.equal(strokeComplete(distance),false);
  for(const distance of [40,40.001,56,120,500])assert.equal(strokeComplete(distance),true);
});

check('Fork spring preserves equilibrium, finite output, and zero-time state',()=>{
  for(const target of [-1,0,1]){
    for(const dt of [0,1/120,1/60,.05,.5]){
      const next=stepForkSpring(target,0,target,dt);
      assert(Number.isFinite(next.position)&&Number.isFinite(next.velocity));
      assert(near(next.position,target)&&near(next.velocity,0));
    }
  }
  const still=stepForkSpring(.35,-.2,.8,0);
  assert(near(still.position,.35)&&near(still.velocity,-.2),'A zero-time update must not move the hinge');
  for(const input of [[NaN,0,0,.02],[0,Infinity,0,.02],[0,0,NaN,.02],[0,0,0,Infinity]]){
    const next=stepForkSpring(...input);
    assert(Number.isFinite(next.position)&&Number.isFinite(next.velocity),'Invalid input cannot poison shared params');
  }
});

check('Fork spring is damped, bounded, and converges across representative frame cadences',()=>{
  for(const dt of [1/120,1/60,.05,.5]){
    for(const direction of [-1,1]){
      const target=direction;
      let state={position:-direction,velocity:0},energy=4,maxPosition=0;
      const steps=Math.ceil(6/Math.min(dt,.05));
      for(let i=0;i<steps;i++){
        state=stepForkSpring(state.position,state.velocity,target,dt);
        assert(Number.isFinite(state.position)&&Number.isFinite(state.velocity));
        const nextEnergy=(state.position-target)**2+(state.velocity/14)**2;
        assert(nextEnergy<=energy+1e-7,'A fixed-target damped hinge cannot gain mechanical energy');
        energy=nextEnergy;maxPosition=Math.max(maxPosition,Math.abs(state.position));
      }
      assert(maxPosition<1.25,'The cursor hinge stays within a restrained physical envelope');
      assert(Math.abs(state.position-target)<1e-5&&Math.abs(state.velocity)<1e-5,'The half settles rather than drifting');
    }
  }
});

check('Fork spring clamps extreme targets and frame gaps without changing ordinary cadence',()=>{
  for(const target of [-100,100]){
    const actual=stepForkSpring(.1,.3,target,.02),bounded=stepForkSpring(.1,.3,Math.sign(target),.02);
    assert(near(actual.position,bounded.position)&&near(actual.velocity,bounded.velocity));
  }
  const one=stepForkSpring(.2,-.1,.8,1/60);
  const half=stepForkSpring(.2,-.1,.8,1/120);
  const two=stepForkSpring(half.position,half.velocity,.8,1/120);
  assert(near(one.position,two.position)&&near(one.velocity,two.velocity),'Exact spring outcome is independent of a normal frame split');
  const gap=stepForkSpring(.2,-.1,.8,1),capped=stepForkSpring(.2,-.1,.8,.05);
  assert(near(gap.position,capped.position)&&near(gap.velocity,capped.velocity),'A large visible gap cannot throw the hinge');
});

const initial={scene:'THRESHOLD',thresholdReady:false,drainSettled:false,completedGates:[],forkChoice:null};
// Story-flow-v2: approved scroll-first main journey supersedes the V6 practice gates.
// Earlier results remain preserved under docs/user-pass/inherited-checks/.
check('Story-flow-v2 holds the opening and timed ceremonies while practice remains optional',()=>{
  assert.equal(travelReady(initial),false);
  assert.equal(travelReady({...initial,thresholdReady:true}),true);
  assert.equal(travelReady({...initial,scene:'LEGEND'}),true);
  assert.equal(travelReady({...initial,scene:'DRAIN'}),true);
  assert.equal(travelReady({...initial,scene:'DRAIN',drainSettled:true}),true);
  for(let gate=1;gate<=4;gate++){
    const state={...initial,scene:`CRAFT_F${gate}`};
    assert.equal(travelReady(state),true);
    assert.equal(travelReady({...state,completedGates:[gate]}),true);
    assert.equal(travelReady({...state,completedGates:[gate%4+1]}),true,'Optional completion cannot block reading');
  }
  for(const scene of ['PURSUIT','MERGE','OATH'])assert.equal(travelReady({...initial,scene,thresholdReady:true,drainSettled:true,completedGates:[1,2,3,4]}),false);
  assert.equal(travelReady({...initial,scene:'FORK'}),true,'The optional choice can be passed by scrolling');
  for(const forkChoice of ['DOJO','CHAINS_HOLD'])assert.equal(travelReady({...initial,scene:'FORK',forkChoice}),false,'A committed collapse retains its own route');
  for(const scene of ['DOJO','COMMISSION','CHAINS_HOLD'])assert.equal(travelReady({...initial,scene}),true);
});

check('Story-flow-v2 shows work before practice and keeps optional branch returns',()=>{
  const ready={...initial,thresholdReady:true,drainSettled:true,completedGates:[1,2,3,4]};
  const route={THRESHOLD:'LEGEND',LEGEND:'DOJO',DOJO:'DRAIN',DRAIN:'CRAFT_F1',CRAFT_F1:'CRAFT_F2',CRAFT_F2:'CRAFT_F3',CRAFT_F3:'CRAFT_F4',CRAFT_F4:'PURSUIT',COMMISSION:'OATH',CHAINS_HOLD:'FORK',FORK:'COMMISSION'};
  for(const [scene,destination] of Object.entries(route))assert.equal(travelDestination({...ready,scene}),destination);
  for(const scene of ['PURSUIT','MERGE','OATH'])assert.equal(travelDestination({...ready,scene}),null,'Scroll must not bypass a timed rite or the ending');
  for(const forkChoice of ['DOJO','CHAINS_HOLD'])assert.equal(travelDestination({...ready,scene:'FORK',forkChoice}),null,'Scroll must not override a committed choice');
  assert.equal(travelDestination(initial),null);
  assert.equal(travelDestination({...initial,scene:'DRAIN'}),'CRAFT_F1');
  for(let gate=1;gate<=4;gate++)assert.equal(travelDestination({...initial,scene:`CRAFT_F${gate}`}),gate===4?'PURSUIT':`CRAFT_F${gate+1}`);
  assert.equal(travelDestination({...initial,scene:'CRAFT_F4',pursuitUsed:true}),'COMMISSION','A return to work cannot stall at a spent pursuit');
});

check('Fresh travel requires finished content, readiness, a new downward burst, and settled entry',()=>{
  const good={ready:true,progress:1,atContentEnd:true,burst:5,readyBurst:4,serial:9,consumedSerial:8,direction:1,elapsedSinceEntry:1};
  assert.equal(freshTravel(good),true);
  for(const patch of [{ready:false},{progress:.994},{atContentEnd:false},{burst:4},{burst:3},{serial:8},{serial:7},{direction:0},{direction:-1},{elapsedSinceEntry:.599}]){
    assert.equal(freshTravel({...good,...patch}),false,JSON.stringify(patch));
  }
  assert.equal(freshTravel({...good,progress:.995,elapsedSinceEntry:.6}),true);
  assert.equal(freshTravel({...good,progress:NaN}),false);
});

check('Approved Merge markers retain flash/cut overlap, complete silence, and the eight-second contact handoff',()=>{
  const expected={summon:.4,handStart:1.6,handDuration:2.2,swordStart:3.8,swordDuration:3,flashStart:6.9,flashDuration:.5,cutStart:7,cutDuration:.35,silenceStart:7,silenceEnd:8,fork:8};
  assert.deepEqual(TIMING.merge,expected);
  assert(TIMING.merge.flashStart<TIMING.merge.cutStart);
  assert(TIMING.merge.flashStart+TIMING.merge.flashDuration>TIMING.merge.cutStart+TIMING.merge.cutDuration);
  assert.equal(TIMING.merge.silenceEnd-TIMING.merge.silenceStart,1);
  assert.equal(TIMING.pursuit,2);
});

const geometryCounts=[];
check('Cut fields use finite non-collapsed affine instances and bounded particle attributes',()=>{
  for(const [index,scene] of scenes.entries()){
    const data=buildCutData(scene);
    assert.equal(data.scene,scene);assert.equal(data.mode,index+1);
    assert(Number.isInteger(data.bars)&&data.bars>0&&data.bars<=256);
    assert.equal(data.matrices.length,data.bars*16);
    for(const key of ['kind','side','along','seed'])assert.equal(data[key].length,data.bars,key);
    for(const key of ['matrices','kind','side','along','seed','particlePositions','particleKind','particleSide','particleSeed'])assert([...data[key]].every(Number.isFinite),key);
    assert([...data.kind].every(x=>Number.isInteger(x)&&x>=0&&x<=5));
    assert([...data.side].every(x=>[-1,0,1].includes(x)));
    for(const key of ['along','seed'])assert([...data[key]].every(x=>x>=0&&x<=1),key);
    for(let i=0;i<data.bars;i++){
      const m=data.matrices.subarray(i*16,(i+1)*16);
      assert(near(m[3],0)&&near(m[7],0)&&near(m[11],0)&&near(m[15],1));
      const determinant=m[0]*(m[5]*m[10]-m[9]*m[6])-m[4]*(m[1]*m[10]-m[9]*m[2])+m[8]*(m[1]*m[6]-m[5]*m[2]);
      assert(Math.abs(determinant)>1e-12,'A blade/bar segment must not collapse to zero scale');
    }
    const count=data.particlePositions.length/3;
    assert(Number.isInteger(count)&&count>0&&count<=1024);
    for(const key of ['particleKind','particleSide','particleSeed'])assert.equal(data[key].length,count,key);
    assert([...data.particleKind].every(x=>Number.isInteger(x)&&x>=0&&x<=3));
    assert([...data.particleSide].every(x=>[-1,0,1].includes(x)));
    assert([...data.particleSeed].every(x=>x>=0&&x<=1));
    geometryCounts.push({scene,bars:data.bars,particles:count});
  }
});

check('Authored full swords stay in Pursuit/Merge and Fork chains stay on the chains half',()=>{
  for(const scene of scenes){
    const data=buildCutData(scene),swordBars=[...data.kind].filter(x=>x===3||x===4).length;
    assert.equal(swordBars>0,scene==='PURSUIT'||scene==='MERGE');
    if(scene==='FORK'){
      assert(data.kind.some((kind,i)=>kind===1&&data.side[i]===-1),'The sovereign half must exist');
      assert(data.kind.some((kind,i)=>kind===2&&data.side[i]===1),'The chains half must exist');
      assert(data.kind.every((kind,i)=>kind!==2||data.side[i]===1),'Chains cannot spill into the sovereign half');
    }
  }
});

check('Rejected-half collapse seeds cover both half surfaces without crossing their pivot',()=>{
  const data=buildCutData('FORK'),sides=new Set(data.particleSide);
  assert(sides.has(-1)&&sides.has(1));
  for(let i=0;i<data.particleSide.length;i++){
    assert.equal(data.particleKind[i],2);
    assert(data.particlePositions[i*3]*data.particleSide[i]>0,'Each seed begins in its own half');
    assert(Math.abs(data.particlePositions[i*3])<6);
    assert(Math.abs(data.particlePositions[i*3+1])<3.5);
  }
});

check('Cut architecture and collapse fields are deterministic with varied normalized seeds',()=>{
  const seeds=new Set();
  for(let i=0;i<64;i++){const seed=cutSeed(i);assert(Number.isFinite(seed)&&seed>=0&&seed<1);seeds.add(seed);}
  assert(seeds.size>48);
  for(const scene of scenes){
    const a=buildCutData(scene),b=buildCutData(scene);
    for(const key of ['matrices','kind','side','along','seed','particlePositions','particleKind','particleSide','particleSeed'])assert.deepEqual([...a[key]],[...b[key]],key);
  }
});

async function filesAt(path){
  const entries=await readdir(path,{withFileTypes:true});
  return (await Promise.all(entries.map(entry=>entry.isDirectory()?filesAt(join(path,entry.name)):[join(path,entry.name)]))).flat();
}
const renderer=(await filesAt(resolve('src/systems/cut'))).filter(path=>/\.(?:ts|tsx)$/.test(path));
const visualPaths=[resolve('src/components/CutScenes.tsx'),resolve('src/app/cut.css'),...renderer];
const visuals=await Promise.all(visualPaths.map(async path=>({path:relative(process.cwd(),path),text:await readFile(path,'utf8')})));
check('Cut visuals consume the shared heartbeat, palette, and existing global grade',()=>{
  for(const source of visuals){
    assert(!/\b(?:requestAnimationFrame|setInterval|setTimeout)\s*\(|gsap\.(?:ticker|timeline)|new\s+Clock\s*\(/.test(source.text),`${source.path}: no independent visual clock`);
    assert(!/<(?:Canvas|EffectComposer)\b|\bnew\s+EffectComposer\b/.test(source.text),`${source.path}: no scene-owned Canvas/composer`);
    assert(!/#[\da-f]{3,8}\b/i.test(source.text),`${source.path}: no raw palette literal`);
    assert(!/PALETTE\.blood\b|var\(--blood\)/.test(source.text),`${source.path}: cut/choice/holding are not crimson rituals`);
    assert(!/@keyframes\b/.test(source.text),`${source.path}: no CSS animation clock`);
    assert(!/\b(?:float|int|vec[234])\s+active\b/.test(source.text),`${source.path}: prior GLSL reserved-word failure must not recur`);
  }
});

const result={
  checkedAt:new Date().toISOString(),checks,geometryCounts,
  limitations:[
    'Math/source checks do not prove GPU shader compilation, cursor/touch capture, keyboard operation, native scrolling, stage-travel freshness, or visual/emotional quality.',
    'Exactly-once branch commitment, rejected-half appearance, Chains Hold return/reset, resource lifecycle, and contextual palette permissions require browser/source review.',
    'Locked constants are not observed playback timing; actual Merge timing, all-audio silence, contact handoff, and native callback ownership require separate evidence.',
    'No GPU presented FPS, physical phone acceptance, production media provenance, or public deployment is inferred.'
  ]
};
await mkdir(resolve('docs/cut-v6'),{recursive:true});
await writeFile(resolve('docs/cut-v6/geometry-checks.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
