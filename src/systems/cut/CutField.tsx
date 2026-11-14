'use client';
import { useEffect,useMemo,useRef } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import { AdditiveBlending,BoxGeometry,BufferAttribute,BufferGeometry,Color,DoubleSide,InstancedBufferAttribute,InstancedMesh,Matrix4,PlaneGeometry,ShaderMaterial } from 'three';
import { PALETTE } from '../../core/config';
import { runtime,useJourney } from '../../core/world';
import { uploadUniforms,worldUniforms } from '../../world/shaders';
import { buildCutData,type CutScene } from './geometry';
import { cutBarFragment,cutBarVertex,cutParticleFragment,cutParticleVertex,spillFragment,spillVertex } from './shaders';

/** All four fields consume the same world clock and persistent global grade. */
export default function CutField({scene,previous=false}:{scene:CutScene;previous?:boolean}){
  const compact=useThree(state=>state.size.width<760);
  const frozen=useRef({...useJourney.getState().params});
  const resource=useMemo(()=>{
    const data=buildCutData(scene);
    const uniforms=()=>({...worldUniforms(),uCutMode:{value:data.mode},uCompact:{value:0},
      uForkLean:{value:0},uForkChoice:{value:0},uForkCollapse:{value:0},uForkStroke:{value:0},uForkReveal:{value:1},
      uCandle:{value:new Color(PALETTE.candle)},uCandleDim:{value:new Color(PALETTE.candleDim)},uSmoke:{value:new Color(PALETTE.smoke)},uEnemy:{value:new Color(PALETTE.enemy)}});
    const geometry=new BoxGeometry(1,1,1);
    for(const key of ['kind','side','along','seed'] as const)geometry.setAttribute(`a${key[0].toUpperCase()}${key.slice(1)}`,new InstancedBufferAttribute(data[key],1));
    const material=new ShaderMaterial({uniforms:uniforms(),vertexShader:cutBarVertex,fragmentShader:cutBarFragment,transparent:true,depthWrite:false});
    material.name=`GhostHandCut${scene}Structure`;
    const bars=new InstancedMesh(geometry,material,data.bars),matrix=new Matrix4();
    for(let i=0;i<data.bars;i++){matrix.fromArray(data.matrices,i*16);bars.setMatrixAt(i,matrix);}
    bars.instanceMatrix.needsUpdate=true;bars.frustumCulled=false;
    const particleGeometry=new BufferGeometry();particleGeometry.setAttribute('position',new BufferAttribute(data.particlePositions,3));
    particleGeometry.setAttribute('aKind',new BufferAttribute(data.particleKind,1));particleGeometry.setAttribute('aSide',new BufferAttribute(data.particleSide,1));particleGeometry.setAttribute('aSeed',new BufferAttribute(data.particleSeed,1));
    const particleMaterial=new ShaderMaterial({uniforms:uniforms(),vertexShader:cutParticleVertex,fragmentShader:cutParticleFragment,transparent:true,depthWrite:false,blending:AdditiveBlending});
    particleMaterial.name=`GhostHandCut${scene}Motes`;
    const spillGeometry=data.mode===2||data.mode===4?new PlaneGeometry(1,1):null;
    const spillMaterial=spillGeometry?new ShaderMaterial({uniforms:uniforms(),vertexShader:spillVertex,fragmentShader:spillFragment,transparent:true,depthWrite:false,side:DoubleSide,blending:AdditiveBlending}):null;
    if(spillMaterial)spillMaterial.name=`GhostHandCut${scene}LightSpill`;
    return {data,geometry,material,bars,particleGeometry,particleMaterial,spillGeometry,spillMaterial,materials:spillMaterial?[material,particleMaterial,spillMaterial]:[material,particleMaterial]};
  },[scene]);
  useEffect(()=>{
    const meshes=resource.spillGeometry?2:1,particles=resource.data.particleSeed.length;
    runtime.cut.meshes+=meshes;runtime.cut.particles+=particles;
    return()=>{
      runtime.cut.meshes-=meshes;runtime.cut.particles-=particles;
      if(runtime.cut.scene===scene){runtime.cut.scene='';runtime.cut.spill=0;}
      resource.geometry.dispose();resource.material.dispose();resource.bars.dispose();
      resource.particleGeometry.dispose();resource.particleMaterial.dispose();resource.spillGeometry?.dispose();resource.spillMaterial?.dispose();
    };
  },[resource,scene]);
  useFrame(()=>{
    const state=useJourney.getState(),p=previous?frozen.current:state.params;
    for(const material of resource.materials){
      uploadUniforms(material,p);material.uniforms.uSceneMix.value=previous?1-state.params.sceneMix:state.params.sceneMix;
      material.uniforms.uCompact.value=compact?1:0;
      if(state.reducedMotion)material.uniforms.uTime.value=0;
      runtime.cut.uniformUploads++;
    }
    if(!previous){runtime.cut.scene=scene;runtime.cut.spill=scene==='MERGE'?((p.sword>0?.15+p.sword*.85:0)+p.flash*.7):0;}
  },-13);
  const spillPosition:[number,number,number]=scene==='MERGE'?[compact?.7:3.05,compact?-1.75:-.35,-6.2]:[0,-.55,-9.7];
  const spillScale:[number,number,number]=scene==='MERGE'?[compact?10:14,12,1]:[compact?7:10,9,1];
  return <group dispose={null}>
    <primitive object={resource.bars}/>
    <points geometry={resource.particleGeometry} material={resource.particleMaterial} frustumCulled={false}/>
    {resource.spillGeometry&&resource.spillMaterial?<mesh geometry={resource.spillGeometry} material={resource.spillMaterial} position={spillPosition} scale={spillScale} frustumCulled={false}/>:null}
  </group>;
}
