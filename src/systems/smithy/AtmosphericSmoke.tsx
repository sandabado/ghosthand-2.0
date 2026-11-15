'use client';

import { useEffect,useMemo } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import { Color,DynamicDrawUsage,InstancedBufferAttribute,InstancedMesh,Matrix4,PlaneGeometry,Quaternion,ShaderMaterial,Vector3 } from 'three';
import { PALETTE,type SceneId } from '../../core/config';
import { runtime,useJourney } from '../../core/world';
import { renderQualityState } from '../../core/render-quality';

const seed=(index:number)=>{const value=Math.sin(index*73.17+19.67)*43758.5453;return value-Math.floor(value);};
const scenes:Partial<Record<SceneId,{density:number;height:number;green:number;light:[number,number,number]}>>={
  THRESHOLD:{density:.155,height:-1.05,green:.08,light:[3.8,3.4,-3]},
  MERGE:{density:.24,height:-1.45,green:.12,light:[1.8,2.6,-3]},
  DRAIN:{density:.095,height:-2.1,green:.035,light:[.8,-.5,-8]},
  CRAFT_F1:{density:.105,height:-2.1,green:.055,light:[2,1.8,-6]},
  CRAFT_F2:{density:.075,height:-2.3,green:.04,light:[2,2,-7]},
  CRAFT_F3:{density:.09,height:-2.05,green:.055,light:[2.5,2.7,-5]},
  CRAFT_F4:{density:.09,height:-2.2,green:.04,light:[3,2,-7]},
  COMMISSION:{density:.18,height:-1.8,green:.055,light:[.5,.55,-9]},
  OATH:{density:.13,height:-2.25,green:.025,light:[2.8,3.8,-4]},
  DOJO:{density:.14,height:-2.1,green:.055,light:[3.5,3.8,-6]},
};
const vertex=`
  attribute float aSeed;varying vec2 vUv;varying float vSeed;varying vec3 vWorld;
  void main(){vUv=uv;vSeed=aSeed;vec4 world=modelMatrix*instanceMatrix*vec4(position,1.0);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`;
const fragment=`
  uniform float uTime;uniform float uDensity;uniform float uGreen;uniform float uFade;uniform float uSamples;
  uniform vec3 uBone;uniform vec3 uSmoke;uniform vec3 uCandleDim;uniform vec3 uLight;
  varying vec2 vUv;varying float vSeed;varying vec3 vWorld;
  float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float field(vec3 p){return noise(p)*.69+noise(p*2.07+vec3(7.1,1.8,3.6))*.31;}
  void main(){
    vec2 p=vUv*2.0-1.0;float radius=dot(p*vec2(.96,1.12),p*vec2(.96,1.12));
    if(radius>1.0)discard;
    // A short volume integral gives a lit front, body and occluded interior.
    // This is a volume impostor, not full-scene ray marching or a depth-texture pass.
    vec3 wind=vec3(uTime*.026,-uTime*.041,uTime*.014);
    vec3 volume=vec3(p*vec2(1.35,1.8),0.0)+vec3(vSeed*13.0,0.0,vSeed*7.0)+wind;
    vec3 curl=vec3(field(volume*.72),field(volume*.72+5.3),field(volume*.72+11.7))-.5;
    float optical=0.0;float front=0.0;
    for(int i=0;i<3;i++){
      if(float(i)>=uSamples)break;
      float depth=(float(i)+.5)/uSamples*1.74-.87;
      float envelope=pow(max(0.0,1.0-radius-depth*depth*.55),1.8);
      float n=field(volume+curl*.85+vec3(0.0,0.0,depth));
      float layer=smoothstep(.29,.68,n)*envelope;
      optical+=layer*(1.74/uSamples);front+=layer*(1.0-float(i)/uSamples*.75)*(3.0/uSamples);
    }
    float life=fract(uTime*.018+vSeed);float breath=pow(sin(life*3.14159265),.7);
    float edge=1.0-smoothstep(.55,1.0,radius);
    float alpha=(1.0-exp(-optical*1.7))*uDensity*breath*edge*uFade;
    if(alpha<.002)discard;
    vec3 lightVector=uLight-vWorld;float proximity=1.0/(1.0+dot(lightVector,lightVector)*.035);
    float directional=pow(max(0.0,dot(normalize(cameraPosition-vWorld),normalize(lightVector))*.5+.5),2.0);
    float interior=exp(-optical*1.9);float silver=.1+front*.23+interior*.15;
    vec3 lit=mix(uBone,uCandleDim,uGreen)*silver*(.45+proximity*1.2+directional*.45);
    gl_FragColor=vec4(mix(uSmoke*.13,lit,.58+interior*.42),alpha);
  }`;

