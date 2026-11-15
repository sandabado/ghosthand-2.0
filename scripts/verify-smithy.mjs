import assert from 'node:assert/strict';
import { mkdir,readFile,readdir,writeFile } from 'node:fs/promises';
import { join,relative,resolve } from 'node:path';
import { OATH_GREETINGS,validCommissionRelic,commissionSealIntent,oathGreetingFrame } from '../src/core/smithy.ts';
import { strokeComplete } from '../src/core/cut.ts';
import { TIMING,SCENES } from '../src/core/config.ts';
import { travelReady,travelDestination,freshTravel } from '../src/core/travel.ts';
import { smithySeed,SMITHY_PAPERS,buildSmithyData,buildSwordProfile } from '../src/systems/smithy/geometry.ts';

// Pure behavior and source attestations. Native input, GPU, visual, and device evidence is separate.
const checks=[];
function check(name,run){
  try{run();checks.push({name,passed:true});}
  catch(error){checks.push({name,passed:false,error:error instanceof Error?error.message:String(error)});}
}
const near=(a,b,epsilon=1e-8)=>Math.abs(a-b)<=epsilon;
const policy=TIMING.oath;
const count=OATH_GREETINGS.length;
const cycleLength=count*policy.word+policy.rest;
const unit=value=>Number.isFinite(value)&&value>=0&&value<=1;
const sameFrame=(a,b)=>a.index===b.index&&a.cycle===b.cycle&&near(a.word,b.word)&&near(a.hand,b.hand);

check('Exactly three finite integral catalogue identities are accepted',()=>{
  for(const index of [0,1,2])assert.equal(validCommissionRelic(index),true);
  for(const index of [-1,3,30,.5,NaN,Infinity,-Infinity,'0',null,undefined])assert.equal(validCommissionRelic(index),false);
});

check('Commission seals accept only a fresh idle rite in the Commission scene',()=>{
  for(const scene of Object.keys(SCENES))for(const sealed of [false,true])for(const phase of ['idle','pressing','sealed'])for(let index=0;index<3;index++){
    assert.equal(commissionSealIntent(scene,sealed,phase,index),scene==='COMMISSION'&&!sealed&&phase==='idle',`${scene}/${sealed}/${phase}/${index}`);
  }
  for(const index of [-1,3,.4,NaN,Infinity,-Infinity])assert.equal(commissionSealIntent('COMMISSION',false,'idle',index),false);
  assert.equal(commissionSealIntent('COMMISSION',false,'unknown',0),false);
});

check('The seal requires forty finite net pixels rather than a click or longest excursion',()=>{
  assert.equal(TIMING.strokePixels,40);
  for(const distance of [0,1,20,39.999,-1,-40,NaN,Infinity,-Infinity])assert.equal(strokeComplete(distance),false);
  for(const distance of [40,40.001,70,200])assert.equal(strokeComplete(distance),true);
  assert.equal(strokeComplete(Math.hypot(3,4)),false,'A long excursion returned to five net pixels is not commitment');
});

check('Commission scroll exit is independent of its seal, phase, and viewed relic',()=>{
  assert.equal(SCENES.COMMISSION.verb,'PASS');
  for(const commissionSeal of [false,true])for(const commissionPhase of ['idle','pressing','sealed'])for(let selectedRelic=0;selectedRelic<3;selectedRelic++){
    const state={scene:'COMMISSION',thresholdReady:true,drainSettled:true,completedGates:[1,2,3,4],commissionSeal,commissionPhase,selectedRelic};
    assert.equal(travelReady(state),true);assert.equal(travelDestination(state),'OATH');
  }
});

check('Oath remains terminal even with completed work and a fresh downward scroll',()=>{
  for(const dojoSeal of [false,true])for(const commissionSeal of [false,true]){
    const state={scene:'OATH',thresholdReady:true,drainSettled:true,completedGates:[1,2,3,4],dojoSeal,commissionSeal};
    assert.equal(travelReady(state),false);assert.equal(travelDestination(state),null);
    assert.equal(freshTravel({ready:travelReady(state),progress:1,atContentEnd:true,burst:5,readyBurst:4,serial:9,consumedSerial:8,direction:1,elapsedSinceEntry:2,elapsedSinceInput:0},TIMING.travel),false);
  }
});

