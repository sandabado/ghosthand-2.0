'use client';
import { useEffect,useMemo,useRef } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import { AdditiveBlending,BoxGeometry,BufferAttribute,BufferGeometry,Color,DoubleSide,InstancedBufferAttribute,InstancedMesh,Matrix4,PlaneGeometry,ShaderMaterial,SRGBColorSpace,Texture,TextureLoader } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PALETTE } from '../../core/config';
import { runtime,useJourney,type WorldParams } from '../../core/world';
import { uploadUniforms,worldUniforms } from '../../world/shaders';
import { buildGateData } from './geometry';
import { gateBarFragment,gateBarVertex,gateParticleFragment,gateParticleVertex } from './shaders';

const lastGateFrames:Partial<Record<number,WorldParams>>={};
const fleetAnatomyVertex=`
  attribute float aHand;uniform float uFleet0;uniform float uFleet1;uniform float uFleet2;uniform float uGateActive;uniform float uGateDragX;uniform float uGateDragY;
  varying vec2 vUv;varying float vFlight;
  void main(){float flight=aHand<.5?uFleet0:aHand<1.5?uFleet1:uFleet2;vec3 p=position;
    p.x+=(aHand-1.0)*flight*1.1;p.y+=flight*flight*5.5;p.z-=flight*22.0;
    float engaged=(1.0-step(.45,abs(aHand-uGateActive)))*(1.0-step(.001,flight));
    p.x+=engaged*(uGateDragX-.5)*.3;p.y+=engaged*(.5-uGateDragY)*.35;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);vUv=uv;vFlight=flight;}`;
const fleetAnatomyFragment=`
  uniform sampler2D uHandImage;uniform float uHandLoaded;uniform float uSceneMix;varying vec2 vUv;varying float vFlight;
  void main(){if(uHandLoaded<.5)discard;vec4 image=texture2D(uHandImage,vUv);
    float alpha=image.a*.87*(1.0-smoothstep(.65,1.0,vFlight))*uSceneMix;
    if(alpha<.003)discard;gl_FragColor=vec4(image.rgb*.96,alpha);}`;

function fleetGeometry(){
  const base=new PlaneGeometry(2.6,2.6),hands:BufferGeometry[]=[];
  for(let hand=0;hand<3;hand++){
    const geometry=base.clone();geometry.translate(.6+hand*2.1,-.6,-6.0);
    geometry.setAttribute('aHand',new BufferAttribute(new Float32Array(geometry.getAttribute('position').count).fill(hand),1));hands.push(geometry);
  }
  base.dispose();const merged=mergeGeometries(hands)??new BufferGeometry();hands.forEach(geometry=>geometry.dispose());return merged;
}

/** Four local craft artifacts. One shared heartbeat supplies every continuous value. */
export default function GatesField({gate,previous=false}:{gate:number;previous?:boolean}){
  const compact=useThree(state=>state.size.width<760);
  const frozen=useRef<WorldParams>({...lastGateFrames[gate]??useJourney.getState().params});
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
    const handMaterial=handGeometry?new ShaderMaterial({uniforms:{...uniforms(),uHandImage:{value:null},uHandLoaded:{value:0}},vertexShader:fleetAnatomyVertex,fragmentShader:fleetAnatomyFragment,transparent:true,depthWrite:false,side:DoubleSide,toneMapped:false}):null;
    if(handMaterial)handMaterial.name='GhostHandFleetReferenceAnatomy';
    return {data,barGeometry,barMaterial,bars,particleGeometry,particleMaterial,handGeometry,handMaterial,handTexture:null as Texture|null,handLoaded:false,materials:handMaterial?[barMaterial,particleMaterial,handMaterial]:[barMaterial,particleMaterial]};
  },[gate]);
  useEffect(()=>{
    const meshes=resource.handGeometry?2:1,particles=resource.data.particleSeed.length;
    runtime.gates.meshes+=meshes;runtime.gates.particles+=particles;
    let disposed=false;
    if(resource.handMaterial){
      runtime.referenceHand.meshes++;
      resource.handTexture=new TextureLoader().load('/smithy-v8/hero-hand.webp',texture=>{
        if(disposed){texture.dispose();return;}texture.colorSpace=SRGBColorSpace;
        resource.handLoaded=true;resource.handMaterial!.uniforms.uHandImage.value=texture;resource.handMaterial!.uniforms.uHandLoaded.value=1;
      });
    }
    return()=>{
      disposed=true;
      runtime.gates.meshes-=meshes;runtime.gates.particles-=particles;
      if(runtime.gates.activeGate===resource.data.gate)runtime.gates.activeGate=0;
      resource.barGeometry.dispose();resource.barMaterial.dispose();resource.bars.dispose();
      resource.particleGeometry.dispose();resource.particleMaterial.dispose();resource.handGeometry?.dispose();resource.handMaterial?.dispose();
      resource.handTexture?.dispose();if(resource.handMaterial){runtime.referenceHand.meshes--;if(runtime.referenceHand.meshes===0)runtime.referenceHand.loaded=false;}
    };
  },[resource]);
  useFrame(()=>{
    const state=useJourney.getState(),p=previous?frozen.current:state.params;
    if(!previous){lastGateFrames[gate]??={...p};Object.assign(lastGateFrames[gate]!,p);if(resource.handMaterial)runtime.referenceHand.loaded=resource.handLoaded;}
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
