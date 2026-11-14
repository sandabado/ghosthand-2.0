'use client';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ChromaticAberrationEffect } from 'postprocessing';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, Material, Mesh, ShaderMaterial, Vector2 } from 'three';
import { InkStroke } from '../systems/InkStroke';
import DrainField from '../systems/drain/DrainField';
import GatesField from '../systems/gates/GatesField';
import { svgToStrokes } from '../systems/ink/geometry';
import { HAND_SVG,SIGIL_SVG,SLASH_SVG } from '../systems/ink/sources';
import { PALETTE, SCENES, type SceneId } from '../core/config';
import { runtime, useJourney } from '../core/world';
import { atmosphereFragment, atmosphereVertex, fogFragment, fogVertex, scrollFragment, uploadUniforms, worldUniforms } from './shaders';

type Advance=(timeSeconds:number)=>void;
interface Props { onAdvanceReady:(advance:Advance)=>void; }

function WorldClock({onAdvanceReady}:Props) {
  const advance=useThree(state=>state.advance);
  useEffect(()=>{
    onAdvanceReady(time=>advance(time,true));
    return()=>onAdvanceReady(()=>{});
  },[advance,onAdvanceReady]);
  return null;
}

function SharedAtmosphere() {
  const material=useMemo(()=>new ShaderMaterial({vertexShader:atmosphereVertex,fragmentShader:atmosphereFragment,uniforms:worldUniforms(),depthWrite:false,depthTest:false}),[]);
  useFrame(()=>{
    const state=useJourney.getState();
    uploadUniforms(material,state.params);
    if(state.reducedMotion) material.uniforms.uTime.value=0;
    const drainMix=state.scene==='DRAIN'?1:state.previousScene==='DRAIN'?1-state.params.sceneMix:0;
    material.uniforms.uColor.value.set(state.scene==='CHAINS_HOLD'?PALETTE.smoke:PALETTE.candle);
    material.uniforms.uDrainMix.value=drainMix;material.uniforms.uDrainDawn.value=state.params.drainDawn*drainMix;
  },-20);
  useEffect(()=>()=>material.dispose(),[material]);
  return <mesh position={[0,0,-35]} material={material} renderOrder={-100}><planeGeometry args={[120,90]}/></mesh>;
}