check('The exact approved Merge timing contract remains unchanged',()=>{
  assert.deepEqual(TIMING.merge,{summon:.4,handStart:1.6,handDuration:2.2,swordStart:3.8,swordDuration:3,flashStart:6.9,flashDuration:.5,cutStart:7,cutDuration:.35,silenceStart:7,silenceEnd:8,fork:8});
  assert.equal(TIMING.merge.silenceEnd-TIMING.merge.silenceStart,1);
});

check('Four distinct greetings retain nonempty text and explicit language metadata',()=>{
  assert.equal(count,4);assert.equal(new Set(OATH_GREETINGS.map(greeting=>greeting.text)).size,4);
  assert.deepEqual(OATH_GREETINGS.map(greeting=>greeting.lang),['en','ja','es','de']);
  for(const greeting of OATH_GREETINGS)assert(greeting.text.trim().length>0);
});

check('Invalid or negative Oath time returns a finite entry state',()=>{
  const start=oathGreetingFrame(0,policy);
  assert.deepEqual(start,{index:0,word:0,hand:1,cycle:0});
  for(const elapsed of [-100,-1,-Number.EPSILON,NaN,Infinity,-Infinity,'5',null,undefined])assert(sameFrame(oathGreetingFrame(elapsed,policy),start));
});

check('Every greeting fades in, rests legibly, and dissolves to the hand on its local segment',()=>{
  for(let index=0;index<count;index++){
    const start=index*policy.word;
    const entry=oathGreetingFrame(start,policy),middle=oathGreetingFrame(start+policy.word/2,policy);
    assert.equal(entry.index,index);assert(near(entry.word,0));assert(near(entry.hand,1));
    assert.equal(middle.index,index);assert(near(middle.word,1));assert(near(middle.hand,0));
    const incoming=oathGreetingFrame(start+policy.fade/2,policy);
    const outgoing=oathGreetingFrame(start+policy.word-policy.fade/2,policy);
    assert(incoming.word>0&&incoming.word<1);assert(near(incoming.word,outgoing.word));
    assert(near(incoming.word+incoming.hand,1));assert(near(outgoing.word+outgoing.hand,1));
  }
});

check('The quiet hand-only interval lasts until the exact cycle wrap',()=>{
  const handStart=count*policy.word;
  for(const elapsed of [handStart,handStart+policy.rest/2,cycleLength-1e-6]){
    const frame=oathGreetingFrame(elapsed,policy);assert.equal(frame.index,count);assert.equal(frame.word,0);assert.equal(frame.hand,1);assert.equal(frame.cycle,0);
  }
  assert.deepEqual(oathGreetingFrame(cycleLength,policy),{index:0,word:0,hand:1,cycle:1});
  assert.deepEqual(oathGreetingFrame(cycleLength*3,policy),{index:0,word:0,hand:1,cycle:3});
});

check('Greeting output stays bounded and complementary across multiple cycles',()=>{
  for(let step=0;step<=5000;step++){
    const frame=oathGreetingFrame(step*cycleLength/997,policy);
    assert(Number.isInteger(frame.index)&&frame.index>=0&&frame.index<=count);
    assert(Number.isInteger(frame.cycle)&&frame.cycle>=0);assert(unit(frame.word)&&unit(frame.hand));
    assert(near(frame.word+frame.hand,1));
  }
});

check('Greeting phase depends on elapsed local time rather than frame partition',()=>{
  const elapsed=7.135;
  let accumulated=0;for(let frame=0;frame<120;frame++)accumulated+=elapsed/120;
  assert(sameFrame(oathGreetingFrame(elapsed,policy),oathGreetingFrame(accumulated,policy)));
  const direct=oathGreetingFrame(.725,policy),later=oathGreetingFrame(.725+cycleLength*4,policy);
  assert.equal(direct.index,later.index);assert(near(direct.word,later.word));assert(near(direct.hand,later.hand));assert.equal(later.cycle,direct.cycle+4);
});

check('The injected Oath policy governs pacing and invalid policies fall back safely',()=>{
  const custom={word:1.25,fade:.2,rest:2.4},duration=count*custom.word+custom.rest;
  assert.equal(oathGreetingFrame(custom.word+custom.word/2,custom).index,1);
  assert(near(oathGreetingFrame(custom.word+custom.word/2,custom).word,1));
  assert.deepEqual(oathGreetingFrame(duration,custom),{index:0,word:0,hand:1,cycle:1});
  for(const malformed of [{word:0,fade:.2,rest:1},{word:-1,fade:.2,rest:1},{word:2.4,fade:0,rest:1},{word:2.4,fade:-.1,rest:1},{word:2.4,fade:.45,rest:-1},{word:NaN,fade:.45,rest:5.4},{word:2.4,fade:Infinity,rest:5.4},{word:2.4,fade:.45,rest:NaN}]){
    assert(sameFrame(oathGreetingFrame(.8,malformed),oathGreetingFrame(.8)));
  }
  const short={word:.3,fade:2,rest:0};
  for(let i=0;i<80;i++){const frame=oathGreetingFrame(i*.037,short);assert(unit(frame.word)&&unit(frame.hand));assert(near(frame.word+frame.hand,1));}
});

