'use client';
import { useEffect,useMemo,useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending,BoxGeometry,BufferAttribute,BufferGeometry,Color,DoubleSide,Group,InstancedBufferAttribute,InstancedMesh,Matrix4,MeshBasicMaterial,PlaneGeometry,PointLight,SphereGeometry,Vector3 } from 'three';
import { ShaderMaterial } from 'three';
import { PALETTE } from '../../core/config';
import { runtime,useJourney,type WorldParams } from '../../core/world';
import { uploadUniforms,worldUniforms } from '../../world/shaders';
import { buildDojoData,DOJO_SCROLLS,dojoWaypoint } from './geometry';
import { dojoBarFragment,dojoBarVertex,dojoParticleFragment,dojoParticleVertex,dojoPoolFragment,dojoScrollFragment,dojoScrollVertex } from './shaders';

let lastDojoFrame:WorldParams|null=null;

/** Authored chamber studies consume the shared render clock and persistent global grade. */
export default function DojoField({previous=false}:{previous?:boolean}){
  const frozen=useRef<WorldParams>({...lastDojoFrame??useJourney.getState().params});
  const exploration=useRef<Group>(null);
  const lantern=useRef<import('three').Mesh>(null),pool=useRef<import('three').Mesh>(null),light=useRef<PointLight>(null);
  const resource=useMemo(()=>{
    const data=buildDojoData();
    const uniforms=()=>({...worldUniforms(),uDojoFocus:{value:0},uDojoGuide:{value:0},uHankoPress:{value:0},uHankoImpact:{value:0},uHankoBloom:{value:0},uHankoStroke:{value:0},
      uGuidePosition:{value:new Vector3()},uLampPosition:{value:new Vector3()},uBlood:{value:new Color(PALETTE.blood)}});
    const geometry=new BoxGeometry(1,1,1);
    geometry.setAttribute('aKind',new InstancedBufferAttribute(data.kind,1));geometry.setAttribute('aSeed',new InstancedBufferAttribute(data.seed,1));geometry.setAttribute('aStation',new InstancedBufferAttribute(data.station,1));
    const stone=new ShaderMaterial({uniforms:{...uniforms(),uChamberStrength:{value:.035}},vertexShader:dojoBarVertex,fragmentShader:dojoBarFragment,transparent:true});stone.name='GhostHandDojoStoneAndGuide';
    const structure=new InstancedMesh(geometry,stone,data.bars),matrix=new Matrix4();
    for(let i=0;i<data.bars;i++){matrix.fromArray(data.matrices,i*16);structure.setMatrixAt(i,matrix);}structure.instanceMatrix.needsUpdate=true;structure.frustumCulled=false;
    const scrollGeometry=new PlaneGeometry(1.95,3.5,1,1);
    const scrolls=DOJO_SCROLLS.map((_,index)=>{
      const material=new ShaderMaterial({uniforms:uniforms(),vertexShader:dojoScrollVertex,fragmentShader:dojoScrollFragment,transparent:true,side:DoubleSide});
      material.uniforms.uVariant.value=index;material.name=`GhostHandDojoCRT${index+1}`;return material;
    });
    const particleGeometry=new BufferGeometry();particleGeometry.setAttribute('position',new BufferAttribute(data.particlePositions,3));particleGeometry.setAttribute('aSeed',new BufferAttribute(data.particleSeed,1));particleGeometry.setAttribute('aKind',new BufferAttribute(data.particleKind,1));
    const particles=new ShaderMaterial({uniforms:uniforms(),vertexShader:dojoParticleVertex,fragmentShader:dojoParticleFragment,transparent:true,depthWrite:false,blending:AdditiveBlending});particles.name='GhostHandDojoLocalMotes';
    const poolGeometry=new PlaneGeometry(8,8),poolMaterial=new ShaderMaterial({uniforms:uniforms(),vertexShader:dojoScrollVertex,fragmentShader:dojoPoolFragment,transparent:true,depthWrite:false,side:DoubleSide,blending:AdditiveBlending});poolMaterial.name='GhostHandDojoLanternPool';
    const lanternGeometry=new SphereGeometry(.045,8,6),lanternMaterial=new MeshBasicMaterial({color:PALETTE.candle,transparent:true,toneMapped:false,depthWrite:false});
    return {data,geometry,stone,structure,scrollGeometry,scrolls,particleGeometry,particles,poolGeometry,poolMaterial,lanternGeometry,lanternMaterial,materials:[stone,...scrolls,particles,poolMaterial]};
  },[]);
  useEffect(()=>{
    runtime.dojo.meshes+=9;runtime.dojo.scrolls+=6;runtime.dojo.particles+=resource.data.particleSeed.length;
    return()=>{
      runtime.dojo.meshes-=9;runtime.dojo.scrolls-=6;runtime.dojo.particles-=resource.data.particleSeed.length;
      resource.geometry.dispose();resource.stone.dispose();resource.structure.dispose();resource.scrollGeometry.dispose();resource.scrolls.forEach(material=>material.dispose());
      resource.particleGeometry.dispose();resource.particles.dispose();resource.poolGeometry.dispose();resource.poolMaterial.dispose();resource.lanternGeometry.dispose();resource.lanternMaterial.dispose();
    };
  },[resource]);
  useFrame(()=>{
    const state=useJourney.getState(),p=previous?frozen.current:state.params;
    if(!previous){lastDojoFrame??={...p};Object.assign(lastDojoFrame,p);}
    const mix=previous?1-state.params.sceneMix:state.params.sceneMix;
    if(exploration.current)exploration.current.visible=state.dojoExploring;
    const waypoint=dojoWaypoint(p.dojoFocus),lampX=p.cameraX+Math.sin(p.dojoYaw)*1.6+p.pointerX*.35;
    const lampZ=5.3+p.cameraZ-Math.cos(p.dojoYaw)*.5,lampY=.25-p.dojoPitch*.6-p.pointerY*.2;
    for(const material of resource.materials){
      uploadUniforms(material,p);material.uniforms.uSceneMix.value=mix;
      (material.uniforms.uGuidePosition.value as Vector3).set(...waypoint);
      (material.uniforms.uLampPosition.value as Vector3).set(lampX,lampY,lampZ);
      if(state.reducedMotion)material.uniforms.uTime.value=0;
      runtime.dojo.uniformUploads++;
    }
    resource.stone.uniforms.uChamberStrength.value=state.dojoExploring?1:.035;
    if(lantern.current)lantern.current.position.set(lampX,lampY,lampZ);
    resource.lanternMaterial.opacity=mix*.45;
    if(pool.current)pool.current.position.set(lampX,-2.49,lampZ-1.5);
    if(light.current){light.current.position.set(lampX,lampY,lampZ);light.current.intensity=(state.dojoExploring?1.2:.08)*mix;}
    if(!previous){runtime.dojo.selected=state.selectedMember;runtime.dojo.guide=p.dojoFocus;}
  },-13);
  return <group dispose={null}>
    <primitive object={resource.structure}/>
    <group ref={exploration} visible={false}>
    {DOJO_SCROLLS.map(({position,yaw},index)=><mesh key={index} position={position} rotation={[0,yaw,0]} geometry={resource.scrollGeometry} material={resource.scrolls[index]} frustumCulled={false}/>)}
    <points geometry={resource.particleGeometry} material={resource.particles} frustumCulled={false}/>
    <mesh ref={pool} geometry={resource.poolGeometry} material={resource.poolMaterial} rotation={[-Math.PI/2,0,0]} frustumCulled={false}/>
    <mesh ref={lantern} geometry={resource.lanternGeometry} material={resource.lanternMaterial}/>
    </group>
    <pointLight ref={light} color={PALETTE.candle} intensity={1.2} distance={8} decay={2}/>
  </group>;
}
