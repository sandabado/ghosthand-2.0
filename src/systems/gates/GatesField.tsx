'use client';
import { useEffect,useMemo,useRef } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import { AdditiveBlending,BoxGeometry,BufferAttribute,BufferGeometry,Color,DoubleSide,InstancedBufferAttribute,InstancedMesh,Matrix4,ShaderMaterial } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PALETTE } from '../../core/config';
import { runtime,useJourney } from '../../core/world';
import { uploadUniforms,worldUniforms } from '../../world/shaders';
import { createBrushGeometry,svgToStrokes } from '../ink/geometry';
import { HAND_SVG } from '../ink/sources';
import { buildGateData } from './geometry';
import { fleetHandFragment,fleetHandVertex,gateBarFragment,gateBarVertex,gateParticleFragment,gateParticleVertex } from './shaders';

function fleetGeometry(){
  const paths=svgToStrokes(HAND_SVG,{segments:48});
  const strokes=paths.map(path=>createBrushGeometry(path.points,{width:path.width,pressure:path.pressure,seed:path.seed}));
  const base=mergeGeometries(strokes);strokes.forEach(geometry=>geometry.dispose());
  if(!base)return new BufferGeometry();
  base.center();const hands:BufferGeometry[]=[];
  for(let hand=0;hand<3;hand++){
    const geometry=base.clone();geometry.scale(.42,.42,.42);geometry.translate(.6+hand*2.1,-.6,-6.0);
    geometry.setAttribute('aHand',new BufferAttribute(new Float32Array(geometry.getAttribute('position').count).fill(hand),1));hands.push(geometry);
  }
  base.dispose();const merged=mergeGeometries(hands)??new BufferGeometry();hands.forEach(geometry=>geometry.dispose());return merged;
}

/** Four local craft artifacts. One shared heartbeat supplies every continuous value. */
export default function GatesField({gate,previous=false}:{gate:number;previous?:boolean}){
  const compact=useThree(state=>state.size.width<760);
  const frozen=useRef({...useJourney.getState().params});
  const resource=useMemo(()=>{
    const data=buildGateData(gate);
    const uniforms=()=>({...worldUniforms(),uGateMode:{value:data.gate},uGatePulse:{value:0},uGateActive:{value:-1},uGateDragX:{value:0},uGateDragY:{value:0},
      uForge0:{value:0},uForge1:{value:0},uForge2:{value:0},uTrainReveal:{value:0},uTrainCompile:{value:0},uOwnX:{value:.18},uOwnY:{value:.74},uOwnLock:{value:0},
      uFleet0:{value:0},uFleet1:{value:0},uFleet2:{value:0},uCandle:{value:new Color(PALETTE.candle)},uCandleDim:{value:new Color(PALETTE.candleDim)},uSmoke:{value:new Color(PALETTE.smoke)}});
    const barGeometry=new BoxGeometry(1,1,1);
    for(const key of ['kind','channel','along','seed'] as const)barGeometry.setAttribute(`a${key[0].toUpperCase()}${key.slice(1)}`,new InstancedBufferAttribute(data[key],1));
    const barMaterial=new ShaderMaterial({uniforms:uniforms(),vertexShader:gateBarVertex,fragmentShader:gateBarFragment,transparent:true,depthWrite:false});
    barMaterial.name=`GhostHandGate${data.gate}Architecture`;
    const bars=new InstancedMesh(barGeometry,barMaterial,data.bars),matrix=new Matrix4();
    for(let i=0;i<data.bars;i++){matrix.fromArray(data.matrices,i*16);bars.setMatrixAt(i,matrix);}
    bars.instanceMatrix.needsUpdate=true;bars.frustumCulled=false;
    const particleGeometry=new BufferGeometry();particleGeometry.setAttribute('position',new BufferAttribute(data.particlePositions,3));
    particleGeometry.setAttribute('aSeed',new BufferAttribute(data.particleSeed,1));particleGeometry.setAttribute('aChannel',new BufferAttribute(data.particleChannel,1));
    const particleMaterial=new ShaderMaterial({uniforms:uniforms(),vertexShader:gateParticleVertex,fragmentShader:gateParticleFragment,transparent:true,depthWrite:false,blending:AdditiveBlending});
    particleMaterial.name=`GhostHandGate${data.gate}Motes`;
    const handGeometry=data.gate===4?fleetGeometry():null;
    const handMaterial=handGeometry?new ShaderMaterial({uniforms:uniforms(),vertexShader:fleetHandVertex,fragmentShader:fleetHandFragment,transparent:true,depthWrite:false,side:DoubleSide}):null;
    if(handMaterial)handMaterial.name='GhostHandGateFleetAuthoredInkStudy';
    return {data,barGeometry,barMaterial,bars,particleGeometry,particleMaterial,handGeometry,handMaterial,materials:handMaterial?[barMaterial,particleMaterial,handMaterial]:[barMaterial,particleMaterial]};
  },[gate]);
  useEffect(()=>{
    const meshes=resource.handGeometry?2:1,particles=resource.data.particleSeed.length;
    runtime.gates.meshes+=meshes;runtime.gates.particles+=particles;
    return()=>{
      runtime.gates.meshes-=meshes;runtime.gates.particles-=particles;
      if(runtime.gates.activeGate===resource.data.gate)runtime.gates.activeGate=0;
      resource.barGeometry.dispose();resource.barMaterial.dispose();resource.bars.dispose();
      resource.particleGeometry.dispose();resource.particleMaterial.dispose();resource.handGeometry?.dispose();resource.handMaterial?.dispose();
    };
  },[resource]);
  useFrame(()=>{
    const state=useJourney.getState(),p=previous?frozen.current:state.params;
    for(const material of resource.materials){
      uploadUniforms(material,p);material.uniforms.uSceneMix.value=previous?1-state.params.sceneMix:state.params.sceneMix;
      if(state.reducedMotion)material.uniforms.uTime.value=0;
      runtime.gates.uniformUploads++;
    }
    if(!previous)runtime.gates.activeGate=resource.data.gate;
  },-13);
  return <group dispose={null} scale={compact?(gate===4?.43:.55):1} position={compact?(gate===4?[-1.16,-.35,-.8]:[-1.3,-.35,0]):[0,0,0]}>
    <primitive object={resource.bars}/>
    <points geometry={resource.particleGeometry} material={resource.particleMaterial} frustumCulled={false}/>
    {resource.handGeometry&&resource.handMaterial?<mesh geometry={resource.handGeometry} material={resource.handMaterial} frustumCulled={false}/>:null}
  </group>;
}
