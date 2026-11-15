'use client';
import { useEffect,useMemo,useRef } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import { Color,Mesh,PlaneGeometry,ShaderMaterial,SRGBColorSpace,Texture,TextureLoader } from 'three';
import { PALETTE } from '../../core/config';
import { useJourney } from '../../core/world';

const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const fragment=`uniform sampler2D uImage;uniform float uLoaded;uniform float uOpacity;uniform float uLeave;uniform float uAspect;uniform float uImageAspect;uniform vec3 uGreen;varying vec2 vUv;
void main(){if(uLoaded<.5||uOpacity<.002)discard;
  vec2 crop=vec2(min(1.0,uAspect/uImageAspect),min(1.0,uImageAspect/uAspect));
  vec2 uv=(vUv-.5)*crop/(1.0+uLeave*.15)+.5;uv.y-=uLeave*.025;
  vec3 color=texture2D(uImage,uv).rgb;
  float floorGlow=exp(-pow((vUv.x-.5)*5.0,2.0))*exp(-pow((vUv.y-.23)*4.0,2.0));
  color+=uGreen*floorGlow*.018*uLeave;gl_FragColor=vec4(color,uOpacity);
}`;

/** The supplied P02 plate bridges the received blade into the scrolling story. */
export default function ToriiPassage({previous=false,passage=false}:{previous?:boolean;passage?:boolean}){
  const size=useThree(state=>state.size),camera=useThree(state=>state.camera),mesh=useRef<Mesh>(null);
  const resource=useMemo(()=>({geometry:new PlaneGeometry(2,2),material:new ShaderMaterial({uniforms:{uImage:{value:null},uLoaded:{value:0},uOpacity:{value:0},uLeave:{value:0},uAspect:{value:1},uImageAspect:{value:16/9},uGreen:{value:new Color(PALETTE.candle)}},vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,depthTest:false,toneMapped:false}),texture:null as Texture|null}),[]);
  useEffect(()=>{
    let disposed=false;resource.texture=new TextureLoader().load('/summon-entry/torii-passage.webp',texture=>{if(disposed){texture.dispose();return;}texture.colorSpace=SRGBColorSpace;const image=texture.image as {width:number;height:number};resource.material.uniforms.uImage.value=texture;resource.material.uniforms.uImageAspect.value=image.width/Math.max(1,image.height);resource.material.uniforms.uLoaded.value=1;});
    return()=>{disposed=true;resource.geometry.dispose();resource.material.dispose();resource.texture?.dispose();};
  },[resource]);
  useFrame(()=>{
    const s=useJourney.getState(),p=s.params,leave=passage?.8+p.progress*1.6:p.summonLeave,mix=previous?1-p.sceneMix:p.sceneMix;
    const alpha=s.reducedMotion?0:(passage?1-Math.max(0,Math.min(1,(p.progress-.62)/.38)):Math.max(0,Math.min(1,(leave-.025)/.42)))*mix;
    resource.material.uniforms.uOpacity.value=alpha;resource.material.uniforms.uLeave.value=leave;resource.material.uniforms.uAspect.value=size.width/Math.max(1,size.height);
    if(mesh.current){const fov='fov' in camera?Number(camera.fov):45,halfHeight=(camera.position.z+15)*Math.tan(fov*Math.PI/360);mesh.current.scale.set(halfHeight*size.width/Math.max(1,size.height),halfHeight,1);mesh.current.visible=alpha>.002;}
  },-4);
  return <mesh ref={mesh} geometry={resource.geometry} material={resource.material} position={[0,0,-15]} renderOrder={-98} frustumCulled={false} dispose={null}/>;
}
