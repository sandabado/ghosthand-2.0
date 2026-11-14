'use client';
import { useEffect,useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending,BufferAttribute,BufferGeometry,CatmullRomCurve3,Line,ShaderMaterial,Vector3 } from 'three';
import { useJourney } from '../core/world';
import { strokeFragment,strokeVertex,uploadUniforms,worldUniforms } from '../world/shaders';

export type StrokePoint=[number,number,number];
/** Temporary geometry adapter. Canonical paths and wet-edge treatment are later inputs. */
export function strokeGeometry(path:StrokePoint[],segment=0,segments=1){
  const points=new CatmullRomCurve3(path.map(p=>new Vector3(...p))).getPoints(70);
  const geometry=new BufferGeometry().setFromPoints(points);
  geometry.setAttribute('aAlong',new BufferAttribute(new Float32Array(points.map((_,i)=>(segment+i/(points.length-1))/segments)),1));
  geometry.setAttribute('aSeed',new BufferAttribute(new Float32Array(points.map((_,i)=>((i*37+segment*17)%71)/71)),1));
  return geometry;
}
const tipVertex=`
attribute float aAlong;attribute float aSeed;uniform float uHand;uniform float uTime;uniform float uInkTipDecay;
varying float vAlpha;
void main(){
  float age=max(0.0,uHand-aAlong);
  float reached=step(aAlong,uHand);
  vAlpha=reached*(1.0-smoothstep(0.01,0.12,age))*(1.0-uInkTipDecay);
  vec3 p=position;p.x+=sin(aSeed*24.0+uTime)*age*1.6;
  p.y+=(age+aSeed*0.04)*uInkTipDecay*1.5;
  vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;
  gl_PointSize=clamp((2.0+aSeed*4.0)/max(1.0,-mv.z)*8.0,1.0,6.0);
}`;
const tipFragment=`uniform vec3 uColor;varying float vAlpha;void main(){float d=length(gl_PointCoord-0.5);gl_FragColor=vec4(uColor,(1.0-smoothstep(0.0,0.5,d))*vAlpha*0.5);}`;

/** Shared draw + basic tip-dissolution fixture. Every value comes from world params. */
export function InkStroke({path,segment=0,segments=1}:{path:StrokePoint[];segment?:number;segments?:number}){
  const resource=useMemo(()=>{
    const geometry=strokeGeometry(path,segment,segments);
    const lineMaterial=new ShaderMaterial({uniforms:worldUniforms(),vertexShader:strokeVertex,fragmentShader:strokeFragment,transparent:true,depthWrite:false,blending:AdditiveBlending});
    const tipMaterial=new ShaderMaterial({uniforms:worldUniforms(),vertexShader:tipVertex,fragmentShader:tipFragment,transparent:true,depthWrite:false,blending:AdditiveBlending});
    return {geometry,lineMaterial,tipMaterial,line:new Line(geometry,lineMaterial)};
  },[path,segment,segments]);
  useFrame(()=>{
    const state=useJourney.getState();
    uploadUniforms(resource.lineMaterial,state.params);uploadUniforms(resource.tipMaterial,state.params);
    if(state.reducedMotion)resource.tipMaterial.uniforms.uTime.value=0;
  },-16);
  useEffect(()=>()=>{resource.geometry.dispose();resource.lineMaterial.dispose();resource.tipMaterial.dispose();},[resource]);
  return <><primitive object={resource.line}/><points geometry={resource.geometry} material={resource.tipMaterial}/></>;
}