export function ParticleSystem() {
  const dawnTint=useMemo(()=>new Color(PALETTE.candleDim),[]);
  const geometry=useMemo(()=>{
    const geo=new BufferGeometry();const positions=new Float32Array(540*3);const seeds=new Float32Array(540);
    for(let i=0;i<540;i++){
      const seed=((i*16807+13)%2147483647)/2147483647;
      positions[i*3]=Math.sin(i*12.9898)*14;
      positions[i*3+1]=Math.sin(i*4.1414)*6;
      positions[i*3+2]=-2-Math.abs(Math.cos(i*1.718))*26;
      seeds[i]=(seed*9131)%1;
    }
    geo.setAttribute('position',new BufferAttribute(positions,3));geo.setAttribute('aSeed',new BufferAttribute(seeds,1));return geo;
  },[]);
  const material=useMemo(()=>new ShaderMaterial({uniforms:worldUniforms(),vertexShader:fogVertex,fragmentShader:fogFragment,transparent:true,depthWrite:false,blending:AdditiveBlending}),[]);
  useFrame(()=>{
    const state=useJourney.getState();uploadUniforms(material,state.params);
    if(state.reducedMotion)material.uniforms.uTime.value=0;
    const inDrain=state.scene==='DRAIN'||state.previousScene==='DRAIN';
    if(inDrain)material.uniforms.uColor.value.set(PALETTE.smoke).lerp(dawnTint,state.params.drainDawn);
    else material.uniforms.uColor.value.set(state.scene==='CHAINS_HOLD'?PALETTE.smoke:PALETTE.candleDim);
  },-19);
  useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
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
function GhostHand({settled=false}:{settled?:boolean}) {
  const group=useRef<Group>(null);
  const compact=useThree(state=>state.size.width<760);
  useFrame(()=>{if(group.current)group.current.visible=settled||useJourney.getState().params.hand>0;},-17);
  return <group ref={group} position={compact?[0.7,-1.8,-6]:[3.05,-0.3,-5]} scale={compact?1.05:1.45}>
    <InkDrawing source={HAND_SVG} settled={settled}/>
  </group>;
}
function InkAccents({previous=false,legend=false}:{previous?:boolean;legend?:boolean}) {
  const compact=useThree(state=>state.size.width<760);
  return <group>
    {!legend&&<group position={compact?[1.6,-3.7,-4.5]:[4.4,-2.9,-4.5]} scale={compact?0.16:0.23}><InkDrawing source={SIGIL_SVG} opacity={0.62} settled={previous}/></group>}
    {!compact&&<group position={legend?[-1.9,1.05,-4.5]:[-2.25,-0.3,-4.5]} scale={0.14}><InkDrawing source={SLASH_SVG} drawParam={legend?'sceneMix':'hand'} opacity={0.65} settled={previous}/></group>}
  </group>;
}

function Sword({sheathed=false,handover=false}:{sheathed?:boolean;handover?:boolean}) {
  const ref=useRef<Group>(null);
  useFrame(()=>{
    if(!ref.current)return;const {scene,params:p}=useJourney.getState();
    ref.current.visible=scene==='PURSUIT'||scene==='COMMISSION'||scene==='OATH'||p.sword>0;
    ref.current.position.set(scene==='PURSUIT'?Math.sin(p.pursuit*Math.PI)*2:2.4,scene==='MERGE'?4.5-p.sword*6:scene==='THRESHOLD'?1.7:0,-5);
    ref.current.rotation.set(handover?Math.PI/2.5:0,0,sheathed?-Math.PI/2.25:scene==='PURSUIT'?-1.05:-0.12);
    ref.current.scale.setScalar(scene==='THRESHOLD'?0.46:1);
  },-14);
  return <group ref={ref}>
    <mesh position={[0,0.15,0]}><boxGeometry args={[sheathed?0.105:0.038,2.8,sheathed?0.11:0.022]}/><meshStandardMaterial color={sheathed?PALETTE.candleDim:PALETTE.bone} emissive={sheathed?PALETTE.void:PALETTE.candle} emissiveIntensity={sheathed?0:0.65} metalness={0.8} roughness={0.3}/></mesh>
    {!sheathed&&<mesh position={[0.027,0.15,0.018]}><boxGeometry args={[0.007,2.8,0.01]}/><meshBasicMaterial color={PALETTE.candle} toneMapped={false}/></mesh>}
    <mesh position={[0,-1.35,0]}><boxGeometry args={[0.46,0.06,0.14]}/><meshStandardMaterial color={PALETTE.bone} metalness={0.9} roughness={0.6}/></mesh>
    <mesh position={[0,-1.78,0]}><boxGeometry args={[0.105,0.75,0.1]}/><meshStandardMaterial color={PALETTE.smoke} roughness={0.9}/></mesh>
    {Array.from({length:7},(_,i)=><mesh key={i} position={[0,-1.48-i*0.095,0.052]} rotation={[0,0,0.4]}><boxGeometry args={[0.115,0.025,0.015]}/><meshBasicMaterial color={PALETTE.candleDim}/></mesh>)}
  </group>;
}

function Torii({z=0}:{z?:number}) {
  return <group position={[1.3,-0.2,z]}>
    {[-2.3,2.3].map(x=><group key={x} position={[x,0,0]}><mesh><boxGeometry args={[0.25,6.8,0.35]}/><meshStandardMaterial color={PALETTE.smoke} roughness={0.9}/></mesh><mesh position={[-0.14,0,0.19]}><boxGeometry args={[0.018,6.8,0.02]}/><meshBasicMaterial color={PALETTE.candleDim}/></mesh></group>)}
    {[2.35,3.05].map((y,i)=><group key={y} position={[0,y,0]}><mesh><boxGeometry args={[i?6.2:5.3,0.22,0.55]}/><meshStandardMaterial color={PALETTE.smoke}/></mesh><mesh position={[0,-0.11,0.29]}><boxGeometry args={[i?6.2:5.3,0.025,0.02]}/><meshBasicMaterial color={PALETTE.candle} toneMapped={false}/></mesh></group>)}
    <mesh position={[0,2.7,0]}><boxGeometry args={[0.7,0.85,0.5]}/><meshStandardMaterial color={PALETTE.void} emissive={PALETTE.candleDim} emissiveIntensity={0.3}/></mesh>
  </group>;
}

function ChainsRoom() {
  return <group>
    <mesh position={[1,0,-10]}><boxGeometry args={[20,12,.3]}/><meshStandardMaterial color={PALETTE.smoke} roughness={1}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-3,-2]}><planeGeometry args={[45,40]}/><meshStandardMaterial color={PALETTE.smoke} roughness={.85}/></mesh>
    {[-6,-3,4.8,7.8].map((x,i)=><group key={x} position={[x,-.3,-5-(i%2)*2]}><mesh><boxGeometry args={[1.5,5.4,2]}/><meshStandardMaterial color={PALETTE.void} metalness={.4} roughness={.8}/></mesh>{Array.from({length:8},(_,j)=><mesh key={j} position={[0,j*.5-1.6,1.01]}><boxGeometry args={[1.2,.025,.01]}/><meshBasicMaterial color={PALETTE.enemy}/></mesh>)}</group>)}
    <group position={[1.2,-.5,-9.8]}><mesh><boxGeometry args={[2.2,5.1,.1]}/><meshBasicMaterial color={PALETTE.void}/></mesh><Line points={[[-1.1,-2.55,.08],[-1.1,2.55,.08],[1.1,2.55,.08],[1.1,-2.55,.08]]} color={PALETTE.candle} lineWidth={1.5}/><pointLight position={[0,0,1]} color={PALETTE.candle} intensity={4} distance={10}/></group>
  </group>;
}

