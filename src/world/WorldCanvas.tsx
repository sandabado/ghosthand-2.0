'use client';
import { Component,useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ChromaticAberrationEffect,LuminanceMaterial,type BloomEffect } from 'postprocessing';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, Material, Mesh, PCFShadowMap, ShaderMaterial, Vector2 } from 'three';
import { InkStroke } from '../systems/InkStroke';
import ReferenceHand from '../systems/ink/ReferenceHand';
import SummonHand from '../systems/ink/SummonHand';
import ToriiPassage from '../systems/ink/ToriiPassage';
import DrainField from '../systems/drain/DrainField';
import GatesField from '../systems/gates/GatesField';
import CutField from '../systems/cut/CutField';
import MergeCeremony from '../systems/cut/MergeCeremony';
import { PageSliceEffect } from '../systems/cut/PageSliceEffect';
import { releaseCeremonyStudio } from '../systems/cut/sword-materials';
import DojoField from '../systems/dojo/DojoField';
import SmithyField from '../systems/smithy/SmithyField';
import AtmosphericSmoke from '../systems/smithy/AtmosphericSmoke';
import LightShafts from '../systems/smithy/LightShafts';
import FloatingRelics from '../systems/smithy/FloatingRelics';
import { svgToStrokes } from '../systems/ink/geometry';
import { SIGIL_SVG,SLASH_SVG } from '../systems/ink/sources';
import { PALETTE, SCENES, type SceneId } from '../core/config';
import { runtime, useJourney } from '../core/world';
import { cleanupMeasuredRenderer,renderMeasured } from '../core/performance';
import { getRenderQuality,renderQualityState } from '../core/render-quality';
import { atmosphereFragment, atmosphereVertex, fogFragment, fogVertex, uploadUniforms, worldUniforms } from './shaders';

type Advance=(timeSeconds:number)=>void;
interface Props { onAdvanceReady:(advance:Advance)=>void; }

function WorldFallback(){
  useEffect(()=>{document.documentElement.dataset.renderFailed='true';runtime.webgl=false;},[]);
  return <div className="webgl-fallback">The story remains. The atmosphere rests.</div>;
}
class RenderBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<WorldFallback/>:this.props.children;}
}

function WorldClock({onAdvanceReady}:Props) {
  const advance=useThree(state=>state.advance),renderer=useThree(state=>state.gl);
  useEffect(()=>{
    onAdvanceReady(time=>renderMeasured(renderer,()=>advance(time,true)));
    return()=>{onAdvanceReady(()=>{});cleanupMeasuredRenderer(renderer);};
  },[advance,onAdvanceReady,renderer]);
  useEffect(()=>{
    const canvas=renderer.domElement;
    const lost=()=>{document.documentElement.dataset.renderFailed='true';runtime.webgl=false;};
    const restored=()=>{document.documentElement.dataset.renderFailed='false';runtime.webgl=true;};
    canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);
    return()=>{canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);};
  },[renderer]);
  return null;
}

function RenderQualityAdapter(){
  const renderer=useThree(state=>state.gl),setDpr=useThree(state=>state.setDpr),size=useThree(state=>state.size);
  const applied=useRef({tier:'',width:0,height:0,native:0});
  useFrame(()=>{
    const tier=renderQualityState.tier,native=window.devicePixelRatio||1,last=applied.current;
    if(last.tier===tier&&last.width===size.width&&last.height===size.height&&last.native===native)return;
    const profile=getRenderQuality(tier,size.width<760,native,size.width,size.height);
    renderQualityState.current=profile;setDpr(profile.dpr);renderer.transmissionResolutionScale=profile.transmissionScale;renderer.shadowMap.enabled=profile.shadow;
    Object.assign(last,{tier,width:size.width,height:size.height,native});
  },-30);
  return null;
}