const scenes=['COMMISSION','OATH'];
const data=Object.fromEntries(scenes.map(scene=>[scene,buildSmithyData(scene)]));
check('Scene structure and local particle attributes are finite and internally consistent',()=>{
  for(const scene of scenes){
    const item=data[scene];assert(Number.isInteger(item.bars)&&item.bars>0&&item.bars<2000);assert.equal(item.matrices.length,item.bars*16);
    for(const name of ['kind','seed','station'])assert.equal(item[name].length,item.bars);
    assert.equal(item.particlePositions.length,item.particleSeed.length*3);assert.equal(item.particleTargets.length,item.particlePositions.length);assert.equal(item.particleKind.length,item.particleSeed.length);
    assert(item.particleSeed.length>0&&item.particleSeed.length<2000);
    for(const name of ['matrices','kind','seed','station','particlePositions','particleTargets','particleKind','particleSeed'])assert(Array.from(item[name]).every(Number.isFinite),`${scene}/${name}`);
    for(let index=0;index<item.bars;index++){
      const m=item.matrices.subarray(index*16,index*16+16);
      for(const offset of [0,4,8])assert(Math.hypot(m[offset],m[offset+1],m[offset+2])>0,`${scene} degenerate basis ${index}/${offset}`);
      assert(near(m[15],1));
    }
  }
});

check('Commission owns the three paper sheets and ritual motes; Oath owns only ambient and hand-gather motes',()=>{
  assert.equal(SMITHY_PAPERS.length,3);assert.equal(data.COMMISSION.paperSheets,3);assert.equal(data.OATH.paperSheets,0);
  assert(Array.from(data.COMMISSION.particleKind).some(kind=>kind===1));
  assert(Array.from(data.OATH.particleKind).every(kind=>kind===0||kind===2));
  assert(Array.from(data.OATH.particleKind).some(kind=>kind===2));
});

check('Authored scene data and seeds are deterministic and independent per scene',()=>{
  for(let index=0;index<100;index++){assert(unit(smithySeed(index)));assert.equal(smithySeed(index),smithySeed(index));}
  assert(new Set(Array.from({length:64},(_,index)=>smithySeed(index))).size>50);
  for(const scene of scenes){
    const again=buildSmithyData(scene);
    for(const name of ['matrices','kind','seed','station','particlePositions','particleTargets','particleKind','particleSeed'])assert.deepEqual(again[name],data[scene][name],`${scene}/${name}`);
  }
  assert.notDeepEqual(data.COMMISSION.matrices,data.OATH.matrices);
});

const profiles=[buildSwordProfile(false),buildSwordProfile(true)];
check('Handover and scabbard profiles are finite indexed surfaces with explicit sheath identity',()=>{
  for(let index=0;index<profiles.length;index++){
    const profile=profiles[index];assert.equal(profile.sheathed,Boolean(index));assert.equal(profile.closed,true);
    assert(profile.positions.length>0&&profile.positions.length%3===0);assert.equal(profile.uv.length,profile.positions.length/3*2);
    assert(profile.indices.length>0&&profile.indices.length%3===0);
    assert(Array.from(profile.positions).every(Number.isFinite));assert(Array.from(profile.uv).every(Number.isFinite));
    for(const vertex of profile.indices)assert(Number.isInteger(vertex)&&vertex>=0&&vertex<profile.positions.length/3);
  }
  assert.notDeepEqual(profiles[0].positions,profiles[1].positions,'The sheath has its own closed exterior rather than a renamed exposed blade');
});

