import assert from 'node:assert/strict';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createBrushGeometry,createTipGeometry } from '../src/systems/ink/geometry.ts';

// Node 26 strips the geometry module's TypeScript. SVG DOM parsing is verified in the browser.
const checks=[];
function check(name,fn){fn();checks.push({name,passed:true});}
function finiteGeometry(geometry){
  for(const [name,attribute] of Object.entries(geometry.attributes)){
    assert(attribute.count>=0,`${name}: valid count`);
    assert([...attribute.array].every(Number.isFinite),`${name}: all values finite`);
  }
  if(geometry.index){
    const count=geometry.getAttribute('position').count;
    assert([...geometry.index.array].every(index=>Number.isInteger(index)&&index>=0&&index<count),'Indices address existing vertices');
  }
}
const path=[[-1.2,-1,0],[-0.6,-0.4,0],[-0.2,0.25,0],[0.5,0.8,0],[1.3,1.2,0]];
const options={width:0.25,pressure:0.9,seed:0.37,start:0.2,span:0.5};
const geometry=createBrushGeometry(path,options);
try{
  check('Ribbon attributes and topology are finite',()=>{
    finiteGeometry(geometry);
    const count=geometry.getAttribute('position').count;
    assert(count>=4&&count%2===0,'Two ribbon sides per center sample');
    assert.equal(geometry.index.count,(count/2-1)*6,'Two triangles per segment');
    for(const name of ['uv','aAlong','aPressure','aSeed'])assert.equal(geometry.getAttribute(name).count,count,`${name} count`);
  });
  check('Reveal bounds and paired coordinates are stable',()=>{
    const along=geometry.getAttribute('aAlong');
    assert(Math.abs(along.getX(0)-options.start)<1e-5,'Reveal begins at supplied start');
    assert(Math.abs(along.getX(along.count-1)-(options.start+options.span))<1e-5,'Reveal ends at supplied range end');
    for(let i=0;i<along.count;i+=2){
      assert(Math.abs(along.getX(i)-along.getX(i+1))<1e-7,'Both sides reveal together');
      if(i>0)assert(along.getX(i)>=along.getX(i-2),'Reveal progresses monotonically');
    }
  });
  check('Pressure varies and ends are tapered',()=>{
    const pressure=geometry.getAttribute('aPressure');
    const values=[...pressure.array];
    const low=Math.min(...values),high=Math.max(...values);
    assert(low>0&&high-low>0.02,'Positive nonconstant stroke pressure');
    assert(pressure.getX(0)<high*0.8&&pressure.getX(pressure.count-1)<high*0.8,'Both stroke ends taper');
  });
  check('Width is a geometric footprint rather than line width',()=>{
    const wider=createBrushGeometry(path,{...options,width:options.width*2});
    try{
      const a=geometry.getAttribute('position'),b=wider.getAttribute('position');
      const i=Math.floor(a.count/4)*2;
      const width=attribute=>Math.hypot(attribute.getX(i+1)-attribute.getX(i),attribute.getY(i+1)-attribute.getY(i),attribute.getZ(i+1)-attribute.getZ(i));
      assert(width(a)>0,'Ribbon has nonzero width');
      assert(Math.abs(width(b)/width(a)-2)<1e-4,'Doubling width doubles ribbon width');
    }finally{wider.dispose();}
  });
  check('Identical inputs produce deterministic geometry',()=>{
    const repeated=createBrushGeometry(path,options);
    try{for(const name of ['position','uv','aAlong','aPressure','aSeed'])assert.deepEqual([...geometry.getAttribute(name).array],[...repeated.getAttribute(name).array],name);}finally{repeated.dispose();}
  });
  check('Reversed and repeated-point paths stay finite',()=>{
    for(const points of [[...path].reverse(),[path[0],path[0],path[1],path[2],path[2],path[3],path[4]]]){
      const candidate=createBrushGeometry(points,options);
      try{finiteGeometry(candidate);}finally{candidate.dispose();}
    }
  });
  check('Degenerate input rejects or returns safe empty geometry',()=>{
    for(const points of [[],[[0,0,0]],[[0,0,0],[0,0,0]],[[NaN,0,0],[1,1,0]]]){
      let candidate;
      try{candidate=createBrushGeometry(points,options);}catch(error){assert(error instanceof Error);continue;}
      try{finiteGeometry(candidate);}finally{candidate.dispose();}
    }
  });
  check('Tip particles expose finite reveal and seed attributes',()=>{
    const tips=createTipGeometry(path,options);
    try{
      finiteGeometry(tips);
      const count=tips.getAttribute('position').count;
      assert(count>0&&count<=4096,'Bounded nonempty particle fixture');
      assert.equal(tips.getAttribute('aAlong').count,count);
      assert.equal(tips.getAttribute('aSeed').count,count);
      assert([...tips.getAttribute('aSeed').array].every(seed=>seed>=0&&seed<1),'Particle seeds are normalized');
    }finally{tips.dispose();}
  });
}finally{geometry.dispose();}

const renderer=await readFile(resolve('src/systems/InkStroke.tsx'),'utf8');
const shaders=await readFile(resolve('src/systems/ink/shaders.ts'),'utf8');
for(const text of [renderer,shaders])assert(!/\b(?:requestAnimationFrame|setInterval|setTimeout)\s*\(|gsap\.(?:ticker|timeline)|new\s+Clock\s*\(/.test(text),'Ink consumes shared clock only');
assert(!/EffectComposer|\b(?:Bloom|Vignette|ChromaticAberration)\s*[<(]/.test(renderer),'Ink does not add grade effects');
checks.push({name:'Ink renderer consumes the shared clock and grade',passed:true});
const result={checkedAt:new Date().toISOString(),checks,limitations:['SVG XML/viewBox conversion requires browser DOMParser and is not exercised by this Node geometry check.','Shader appearance, GPU compilation, playback timing, resource lifecycle, and device FPS require separate browser evidence.']};
await mkdir(resolve('docs/ink-v3'),{recursive:true});
await writeFile(resolve('docs/ink-v3/geometry-checks.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