function SharedAtmosphere() {
  const shadowTone=useMemo(()=>new Color(PALETTE.void),[]);
  const material=useMemo(()=>new ShaderMaterial({vertexShader:atmosphereVertex,fragmentShader:atmosphereFragment,uniforms:worldUniforms(),depthWrite:false,depthTest:false}),[]);
  useFrame(()=>{
    const state=useJourney.getState();
    uploadUniforms(material,state.params);
    if(state.reducedMotion) material.uniforms.uTime.value=0;
    const drainMix=state.scene==='DRAIN'?1:state.previousScene==='DRAIN'?1-state.params.sceneMix:0;
    material.uniforms.uColor.value.set(state.scene==='CHAINS_HOLD'?PALETTE.smoke:PALETTE.candle);
    if(state.scene==='THRESHOLD'||state.scene==='MERGE')material.uniforms.uColor.value.lerp(shadowTone,state.scene==='THRESHOLD'?.78:.64);
    if(state.scene==='DOJO')material.uniforms.uColor.value.lerp(shadowTone,.82);
    if(state.scene==='CRAFT_F4')material.uniforms.uColor.value.set(PALETTE.blood).lerp(shadowTone,.87);
    material.uniforms.uDrainMix.value=drainMix;material.uniforms.uDrainDawn.value=state.params.drainDawn*drainMix;
  },-20);
  useEffect(()=>()=>material.dispose(),[material]);
  return <mesh position={[0,0,-35]} material={material} renderOrder={-100}><planeGeometry args={[120,90]}/></mesh>;
}

export function ParticleSystem() {
  const dawnTint=useMemo(()=>new Color(PALETTE.candleDim),[]);
  const geometry=useMemo(()=>{
    const lanes=8,samples=144,count=lanes*samples;
    const geo=new BufferGeometry(),positions=new Float32Array(count*3),seeds=new Float32Array(count),along=new Float32Array(count),lane=new Float32Array(count);
    for(let i=0;i<count;i++){
      const row=Math.floor(i/samples),t=(i%samples)/(samples-1),phase=row/(lanes-1);
      positions[i*3]=(t-.5)*20;
      positions[i*3+1]=-2.25+Math.sin(t*Math.PI*1.7+phase*.6)*.48+phase*.12;
      positions[i*3+2]=-6.5-phase*5+Math.sin(t*Math.PI*2)*.25;
      seeds[i]=((i*16807+13)%997)/997;along[i]=t;lane[i]=phase;
    }
    geo.setAttribute('position',new BufferAttribute(positions,3));geo.setAttribute('aSeed',new BufferAttribute(seeds,1));geo.setAttribute('aAlong',new BufferAttribute(along,1));geo.setAttribute('aLane',new BufferAttribute(lane,1));return geo;
  },[]);
  const material=useMemo(()=>new ShaderMaterial({uniforms:{...worldUniforms(),uMoteStrength:{value:.3}},vertexShader:fogVertex,fragmentShader:fogFragment,transparent:true,depthWrite:false,blending:AdditiveBlending}),[]);
  useFrame(()=>{
    const state=useJourney.getState();uploadUniforms(material,state.params);
    geometry.setDrawRange(0,Math.floor(1152*renderQualityState.current.particleFraction));
    if(state.reducedMotion)material.uniforms.uTime.value=0;
    const inDrain=state.scene==='DRAIN'||state.previousScene==='DRAIN';
    if(inDrain)material.uniforms.uColor.value.set(PALETTE.smoke).lerp(dawnTint,state.params.drainDawn);
    else material.uniforms.uColor.value.set(state.scene==='CHAINS_HOLD'?PALETTE.smoke:PALETTE.candleDim);
    material.uniforms.uMoteStrength.value=state.scene==='OATH'?.13:state.scene==='THRESHOLD'?.24:state.scene==='MERGE'?.4:.3;
  },-19);
  useEffect(()=>()=>geometry.dispose(),[geometry]);useEffect(()=>()=>material.dispose(),[material]);
  return <points geometry={geometry} material={material} frustumCulled={false}/>;
}