/** Near, middle and far smoke volumes consume only the existing shared clock. */
export default function AtmosphericSmoke(){
  const camera=useThree(state=>state.camera);
  const capacity=24;
  const resource=useMemo(()=>{
    const geometry=new PlaneGeometry(1,1),seeds=Float32Array.from({length:capacity},(_,i)=>seed(i+1));
    geometry.setAttribute('aSeed',new InstancedBufferAttribute(seeds,1));
    const material=new ShaderMaterial({uniforms:{uTime:{value:0},uDensity:{value:0},uGreen:{value:0},uFade:{value:0},uSamples:{value:3},uLight:{value:new Vector3()},uBone:{value:new Color(PALETTE.bone)},uSmoke:{value:new Color(PALETTE.smoke)},uCandleDim:{value:new Color(PALETTE.candleDim)}},vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,depthTest:true});
    material.name='GhostHandLitSmokeVolumes';
    const mesh=new InstancedMesh(geometry,material,capacity);mesh.frustumCulled=false;mesh.renderOrder=3;mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    return {geometry,material,mesh,seeds,matrix:new Matrix4(),position:new Vector3(),scale:new Vector3(),quaternion:new Quaternion(),roll:new Quaternion(),axis:new Vector3(0,0,1)};
  },[]);
  useEffect(()=>()=>{resource.geometry.dispose();resource.material.dispose();resource.mesh.dispose();runtime.smoke.wisps=0;},[resource]);
  useFrame(()=>{
    const state=useJourney.getState(),p=state.params,setting=scenes[state.scene],quality=renderQualityState.current,count=quality.smokeCount;
    resource.mesh.count=count;resource.material.uniforms.uSamples.value=quality.smokeSamples;
    const enabled=Boolean(setting)&&!state.reducedMotion;resource.mesh.visible=enabled;runtime.smoke.wisps=enabled?count:0;
    if(!setting||!enabled)return;
    resource.material.uniforms.uTime.value=p.time;resource.material.uniforms.uDensity.value=setting.density;
    resource.material.uniforms.uGreen.value=setting.green+(state.scene==='DRAIN'?p.drainDawn*.07:0);
    resource.material.uniforms.uFade.value=p.sceneMix;resource.material.uniforms.uLight.value.set(...setting.light);
    for(let i=0;i<count;i++){
      const s=resource.seeds[i],age=(p.time*.018+s)%1;
      const plume=state.scene==='COMMISSION'&&i<Math.ceil(count*.3);
      const band=i/count,z=plume?-11+band*5:-15+band*13;
      const y=(plume?-1.8+age*5.2:setting.height+(age-.5)*1.15)+Math.sin(p.time*.065+s*17)*.09;
      const x=(seed(i+101)-.5)*(plume?2.1:18)+Math.sin(p.time*.035+s*13)*(plume?.1:.22);
      resource.position.set(x,y,z);resource.scale.set(plume?1.25+seed(i+151)*.85:4.2+seed(i+151)*3.5,plume?1.8+seed(i+201)*1.5:1.15+seed(i+201)*1.2,1);
      resource.roll.setFromAxisAngle(resource.axis,(s-.5)*.25+Math.sin(p.time*.025+s*4)*.025);
      resource.quaternion.copy(camera.quaternion).multiply(resource.roll);
      resource.matrix.compose(resource.position,resource.quaternion,resource.scale);resource.mesh.setMatrixAt(i,resource.matrix);
    }
    resource.mesh.instanceMatrix.needsUpdate=true;runtime.smoke.uniformUploads++;
  },-10);
  return <primitive object={resource.mesh} dispose={null}/>;
}
