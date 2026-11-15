import assert from 'node:assert/strict';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
import { Box3,BufferAttribute,BufferGeometry,Matrix4,Texture,Vector3 } from 'three';
import { buildSwordProfile } from '../src/systems/smithy/geometry.ts';
import { CEREMONY_SCABBARD,CEREMONY_SWORD,buildCeremonySwordProfile,createCeremonyCollar,createCeremonyGrip,createCeremonyGuard,createCeremonyPommel } from '../src/systems/cut/sword-geometry.ts';
import { restingSwordFrame } from '../src/systems/smithy/sword-framing.ts';

// Runtime TSX uses the bundler's extensionless imports; resolve only that local
// convention while exercising the actual shared material factory in Node.
registerHooks({resolve(specifier,context,nextResolve){
  try{return nextResolve(specifier,context);}catch(error){if(error.code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.')&&!extname(specifier))return nextResolve(specifier+'.ts',context);throw error;}
}});
const {createCeremonyBladeMaterial,createCeremonyFittingsMaterial,createCeremonyGripMaterial}=await import('../src/systems/cut/sword-materials.ts');

const checks=[];
const check=(name,run)=>{try{run();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,error:String(error)});}};
const near=(a,b,tolerance=1e-6)=>Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(a),Math.abs(b));
const blade=buildCeremonySwordProfile(buildSwordProfile(false)),sheath=buildCeremonySwordProfile(buildSwordProfile(true));
const minX=profile=>Math.min(...Array.from(profile.positions).filter((_,at)=>at%3===0));
const maxX=profile=>Math.max(...Array.from(profile.positions).filter((_,at)=>at%3===0));

check('The shared steel profile retains every original blade vertex, UV and triangle at the canonical collar',()=>{
  const source=buildSwordProfile(false);assert.deepEqual(blade.uv,source.uv);assert.deepEqual(blade.indices,source.indices);
  for(let at=0;at<source.positions.length;at++)assert(near(blade.positions[at],source.positions[at]+(at%3===0?.91:0)));
  assert(near(minX(blade),CEREMONY_SWORD.blade.start));assert(near(maxX(blade),CEREMONY_SWORD.blade.tip[0]));
});

check('The closed lacquer sheath follows the same curve and contains every steel vertex with tip clearance',()=>{
  assert.equal(sheath.sheathed,true);assert.equal(sheath.closed,true);
  assert(near(minX(sheath),CEREMONY_SWORD.blade.start));
  assert(near(maxX(sheath)-maxX(blade),CEREMONY_SCABBARD.noseClearance));
  for(let vertex=0;vertex<blade.positions.length/3;vertex++){
    const [x,y,z]=blade.positions.subarray(vertex*3,vertex*3+3);let ring=0;
    while(ring<sheath.rings-2&&sheath.positions[(ring+1)*sheath.sectionSize*3]<x)ring++;
    const left=sheath.positions[ring*sheath.sectionSize*3],right=sheath.positions[(ring+1)*sheath.sectionSize*3];
    const t=Math.max(0,Math.min(1,(x-left)/(right-left))),section=[];
    for(let point=0;point<sheath.sectionSize;point++){
      const a=(ring*sheath.sectionSize+point)*3,b=((ring+1)*sheath.sectionSize+point)*3;
      section.push([sheath.positions[a+1]+(sheath.positions[b+1]-sheath.positions[a+1])*t,sheath.positions[a+2]+(sheath.positions[b+2]-sheath.positions[a+2])*t]);
    }
    let positive=false,negative=false;
    for(let point=0;point<section.length;point++){
      const a=section[point],b=section[(point+1)%section.length],cross=(b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(y-a[0]);
      if(cross>1e-7)positive=true;if(cross<-1e-7)negative=true;
    }
    assert(!(positive&&negative),`Steel vertex ${vertex} escapes the fitted sheath`);
  }
});

const geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(sheath.positions,3));
const parts=[[geometry,0],[createCeremonyGrip(),0],[createCeremonyGuard(),CEREMONY_SWORD.guard.center],[createCeremonyPommel(),CEREMONY_SWORD.pommel.center],[createCeremonyCollar(),(CEREMONY_SWORD.collar.start+CEREMONY_SWORD.collar.end)/2]];
try{
  const bounds=new Box3(),matrix=new Matrix4();
  for(const [part,x] of parts){part.computeBoundingBox();bounds.union(part.boundingBox.clone().applyMatrix4(matrix.makeTranslation(x,0,0)));}
  bounds.applyMatrix4(matrix.makeRotationZ(-.05));
  const span=bounds.max.x-bounds.min.x,centerX=(bounds.max.x+bounds.min.x)/2;
  check('The prominent ending fits the whole physical sword at phone, tablet and desktop widths',()=>{
    for(const [width,height] of [[320,844],[390,844],[430,932],[760,1000],[834,1194],[1280,900],[1440,1000],[2560,1080]]){
      const aspect=width/height,frame=restingSwordFrame({aspect,imageAspect:16/9,fov:45,cameraZ:8,span,centerX,rest:1});
      assert.equal(frame.width,aspect<.8?.92:.9);
      const transform=new Matrix4().makeRotationZ(frame.rotation),point=new Vector3();
      for(const [part,offset] of parts){
        const positions=part.getAttribute('position');
        for(let at=0;at<positions.count;at++){
          point.set(positions.getX(at)+offset,positions.getY(at),positions.getZ(at)).applyMatrix4(transform).multiplyScalar(frame.scale).add(new Vector3(...frame.position));
          const halfHeight=(8-point.z)*Math.tan(45*Math.PI/360),x=point.x/(halfHeight*aspect),y=point.y/halfHeight;
          assert(Math.abs(x)<.98,`${width}×${height}: physical sword clips horizontally`);
          assert(y>-.95&&y<.9,`${width}×${height}: physical sword clips vertically`);
        }
      }
    }
  });
  check('Ending framing reuses its output storage and safely bounds malformed view inputs',()=>{
    const out={position:[0,0,0],scale:1,rotation:0,width:0},position=out.position;
    for(const value of [NaN,Infinity,-Infinity,0,-20,1,100]){
      assert.strictEqual(restingSwordFrame({aspect:value,imageAspect:value,fov:value,cameraZ:value,span:value,centerX:value,rest:value},out),out);
      assert.strictEqual(out.position,position);assert([...out.position,out.scale,out.rotation,out.width].every(Number.isFinite));assert(out.scale>0);
    }
  });
}finally{for(const [part] of parts)part.dispose();}