/** Authored v3 vector studies; canonical prototype and hand sources remain absent. */
function InkDrawing({source,drawParam='hand',opacity=1,settled=false}:{source:string;drawParam?:'hand'|'inkFlow'|'sceneMix';opacity?:number;settled?:boolean}) {
  const strokes=useMemo(()=>svgToStrokes(source),[source]);
  useEffect(()=>{
    const id=source.match(/data-study="([^"]+)"/)?.[1]??'authored-study';
    const points=strokes.flatMap(stroke=>stroke.points),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    runtime.inkSources[id]={paths:strokes.length,revealStart:strokes[0]?.start??0,
      revealEnd:(strokes.at(-1)?.start??0)+(strokes.at(-1)?.span??0),
      bounds:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],
      widthRange:[Math.min(...strokes.map(p=>p.width)),Math.max(...strokes.map(p=>p.width))]};
  },[source,strokes]);
  return <>{strokes.map(stroke=><InkStroke key={stroke.id} path={stroke.points} width={stroke.width} pressure={stroke.pressure} seed={stroke.seed} start={stroke.start} span={stroke.span} drawParam={drawParam} opacity={opacity} settled={settled}/>)}</>;
}
function InkAccents({previous=false,legend=false}:{previous?:boolean;legend?:boolean}) {
  const compact=useThree(state=>state.size.width<760);
  return <group>
    {!legend&&<group position={compact?[1.6,-3.7,-4.5]:[4.4,-2.9,-4.5]} scale={compact?0.16:0.23}><InkDrawing source={SIGIL_SVG} opacity={0.62} settled={previous}/></group>}
    {!compact&&<group position={legend?[-1.9,1.05,-4.5]:[-2.25,-0.3,-4.5]} scale={0.14}><InkDrawing source={SLASH_SVG} drawParam={legend?'sceneMix':'hand'} opacity={0.65} settled={previous}/></group>}
  </group>;
}

function Torii({z=0}:{z?:number}) {
  return <group position={[1.3,-0.2,z]}>
    {[-2.3,2.3].map(x=><group key={x} position={[x,0,0]}><mesh><boxGeometry args={[0.25,6.8,0.35]}/><meshStandardMaterial color={PALETTE.smoke} roughness={0.9}/></mesh><mesh position={[-0.14,0,0.19]}><boxGeometry args={[0.018,6.8,0.02]}/><meshBasicMaterial color={PALETTE.candleDim}/></mesh></group>)}
    {[2.35,3.05].map((y,i)=><group key={y} position={[0,y,0]}><mesh><boxGeometry args={[i?6.2:5.3,0.22,0.55]}/><meshStandardMaterial color={PALETTE.smoke}/></mesh><mesh position={[0,-0.11,0.29]}><boxGeometry args={[i?6.2:5.3,0.025,0.02]}/><meshBasicMaterial color={PALETTE.candle} toneMapped={false}/></mesh></group>)}
    <mesh position={[0,2.7,0]}><boxGeometry args={[0.7,0.85,0.5]}/><meshStandardMaterial color={PALETTE.void} emissive={PALETTE.candleDim} emissiveIntensity={0.3}/></mesh>
  </group>;
}

