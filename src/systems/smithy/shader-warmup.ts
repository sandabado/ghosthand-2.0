import { BackSide,Group,HalfFloatType,LinearSRGBColorSpace,Mesh,MeshDepthMaterial,WebGLRenderTarget,type Camera,type Material,type Scene,type WebGLRenderer } from 'three';

/** Keep the exact shadow programs alive until their receiving scene is disposed. */
export function prepareSmithyShadows(root:Group){
  const group=new Group(),materials=new Map<string,MeshDepthMaterial>(),owners:{mesh:Mesh;previous:Material|undefined;material:MeshDepthMaterial}[]=[];
  root.traverse(object=>{
    if(!(object instanceof Mesh)||!object.castShadow)return;
    const source=Array.isArray(object.material)?object.material[0]:object.material;
    const mapped=source as Material&{map?:MeshDepthMaterial['map']},key=mapped.map?.uuid??'unmapped';
    let material=materials.get(key);
    if(!material){material=new MeshDepthMaterial({side:BackSide,map:mapped.map??null});materials.set(key,material);}
    owners.push({mesh:object,previous:object.customDepthMaterial,material});object.customDepthMaterial=material;
    group.add(new Mesh(object.geometry,material));
  });
  return {group,dispose(){for(const owner of owners)if(owner.mesh.customDepthMaterial===owner.material)owner.mesh.customDepthMaterial=owner.previous;for(const material of materials.values())material.dispose();group.clear();}};
}

/** Compile the compositor's linear offscreen variant, not the different screen shader. */
export function compileSmithyMaterials(renderer:WebGLRenderer,root:Group,camera:Camera,scene:Scene){
  const target=new WebGLRenderTarget(1,1,{type:HalfFloatType,colorSpace:LinearSRGBColorSpace,depthBuffer:false});
  const previous=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),mip=renderer.getActiveMipmapLevel();
  let compilation:Promise<unknown>;
  try{renderer.setRenderTarget(target);compilation=renderer.compileAsync(root,camera,scene);}
  catch(error){target.dispose();return Promise.reject(error);}
  finally{renderer.setRenderTarget(previous,face,mip);}
  return compilation.finally(()=>target.dispose());
}
