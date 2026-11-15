'use client';
import { useEffect,useMemo,useRef } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import { Color,Mesh,PlaneGeometry,ShaderMaterial,SRGBColorSpace,Texture,TextureLoader } from 'three';
import { PALETTE,TIMING } from '../../core/config';
import { runtime,useJourney,type WorldParams } from '../../core/world';
import { openingCeremonyPose } from '../cut/merge-pose';
import { mergeGripReady } from '../cut/MergeCeremony';
import { handPlaneTransform,SUMMON_HAND_ASSETS,SUMMON_HAND_SCALE } from './hand-assets';
import { CEREMONY_SWORD } from '../cut/sword-geometry';

const lastFrames:{current:WorldParams|null}={current:null};
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const fragment=`uniform sampler2D uImage;uniform float uLoaded;uniform float uOpacity;uniform vec3 uGreen;varying vec2 vUv;
  void main(){if(uLoaded<.5)discard;vec4 source=texture2D(uImage,vUv);float wrist=1.0-smoothstep(.82,.99,max(vUv.x,1.0-vUv.y));float alpha=source.a*uOpacity*wrist;if(alpha<.003)discard;
    float luminance=dot(source.rgb,vec3(.2126,.7152,.0722));vec3 color=mix(source.rgb,uGreen*luminance*1.7,.32);
    gl_FragColor=vec4(color*1.08,alpha);}`;

/** P01's fingertip is the pointer. Anatomy opens toward the descending hilt on commitment. */
export default function SummonHand({previous=false}:{previous?:boolean}){
  const size=useThree(state=>state.size),camera=useThree(state=>state.camera),point=useRef<Mesh>(null),palm=useRef<Mesh>(null);
  const frozen=useRef<WorldParams>({...lastFrames.current??useJourney.getState().params});
  const resource=useMemo(()=>{
    const make=()=>({material:new ShaderMaterial({uniforms:{uImage:{value:null},uLoaded:{value:0},uOpacity:{value:0},uGreen:{value:new Color(PALETTE.candle)}},vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,depthTest:false,toneMapped:false}),texture:null as Texture|null,loaded:false,aspect:1.5});
    return {geometry:new PlaneGeometry(1,1),point:make(),palm:make()};
  },[]);
  useEffect(()=>{
    let disposed=false;runtime.referenceHand.meshes+=2;
    for(const [entry,asset] of [[resource.point,SUMMON_HAND_ASSETS.pointing],[resource.palm,SUMMON_HAND_ASSETS.receiving]] as const){
      entry.texture=new TextureLoader().load(asset.src,texture=>{
        if(disposed){texture.dispose();return;}texture.colorSpace=SRGBColorSpace;
        const image=texture.image as {width:number;height:number};entry.aspect=image.width/Math.max(1,image.height);
        entry.material.uniforms.uImage.value=texture;entry.material.uniforms.uLoaded.value=1;entry.loaded=true;
      });
    }
    return()=>{disposed=true;runtime.referenceHand.meshes-=2;resource.geometry.dispose();for(const entry of [resource.point,resource.palm]){entry.material.dispose();entry.texture?.dispose();}if(!runtime.referenceHand.meshes)runtime.referenceHand.loaded=false;};
  },[resource]);
  useFrame(()=>{
    const state=useJourney.getState(),p=previous?frozen.current:state.params;
    if(!previous&&state.scene==='THRESHOLD'){lastFrames.current??={...p};Object.assign(lastFrames.current,p);}
    const a=size.width/Math.max(1,size.height),pointing=state.thresholdPhase==='pointing';
    const pose=openingCeremonyPose(pointing?0:p.ceremonyTime,a,TIMING.threshold,p.summonTargetX,p.summonTargetY);
    const received=openingCeremonyPose(TIMING.threshold.swordStart+TIMING.threshold.swordDuration,a,TIMING.threshold,p.summonTargetX,p.summonTargetY);
    const fov='fov' in camera?Number(camera.fov):45,halfHeight=camera.position.z*Math.tan(fov*Math.PI/360),halfWidth=halfHeight*a;
    const distance=Math.hypot((received.tip[0]-received.hilt[0])*halfWidth,(received.tip[1]-received.hilt[1])*halfHeight),scale=distance/Math.hypot(...CEREMONY_SWORD.blade.tip);
    const mix=previous?1-state.params.sceneMix:state.params.sceneMix,leave=1-Math.min(1,p.summonLeave*3.3);
    const acceptance=mergeGripReady('THRESHOLD')?pose.grip:0,receive=pointing?0:pose.receiving;
    resource.point.material.uniforms.uOpacity.value=(1-receive)*mix*leave;
    resource.palm.material.uniforms.uOpacity.value=receive*(1-acceptance)*mix*leave;
    const place=(mesh:Mesh|null,entry:typeof resource.point,asset:typeof SUMMON_HAND_ASSETS.pointing|typeof SUMMON_HAND_ASSETS.receiving,x:number,y:number,angle:number,width:number)=>{
      if(!mesh)return;const transform=handPlaneTransform(x*halfWidth,y*halfHeight,width*scale,entry.aspect,angle,asset.pivot,camera.position.z);
      mesh.position.set(...transform.position);mesh.rotation.z=transform.rotation;mesh.scale.set(...transform.scale);mesh.visible=!state.reducedMotion&&entry.loaded&&entry.material.uniforms.uOpacity.value>.002;
    };
    place(point.current,resource.point,SUMMON_HAND_ASSETS.pointing,p.summonX,p.summonY,0,SUMMON_HAND_SCALE.pointing);
    const palmY=p.summonTargetY+(received.hilt[1]-p.summonTargetY)*receive;
    place(palm.current,resource.palm,SUMMON_HAND_ASSETS.receiving,p.summonTargetX,palmY,received.angle-Math.atan2(CEREMONY_SWORD.blade.tip[1],CEREMONY_SWORD.blade.tip[0])-SUMMON_HAND_ASSETS.receiving.axis,SUMMON_HAND_SCALE.receiving);
    if(!previous)runtime.referenceHand.loaded=resource.point.loaded&&resource.palm.loaded;
    runtime.referenceHand.uniformUploads+=2;
  },-4.5);
  return <><mesh ref={point} geometry={resource.geometry} material={resource.point.material} renderOrder={5} dispose={null}/><mesh ref={palm} geometry={resource.geometry} material={resource.palm.material} renderOrder={5} dispose={null}/></>;
}