check('Opening, Commission and Oath use independent instances of one wrap, fittings and emerald-steel finish',()=>{
  const wrapA=new Texture(),wrapB=new Texture(),roughness=new Texture();
  const gripA=createCeremonyGripMaterial(wrapA),gripB=createCeremonyGripMaterial(wrapB),metalA=createCeremonyFittingsMaterial(),metalB=createCeremonyFittingsMaterial(),steelA=createCeremonyBladeMaterial(roughness),steelB=createCeremonyBladeMaterial(roughness);
  try{
    for(const [a,b] of [[gripA,gripB],[metalA,metalB],[steelA.material,steelB.material]]){
      assert.notStrictEqual(a,b);assert.equal(a.name,b.name);assert(a.color.equals(b.color));
      for(const property of ['roughness','metalness','bumpScale','clearcoat','clearcoatRoughness','emissiveIntensity'])assert.equal(a[property],b[property]);
    }
    assert.deepEqual(wrapA.repeat.toArray(),[1,1.3]);assert.deepEqual(wrapB.repeat.toArray(),[1,1.3]);
    assert.equal(steelA.material.customProgramCacheKey(),steelB.material.customProgramCacheKey());
    steelA.white.value=1;assert.equal(steelB.white.value,0,'Charging the held sword must not mutate a later scene instance');
  }finally{for(const material of [gripA,gripB,metalA,metalB,steelA.material,steelB.material])material.dispose();for(const texture of [wrapA,wrapB,roughness])texture.dispose();}
});

for(const path of ['src/systems/cut/MergeCeremony.tsx','src/systems/smithy/SmithyField.tsx']){
  const source=await readFile(new URL('../'+path,import.meta.url),'utf8');
  check(`${path} assembles the shared weapon without a replacement cylindrical hilt`,()=>{
    for(const factory of ['buildCeremonySwordProfile','createCeremonyGrip','createCeremonyGuard','createCeremonyPommel','createCeremonyCollar','createCeremonyGripMaterial','createCeremonyFittingsMaterial','createCeremonyBladeMaterial'])assert(source.includes(factory));
    assert(!/hiltGeometry=new CylinderGeometry|guardGeometry=roundedCap/.test(source));
  });
}

const report={passed:checks.every(check=>check.passed),checks,scope:'Shared CPU geometry/material identity, fitted closed sheath and actual geometry projection bounds. Native lighting, support contact and perceived scale require the browser pass.'};
await mkdir(new URL('../docs/user-pass/',import.meta.url),{recursive:true});await writeFile(new URL('../docs/user-pass/sword-identity-checks.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