function ShaderScroll({index,position}:{index:number;position:[number,number,number]}) {
  const selected=useJourney(state=>state.selectedMember);
  const material=useMemo(()=>{const m=new ShaderMaterial({uniforms:worldUniforms(),vertexShader:atmosphereVertex,fragmentShader:scrollFragment,transparent:true});m.uniforms.uVariant.value=index;return m;},[index]);
  useFrame(()=>{const state=useJourney.getState();uploadUniforms(material,state.params);if(state.reducedMotion)material.uniforms.uTime.value=0;},-15);
  useEffect(()=>()=>material.dispose(),[material]);
  return <group position={position}>
    <mesh position={[0,1.9,0]}><boxGeometry args={[2.05,.07,.12]}/><meshStandardMaterial color={PALETTE.bone} roughness={.8}/></mesh>
    <mesh material={material}><planeGeometry args={[1.95,3.6]}/></mesh>
    <mesh position={[0,-1.9,0]}><boxGeometry args={[2.05,.09,.14]}/><meshStandardMaterial color={PALETTE.bone}/></mesh>
    <Line points={[[-.78,1.94,0],[-.78,4,0],[.78,4,0],[.78,1.94,0]]} color={PALETTE.candleDim} lineWidth={.5}/>
    {selected===index&&<pointLight position={[0,0,1]} color={PALETTE.candle} intensity={1} distance={5}/>}
  </group>;
}

function DojoRoom() {
  return <group>
    <gridHelper args={[40,40,PALETTE.candleDim,PALETTE.smoke]} position={[0,-2.6,-6]}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-2.65,-6]}><planeGeometry args={[40,40]}/><meshStandardMaterial color={PALETTE.void} metalness={.3} roughness={.85}/></mesh>
    {Array.from({length:6},(_,i)=><ShaderScroll key={i} index={i} position={[(i%3-1)*3.25,(i<3?0:.4),i<3?-5.5:-12]}/>)}
    <Torii z={-18}/>
    <mesh position={[0,-2,-1]}><cylinderGeometry args={[1.1,1.25,.4,8]}/><meshStandardMaterial color={PALETTE.smoke} roughness={.95}/></mesh>
  </group>;
}