function SceneGeometry({scene,previous=false}:{scene:SceneId;previous?:boolean}) {
  const commissionExploring=useJourney(state=>state.commissionExploring);
  const practiceExploring=useJourney(state=>state.practiceExploring);
  const group=useRef<Group>(null),materials=useRef<{material:Material;baseOpacity:number}[]>([]);
  useLayoutEffect(()=>{
    const unique=new Set<Material>();
    group.current?.traverse(object=>{
      const material=(object as Mesh).material;if(!material)return;
      for(const entry of Array.isArray(material)?material:[material])unique.add(entry);
    });
    materials.current=Array.from(unique,material=>({material,baseOpacity:material.opacity}));
  },[scene]);
  useFrame(()=>{
    if(!group.current)return;const p=useJourney.getState().params;const mix=previous?1-p.sceneMix:p.sceneMix;
    group.current.visible=mix>.005;
    for(const {material,baseOpacity} of materials.current){
      if(material instanceof ShaderMaterial){if(material.uniforms.uSceneMix)material.uniforms.uSceneMix.value=mix;continue;}
      material.transparent=true;material.opacity=baseOpacity*mix;
    }
  },-5);
  let content:ReactNode=null;
  switch(scene){
    case 'THRESHOLD': content=<><SummonHand previous={previous}/><MergeCeremony scene={scene} previous={previous}/><ToriiPassage previous={previous}/></>;break;
    case 'LEGEND': content=<><ToriiPassage previous={previous} passage/><MergeCeremony scene="THRESHOLD" previous={previous} carried/></>;break;
    case 'DRAIN':content=practiceExploring?<DrainField previous={previous}/>:null;break;
    case 'CRAFT_F1':case 'CRAFT_F2':case 'CRAFT_F3':case 'CRAFT_F4':content=practiceExploring?<GatesField gate={Number(scene.at(-1))} previous={previous}/>:null;break;
    case 'PURSUIT':content=<CutField scene={scene} previous={previous}/>;break;
    case 'MERGE':content=<><ReferenceHand scene={scene} previous={previous}/><MergeCeremony previous={previous}/></>;break;
    case 'FORK':case 'CHAINS_HOLD':content=<CutField scene={scene} previous={previous}/>;break;
    case 'DOJO':content=<DojoField previous={previous}/>;break;
    case 'COMMISSION':content=<><SmithyField scene={scene} previous={previous}/>{commissionExploring&&<FloatingRelics previous={previous}/>}</>;break;
    case 'OATH':content=<SmithyField scene={scene} previous={previous}/>;break;
  }
  return <group ref={group}>{content}</group>;
}

function CameraAdapter() {
  const camera=useThree(state=>state.camera);
  const key=useRef<import('three').PointLight>(null);
  useFrame(()=>{
    const state=useJourney.getState();const p=state.params;const verb=SCENES[state.scene].verb;
    camera.rotation.set(0,0,0);
    if(verb==='FALL')camera.position.set(0,-(p.depth+p.fall)*.025,8);
    else if(verb==='ENTER'){camera.position.set(p.cameraX,.15+(state.reducedMotion?0:Math.sin(p.time*8)*p.dojoWalk*.018+p.hankoImpact*.025),8+p.cameraZ);camera.rotation.set(p.dojoPitch,p.dojoYaw,0);}
    else if(state.scene==='PURSUIT'){camera.position.set(Math.sin(p.pursuit*Math.PI)*.55,0,8-p.pursuit*5);camera.rotation.z=Math.sin(p.pursuit*Math.PI)*.035;}
    else camera.position.set(0,0,8-Math.max(p.progress,p.pass)*(state.scene.startsWith('CRAFT')?4:0));
    runtime.cameraRotation=[camera.rotation.x,camera.rotation.y,camera.rotation.z];
    if(key.current)key.current.intensity=3*p.lightIntensity;
  },-25);
  return <><ambientLight color={PALETTE.bone} intensity={.35}/><pointLight ref={key} color={PALETTE.candle} position={[2,3,5]} intensity={3} distance={45}/><hemisphereLight color={PALETTE.bone} groundColor={PALETTE.void} intensity={.22}/></>;
}

