'use client';

import { useEffect,useMemo } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import { Color,DoubleSide,InstancedMesh,Matrix4,PlaneGeometry,Quaternion,ShaderMaterial,Vector3 } from 'three';
import { PALETTE,type SceneId } from '../../core/config';
import { useJourney } from '../../core/world';

const strength:Partial<Record<SceneId,number>>={THRESHOLD:.024,LEGEND:.014,DRAIN:.025,CRAFT_F1:.028,CRAFT_F2:.018,CRAFT_F3:.022,CRAFT_F4:.02,DOJO:.032,COMMISSION:.045,OATH:.019};
const vertex=`varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vec4 world=modelMatrix*instanceMatrix*vec4(position,1.0);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`;
const fragment=`
  uniform float uTime;uniform float uStrength;uniform float uFade;uniform vec3 uBone;uniform vec3 uGreen;
  varying vec2 vUv;varying vec3 vWorld;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
  void main(){
    float width=.055+(1.0-vUv.y)*.43;
    float distance=abs(vUv.x-.5)/width;
    float cone=exp(-distance*distance*5.0)*(1.0-smoothstep(.7,1.0,distance));
    float ends=smoothstep(0.0,.18,vUv.y)*(1.0-smoothstep(.88,1.0,vUv.y));
    float veil=.64+noise(vWorld.xy*.36+vec2(0.0,-uTime*.018))*.36;
    float alpha=cone*ends*veil*uStrength*uFade;
    if(alpha<.0008)discard;
    gl_FragColor=vec4(mix(uBone,uGreen,.11),alpha);
  }`;

/** Two fixed architectural light paths; only the suspended haze moves through them. */
export default function LightShafts(){
  const camera=useThree(state=>state.camera),compact=useThree(state=>state.size.width<760);
  const resource=useMemo(()=>{
    const geometry=new PlaneGeometry(1,1),material=new ShaderMaterial({uniforms:{uTime:{value:0},uStrength:{value:0},uFade:{value:0},uBone:{value:new Color(PALETTE.bone)},uGreen:{value:new Color(PALETTE.candleDim)}},vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,depthTest:true,side:DoubleSide});
    material.name='GhostHandArchitecturalLightPaths';
    const mesh=new InstancedMesh(geometry,material,2);mesh.frustumCulled=false;mesh.renderOrder=2;
    return {geometry,material,mesh,matrix:new Matrix4(),position:new Vector3(),scale:new Vector3(),quaternion:new Quaternion(),roll:new Quaternion(),axis:new Vector3(0,0,1)};
  },[]);
  useEffect(()=>()=>{resource.geometry.dispose();resource.material.dispose();resource.mesh.dispose();},[resource]);
  useFrame(()=>{
    const state=useJourney.getState(),p=state.params,amount=strength[state.scene]??0;
    resource.mesh.visible=amount>0&&!state.reducedMotion;
    if(!resource.mesh.visible)return;
    resource.material.uniforms.uTime.value=p.time;
    resource.material.uniforms.uStrength.value=amount*(state.scene==='DRAIN'?p.drainDawn:1);
    resource.material.uniforms.uFade.value=p.sceneMix;
    resource.mesh.count=compact?1:2;
    for(let i=0;i<resource.mesh.count;i++){
      const chamber=state.scene==='COMMISSION';
      resource.position.set((chamber?2.6:3.8)+i*2.7,.45-i*.7,-12+i*1.7);
      resource.scale.set(chamber?5.1:4.3,chamber?11:10,1);
      resource.roll.setFromAxisAngle(resource.axis,i===0?-.21:.13);
      resource.quaternion.copy(camera.quaternion).multiply(resource.roll);
      resource.matrix.compose(resource.position,resource.quaternion,resource.scale);resource.mesh.setMatrixAt(i,resource.matrix);
    }
    resource.mesh.instanceMatrix.needsUpdate=true;
  },-11);
  return <primitive object={resource.mesh} dispose={null}/>;
}