function SceneGeometry({scene,previous=false}:{scene:SceneId;previous?:boolean}) {
  const group=useRef<Group>(null);const baseOpacity=useRef(new WeakMap<Material,number>());
  useFrame(()=>{
    if(!group.current)return;const p=useJourney.getState().params;const mix=previous?1-p.sceneMix:p.sceneMix;
    group.current.visible=mix>.005;
    group.current.traverse(object=>{
      const mesh=object as Mesh;if(!mesh.material)return;
      const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
      materials.forEach(material=>{
        if(material instanceof ShaderMaterial){if(material.uniforms.uSceneMix)material.uniforms.uSceneMix.value=mix;return;}
        if(!baseOpacity.current.has(material))baseOpacity.current.set(material,material.opacity);
        material.transparent=true;material.opacity=(baseOpacity.current.get(material)??1)*mix;
      });
    });
  },-5);
  let content:ReactNode=null;
  switch(scene){
    case 'THRESHOLD':case 'MERGE': content=<><GhostHand settled={previous}/><InkAccents previous={previous}/>{!previous&&<Sword/>}</>;break;
    case 'LEGEND': content=<><InkAccents previous={previous} legend/><group position={[2,0,-6]}>{[-1,1].map(x=><group key={x} position={[x*1.35,0,0]}><mesh><boxGeometry args={[2.2,3.7,.12]}/><meshStandardMaterial color={PALETTE.void} emissive={PALETTE.candleDim} emissiveIntensity={.12}/></mesh><Line points={[[-1.1,-1.85,.08],[-1.1,1.85,.08],[1.1,1.85,.08],[1.1,-1.85,.08]]} color={PALETTE.candleDim} lineWidth={.5}/></group>)}<Line points={[[0,-2.4,.1],[0,2.4,.1]]} color={PALETTE.candle} lineWidth={.8}/></group></>;break;
    case 'DRAIN':content=<DrainField previous={previous}/>;break;
    case 'CRAFT_F1':case 'CRAFT_F2':case 'CRAFT_F3':case 'CRAFT_F4':content=<GatesField gate={Number(scene.at(-1))} previous={previous}/>;break;
    case 'PURSUIT':content=<>{[-14,-29,-44].map(z=><Torii key={z} z={z}/>)}{!previous&&<Sword/>}</>;break;
    case 'FORK':content=<group position={[0,0,-8]}><Line points={[[0,-5,0],[0,5,0]]} color={PALETTE.candle} lineWidth={1}/><mesh position={[-5,0,-1]}><planeGeometry args={[9,14]}/><meshBasicMaterial color={PALETTE.candleDim} transparent opacity={.045}/></mesh><mesh position={[5,0,-1]}><planeGeometry args={[9,14]}/><meshBasicMaterial color={PALETTE.enemy} transparent opacity={.16}/></mesh></group>;break;
    case 'CHAINS_HOLD':content=<ChainsRoom/>;break;
    case 'DOJO':content=<DojoRoom/>;break;
    case 'COMMISSION':content=<><mesh position={[2,-2.1,-5]}><boxGeometry args={[4.5,.6,3]}/><meshStandardMaterial color={PALETTE.smoke} roughness={.95}/></mesh><mesh position={[2,-.4,-6]}><planeGeometry args={[3.8,3.2]}/><meshStandardMaterial color={PALETTE.bone} roughness={1}/></mesh>{!previous&&<Sword handover/>}</>;break;
    case 'OATH':content=<><mesh position={[2,-1.9,-5]}><boxGeometry args={[4,.18,1.6]}/><meshStandardMaterial color={PALETTE.smoke} roughness={.8}/></mesh>{!previous&&<Sword sheathed/>}</>;break;
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
    else if(verb==='ENTER'){camera.position.set(p.cameraX,.15,8+p.cameraZ);camera.rotation.y=p.pointerX*.05;}
    else if(state.scene==='PURSUIT'){camera.position.set(Math.sin(p.pursuit*Math.PI)*.55,0,8-p.pursuit*5);camera.rotation.z=Math.sin(p.pursuit*Math.PI)*.035;}
    else camera.position.set(0,0,8-Math.max(p.progress,p.pass)*(state.scene.startsWith('CRAFT')?4:0));
    runtime.cameraRotation=[camera.rotation.x,camera.rotation.y,camera.rotation.z];
    if(key.current)key.current.intensity=3*p.lightIntensity;
  },-25);
  return <><ambientLight color={PALETTE.bone} intensity={.35}/><pointLight ref={key} color={PALETTE.candle} position={[2,3,5]} intensity={3} distance={45}/><hemisphereLight color={PALETTE.bone} groundColor={PALETTE.void} intensity={.22}/></>;
}

function GlobalGrade() {
  const chroma=useRef<ChromaticAberrationEffect>(null);const offset=useMemo(()=>new Vector2(),[]);
  useEffect(()=>{runtime.composerMounts++;return()=>{runtime.composerMounts--;};},[]);
  useFrame(()=>{const p=useJourney.getState().params;chroma.current?.offset.set(p.chromaOffset,p.chromaOffset*.45);},-2);
  return <EffectComposer multisampling={2} enableNormalPass={false}>
    <Bloom luminanceThreshold={.6} luminanceSmoothing={.4} intensity={.75} mipmapBlur/>
    <Vignette eskil={false} offset={.25} darkness={.75}/>
    <Noise opacity={.035} blendFunction={BlendFunction.SOFT_LIGHT}/>
    <ChromaticAberration ref={chroma} offset={offset} radialModulation={false} modulationOffset={.15}/>
  </EffectComposer>;
}

function World({onAdvanceReady}:Props) {
  const scene=useJourney(state=>state.scene);const previous=useJourney(state=>state.previousScene);
  useEffect(()=>{runtime.canvasMounts++;return()=>{runtime.canvasMounts--;runtime.webgl=false;};},[]);
  return <><WorldClock onAdvanceReady={onAdvanceReady}/><CameraAdapter/><SharedAtmosphere/><ParticleSystem/>
    {previous&&previous!==scene&&<SceneGeometry key={`previous-${previous}`} scene={previous} previous/>}
    <SceneGeometry key={scene} scene={scene}/><GlobalGrade/>
  </>;
}

export default function WorldCanvas({onAdvanceReady}:Props) {
  return <div className="world-canvas" aria-hidden="true"><Canvas frameloop="never" dpr={[1,1.5]} camera={{fov:45,near:.1,far:150,position:[0,0,8]}} gl={{antialias:false,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.setClearColor(new Color(PALETTE.void),1);runtime.webgl=true;}} fallback={<div className="webgl-fallback">The story remains. The atmosphere rests.</div>}><World onAdvanceReady={onAdvanceReady}/></Canvas></div>;
}