function GlobalGrade() {
  const chroma=useRef<ChromaticAberrationEffect>(null),bloom=useRef<BloomEffect>(null);const offset=useMemo(()=>new Vector2(),[]);
  const pageSlice=useMemo(()=>new PageSliceEffect(),[]);
  const renderer=useThree(state=>state.gl),size=useThree(state=>state.size),dpr=useThree(state=>state.viewport.dpr);
  const bloomSize=useRef({width:0,height:0,scale:0}),bufferSize=useMemo(()=>new Vector2(),[]);
  useEffect(()=>{bloomSize.current.scale=0;},[size.width,size.height,dpr]);
  useEffect(()=>{runtime.composerMounts++;return()=>{runtime.composerMounts--;};},[]);
  useEffect(()=>()=>pageSlice.dispose(),[pageSlice]);
  useFrame(()=>{
    const s=useJourney.getState(),p=s.params,flare=s.scene==='MERGE'&&!s.reducedMotion?p.flash:0;
    const profile=s.scene==='DOJO'?[.29,.9]:s.scene==='OATH'?[.2,.94]:s.scene==='COMMISSION'?[.32,.88]:s.scene==='DRAIN'?[.48+p.drainDawn*.13,.73]:s.scene==='MERGE'?[.65,.65]:s.scene==='PURSUIT'?[.6,.68]:[.4,.79];
    const intensity=profile[0]+flare*1.55,shift=p.chromaOffset*(s.scene==='MERGE'?1:.32)+flare*.0012;
    if(bloom.current){
      bloom.current.intensity=intensity;const luminance=bloom.current.luminancePass.fullscreenMaterial as LuminanceMaterial;luminance.threshold=profile[1]-flare*.1;luminance.smoothing=.24;
      renderer.getDrawingBufferSize(bufferSize);const scale=renderQualityState.current.bloomResolution,last=bloomSize.current;
      if(last.width!==bufferSize.x||last.height!==bufferSize.y||last.scale!==scale){
        const width=Math.max(1,Math.round(bufferSize.x*scale)),height=Math.max(1,Math.round(bufferSize.y*scale));
        bloom.current.luminancePass.setSize(width,height);bloom.current.mipmapBlurPass.setSize(width,height);
        Object.assign(last,{width:bufferSize.x,height:bufferSize.y,scale});
      }
    }
    chroma.current?.offset.set(shift,shift*.45);runtime.grade.bloom=intensity;runtime.grade.chroma=shift;
    pageSlice.setPose(s.scene==='MERGE'&&!s.reducedMotion,p.ceremonyTime,size.width/Math.max(1,size.height));
  },-2);
  return <EffectComposer multisampling={2} enableNormalPass={false}>
    <Bloom ref={bloom} luminanceThreshold={.6} luminanceSmoothing={.4} intensity={.75} mipmapBlur/>
    <Vignette eskil={false} offset={.25} darkness={.75}/>
    <Noise opacity={.018} blendFunction={BlendFunction.SOFT_LIGHT}/>
    <ChromaticAberration ref={chroma} offset={offset} radialModulation={false} modulationOffset={.15}/>
    <primitive object={pageSlice} dispose={null}/>
  </EffectComposer>;
}

function World({onAdvanceReady}:Props) {
  const renderer=useThree(state=>state.gl);
  const scene=useJourney(state=>state.scene);const previous=useJourney(state=>state.previousScene);
  useEffect(()=>{runtime.canvasMounts++;return()=>{runtime.canvasMounts--;runtime.webgl=false;releaseCeremonyStudio(renderer);};},[renderer]);
  return <><WorldClock onAdvanceReady={onAdvanceReady}/><RenderQualityAdapter/><CameraAdapter/><SharedAtmosphere/><LightShafts/><AtmosphericSmoke/><ParticleSystem/>
    {previous&&previous!==scene&&<SceneGeometry key={`previous-${previous}`} scene={previous} previous/>}
    <SceneGeometry key={scene} scene={scene}/><GlobalGrade/>
  </>;
}

export default function WorldCanvas({onAdvanceReady}:Props) {
  const initialDpr=useMemo(()=>typeof window==='undefined'?1:getRenderQuality(innerWidth<760?'balanced':'cinematic',innerWidth<760,devicePixelRatio,innerWidth,innerHeight).dpr,[]);
  return <div className="world-canvas" aria-hidden="true"><RenderBoundary><Canvas frameloop="never" shadows={{type:PCFShadowMap}} dpr={initialDpr} camera={{fov:45,near:.1,far:150,position:[0,0,8]}} gl={{antialias:false,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.debug.checkShaderErrors=process.env.NODE_ENV!=='production';gl.setClearColor(new Color(PALETTE.void),1);runtime.webgl=true;document.documentElement.dataset.renderFailed='false';}} fallback={<WorldFallback/>}><World onAdvanceReady={onAdvanceReady}/></Canvas></RenderBoundary></div>;
}
