'use client';
import { useEffect,useMemo,useRef } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import { Mesh,NormalBlending,PlaneGeometry,ShaderMaterial,SRGBColorSpace,Texture,TextureLoader } from 'three';
import { runtime,useJourney,type WorldParams } from '../../core/world';
import { TIMING } from '../../core/config';
import { uploadUniforms,worldUniforms } from '../../world/shaders';
import { mergeGripReady } from '../cut/MergeCeremony';
import { mergeCeremonyPose } from '../cut/merge-pose';
import { handPlaneTransform,SUMMON_HAND_ASSETS,SUMMON_HAND_SCALE } from './hand-assets';
import { CEREMONY_SWORD } from '../cut/sword-geometry';

type HandScene='THRESHOLD'|'MERGE';
const lastFrames:Partial<Record<HandScene,WorldParams>>={};
const vertex=`
  varying vec2 vUv;
  void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const fragment=`
  uniform sampler2D uHandImage;uniform float uLoaded;uniform float uHand;uniform float uSceneMix;uniform float uTime;uniform float uLightIntensity;
  uniform vec3 uBone;uniform vec3 uCandleDim;varying vec2 vUv;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  void main(){
    if(uLoaded<.5||uHand<=0.0)discard;
    vec4 image=texture2D(uHandImage,vUv);
    if(image.a<.003)discard;
    // The supplied orientation begins at the upper-right wrist, ending at the fingers.
    float along=(1.0-vUv.x)*.55+(1.0-vUv.y)*.45;
    float grain=hash(floor(vUv*vec2(630.0,930.0)));
    float ink=along+(grain-.5)*.035;
    float front=uHand*1.22-.11;
    float reveal=1.0-smoothstep(front-.06,front+.06,ink);
    float edge=exp(-pow((ink-front)*24.0,2.0))*step(uHand,.985);
    float fibres=.985+.015*sin((vUv.x-vUv.y*.67)*1500.0+sin(vUv.y*29.0)*1.5);
    vec3 color=mix(image.rgb,uBone,.025)*fibres;
    color+=mix(uCandleDim,uBone,.75)*edge*.045;
    color*=.96+min(uLightIntensity,1.4)*.04;
    float wrist=1.0-smoothstep(.82,.99,max(vUv.x,1.0-vUv.y));
    float alpha=image.a*reveal*uSceneMix*.96*wrist;
    if(alpha<.003)discard;
    gl_FragColor=vec4(color,alpha);
  }`;

/** Reference-derived luminous anatomy, not a recovered canonical SVG or an independent clock. */
export default function ReferenceHand({scene,previous=false}:{scene:HandScene;previous?:boolean}){
  const size=useThree(state=>state.size),mesh=useRef<Mesh>(null);
  const frozen=useRef<WorldParams>({...lastFrames[scene]??useJourney.getState().params});
  const resource=useMemo(()=>{
    const geometry=new PlaneGeometry(1,1);
    const material=new ShaderMaterial({uniforms:{...worldUniforms(),uHandImage:{value:null},uLoaded:{value:0}},vertexShader:vertex,fragmentShader:fragment,
      transparent:true,depthWrite:false,depthTest:false,blending:NormalBlending,toneMapped:false});
    material.name=`GhostHandReferenceAnatomy${scene}`;
    return {geometry,material,texture:null as Texture|null,loaded:false,aspect:1.5};
  },[scene]);
  useEffect(()=>{
    let disposed=false;runtime.referenceHand.meshes++;
    resource.texture=new TextureLoader().load(SUMMON_HAND_ASSETS.receiving.src,texture=>{
      if(disposed){texture.dispose();return;}
      texture.colorSpace=SRGBColorSpace;const image=texture.image as {width:number;height:number};
      resource.aspect=image.width/Math.max(1,image.height);resource.material.uniforms.uHandImage.value=texture;
      resource.loaded=true;resource.material.uniforms.uLoaded.value=1;
    },undefined,()=>{resource.loaded=false;});
    return()=>{
      disposed=true;runtime.referenceHand.meshes--;if(runtime.referenceHand.meshes===0)runtime.referenceHand.loaded=false;
      resource.geometry.dispose();resource.material.dispose();resource.texture?.dispose();
    };
  },[resource]);
  useFrame(()=>{
    const state=useJourney.getState(),p=previous?frozen.current:state.params;
    if(!previous&&state.scene===scene){lastFrames[scene]??={...p};Object.assign(lastFrames[scene]!,p);}
    const aspect=size.width/Math.max(1,size.height),ceremony=mergeCeremonyPose(p.ceremonyTime,aspect,TIMING.merge);
    const acceptance=!state.reducedMotion&&mergeGripReady(scene)?ceremony.grip:0;
    uploadUniforms(resource.material,p);resource.material.uniforms.uSceneMix.value=(previous?1-state.params.sceneMix:state.params.sceneMix)*(1-acceptance)*(1-(ceremony?.sweep??0));
    if(state.reducedMotion)resource.material.uniforms.uTime.value=0;
    runtime.referenceHand.uniformUploads++;
    if(!previous)runtime.referenceHand.loaded=resource.loaded;
    if(mesh.current){
      const received=mergeCeremonyPose(TIMING.merge.swordStart+TIMING.merge.swordDuration,aspect,TIMING.merge);
      const cameraZ=8,halfHeight=cameraZ*Math.tan(45*Math.PI/360),halfWidth=halfHeight*aspect;
      const length=Math.hypot((received.tip[0]-received.hilt[0])*halfWidth,(received.tip[1]-received.hilt[1])*halfHeight),scale=length/Math.hypot(...CEREMONY_SWORD.blade.tip);
      const width=SUMMON_HAND_SCALE.receiving*scale,rotation=received.angle-Math.atan2(CEREMONY_SWORD.blade.tip[1],CEREMONY_SWORD.blade.tip[0])-SUMMON_HAND_ASSETS.receiving.axis;
      const transform=handPlaneTransform(received.hilt[0]*halfWidth,received.hilt[1]*halfHeight,width,resource.aspect,rotation,SUMMON_HAND_ASSETS.receiving.pivot,cameraZ);
      mesh.current.visible=resource.loaded&&p.hand>0;
      mesh.current.position.set(...transform.position);mesh.current.scale.set(...transform.scale);mesh.current.rotation.z=transform.rotation;
    }
  },-4.5);
  return <mesh ref={mesh} geometry={resource.geometry} material={resource.material} frustumCulled={false} dispose={null}/>;
}