check('Both sword exteriors are closed consistently wound manifold surfaces without degenerate faces',()=>{
  for(const profile of profiles){
    const edges=new Map(),used=new Set();
    for(let at=0;at<profile.indices.length;at+=3){
      const triangle=Array.from(profile.indices.subarray(at,at+3));
      const points=triangle.map(index=>Array.from(profile.positions.subarray(index*3,index*3+3)));
      const ab=points[1].map((value,index)=>value-points[0][index]),ac=points[2].map((value,index)=>value-points[0][index]);
      const cross=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
      assert(Math.hypot(...cross)>1e-12,'A surface face must have nonzero area');
      for(let side=0;side<3;side++){
        const a=triangle[side],b=triangle[(side+1)%3],key=a<b?`${a}/${b}`:`${b}/${a}`;
        used.add(a);const edge=edges.get(key)??{count:0,orientation:0};edge.count++;edge.orientation+=a<b?1:-1;edges.set(key,edge);
      }
    }
    for(const edge of edges.values()){assert.equal(edge.count,2,'Every edge belongs to two faces');assert.equal(edge.orientation,0,'Adjacent faces have opposing edge orientation');}
    assert.equal(used.size,profile.positions.length/3,'All authored vertices participate in the surface');
    assert.equal(used.size-edges.size+profile.indices.length/3,2,'The capped exterior is one genus-zero closed surface');
  }
});

async function sourceFiles(directory){
  const rows=[];
  for(const item of await readdir(directory,{withFileTypes:true})){
    const path=join(directory,item.name);
    if(item.isDirectory())rows.push(...await sourceFiles(path));
    else if(/\.(?:tsx?|css)$/.test(item.name))rows.push({path:relative(resolve('.'),path),text:await readFile(path,'utf8')});
  }
  return rows;
}
const sources=[...await sourceFiles(resolve('src/systems/smithy')),
  {path:'src/components/SmithyScenes.tsx',text:await readFile(resolve('src/components/SmithyScenes.tsx'),'utf8')},
  {path:'src/app/smithy.css',text:await readFile(resolve('src/app/smithy.css'),'utf8')}];
check('New scene code owns no application clock, composer, canvas, or enemy palette',()=>{
  for(const source of sources){
    assert(!/\b(?:requestAnimationFrame|setInterval|setTimeout)\s*\(|gsap\.ticker\.|new\s+Clock\s*\(/.test(source.text),`${source.path}: independent clock`);
    assert(!/<(?:Canvas|EffectComposer)\b/.test(source.text),`${source.path}: duplicate render pipeline`);
    assert(!/PALETTE\.enemy\b|var\(--enemy\)|\buEnemy\b/.test(source.text),`${source.path}: enemy blue is outside these scenes`);
    assert(!/@keyframes\b/.test(source.text),`${source.path}: independent CSS animation`);
  }
});

const director=await readFile(resolve('src/core/smithy-director.ts'),'utf8');
check('The local scene controller owns no ticker or extra sword/shing allowance',()=>{
  assert(!/\b(?:requestAnimationFrame|setInterval|setTimeout)\s*\(|gsap\.ticker\.|new\s+Clock\s*\(/.test(director));
  assert(!/\brecordSword\s*\(|\.emit\(['"]shing['"]\)/.test(director));
  assert(/oathTime\s*:\s*0/.test(director),'Oath entry resets its local elapsed time');
  assert(/oathGreetingFrame\(p\.oathTime\s*,\s*TIMING\.oath\)/.test(director),'Runtime greeting consumes its centralized policy');
});

const result={checkedAt:new Date().toISOString(),checks,allPassed:checks.every(check=>check.passed),
  geometry:Object.fromEntries(scenes.map(scene=>[scene,{bars:data[scene].bars,paperSheets:data[scene].paperSheets,particles:data[scene].particleSeed.length,kinds:[...new Set(data[scene].kind)].sort()}])),
  swordProfiles:profiles.map(profile=>({sheathed:profile.sheathed,closed:profile.closed,vertices:profile.positions.length/3,triangles:profile.indices.length/3})),
  oathPolicy:{word:policy.word,fade:policy.fade,rest:policy.rest,cycle:cycleLength,greetings:count},
  limitations:[
    'Pure helper/source checks do not establish real pointer/touch capture, exactly-once scene lifecycle, immutable displayed seal identity, native scrolling, visual quality, or commercial authority.',
    'Finite CPU scene/profile data does not establish GPU shader compilation, hilt-first framing, actual visible full sheathing, contextual crimson placement, resource disposal, or physical-device GPU presented FPS.',
    'Approved Merge constants and no-clock declarations are not observed playback/audio timing or native callback ownership; those require separate browser evidence.',
    'Catalogue content remains fixture material. No quote, order, payment, membership, source push, or public website deployment is inferred.'
  ]};
await mkdir(resolve('docs/smithy-v8'),{recursive:true});
await writeFile(resolve('docs/smithy-v8/geometry-checks.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if(!result.allPassed)process.exitCode=1;
