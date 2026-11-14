'use client';
import dynamic from 'next/dynamic';
import { useCallback,useEffect,useRef,useState } from 'react';
import { SCENES } from '../core/config';
import { startEngine,type EngineHandle } from '../core/engine';
import { navigate,resetJourney } from '../core/director';
import { useJourney,runtime } from '../core/world';
import { useParam } from '../core/params';
import { soundDirector } from '../core/sound';
import SceneDirector,{StoryboardStrip} from './SceneDirector';
import CursorGhost from '../systems/CursorGhost';
const WorldCanvas=dynamic(()=>import('../world/WorldCanvas'),{ssr:false,loading:()=>null});

function Receipt(){
  useParam('time');
  const s=useJourney();
  const [payload,setPayload]=useState<Record<string,unknown>|null>(null);
  useEffect(()=>{fetch('/foundation-receipt.json').then(r=>r.json()).then(setPayload).catch(()=>{});},[]);
  return <details className="receipt-drawer"><summary>Receipt :: 証 <span>{s.swordMoments.length} sword moments</span></summary>
    <div className="receipt-panel"><div className="receipt-title">BUILT BY GHOST HANDS<span>V3 THE INK / LOCAL</span></div>
      <dl><dt>Clock owners / Canvas / grade</dt><dd>{runtime.heartbeatOwners} / {runtime.canvasMounts} / {runtime.composerMounts}</dd>
      <dt>Observed GSAP heartbeat</dt><dd>{runtime.fps?`${runtime.fps.toFixed(1)} ticks/s`:'Sampling'} · this browser</dd>
      <dt>Fog param → GPU uniform</dt><dd>{s.params.fogDensity.toFixed(3)} → {runtime.fogUniform.toFixed(3)}</dd>
      <dt>Live ink strokes / ribbon vertices / tip seeds</dt><dd>{runtime.ink.instances} / {runtime.ink.ribbonVertices} / {runtime.ink.tipParticles}</dd>
      <dt>Ink bleed / pressure uniforms</dt><dd>{runtime.ink.bleedUniform.toFixed(2)} / {runtime.ink.pressureUniform.toFixed(2)}</dd>
      <dt>Sword moments visited</dt><dd>{s.swordMoments.join(' · ')||'None yet'}</dd><dt>Shing cues accepted / cap</dt><dd>{s.shingCount} / 3</dd>
      <dt>Trackers / external media</dt><dd>0 / 0 · source and network checked</dd><dt>Production payload</dt><dd>{payload?.measured?'See export measurement below':'Not yet measured in this session'}</dd></dl>
      <p className="receipt-small">Heartbeat rate is observed here, not a desktop or mobile GPU benchmark. Geometry, hand paths, media, audio tones, and offering copy are temporary fixtures.</p>
      <a href="/foundation-receipt.json" target="_blank" rel="noreferrer">Read payload measurement ↗</a>
      <p className="receipt-small">Replay starts a new journey, clears commitments and counters, and replays both local clocks. Branch changes preserve them. Review choices D08–D14 remain provisional.</p>
      <button onClick={resetJourney}>Replay from the threshold ↺</button>
    </div></details>;
}
export default function Foundation(){
  const root=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null),engine=useRef<EngineHandle|null>(null);
  const advance=useRef<(t:number)=>void>(()=>{});
  const state=useJourney();
  const [soundError,setSoundError]=useState('');
  const onAdvanceReady=useCallback((fn:(t:number)=>void)=>{advance.current=fn;engine.current?.setAdvance(fn);},[]);
  useEffect(()=>{
    if(!root.current||!stage.current)return;
    engine.current=startEngine(root.current,stage.current);engine.current.setAdvance(advance.current);
    return()=>{engine.current?.destroy();engine.current=null;};
  },[]);
  useEffect(()=>{
    const heading=root.current?.querySelector<HTMLElement>('.current-shell h1,.current-shell h2');
    if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
  },[state.scene,state.resetVersion]);
  const setSound=async()=>{try{await soundDirector.enable(!state.soundEnabled);setSoundError('');}catch{setSoundError('Audio unavailable in this browser. The journey remains silent.');}};
  const scene=SCENES[state.scene];
  return <div ref={root} className="foundation-root" data-scene={state.scene} data-reduced={state.reducedMotion}>
    <a href="#journey" className="skip-link">Enter the story</a>
    <div className="world-canvas" aria-hidden="true"><WorldCanvas onAdvanceReady={onAdvanceReady}/></div>
    <div className="world-vignette" aria-hidden="true"/>
    <header className="world-header"><a className="wordmark" href="#journey" aria-label="Ghost Hand Studio"><span className="wordmark-glyph">手</span><span>GHOST HAND<small>STUDIO / SOVEREIGN CRAFT</small></span></a>
      <span className="local-edition">INCANTATION III <b>•</b> THE INK</span>
      <button className="sound-toggle" onClick={setSound} aria-pressed={state.soundEnabled}>Sound :: 響 <span>{state.soundEnabled?'ON':'OFF'}</span></button>
    </header>
    <div id="journey" ref={stage} className="journey-stage">
      <main className="journey-content" tabIndex={-1}>
        <div className="scene-register"><span>{scene.index} / {scene.verb}</span><span>{scene.title}</span><span className="register-kanji">{scene.glyph}</span></div>
        {state.previousScene&&<div className="previous-shell" aria-hidden="true" inert><SceneDirector sceneOverride={state.previousScene}/></div>}
        <div className="current-shell" data-lenis-prevent><SceneDirector key={state.scene}/></div>
      </main>
      <div className="journey-bottom"><span className="journey-progress">{state.scene==='THRESHOLD'?'A SIGNAL IN THE VOID.':state.scene==='CHAINS_HOLD'?'THE DOOR REMAINS OPEN.':'OWN THE INSTRUMENT. SHAPE THE SIGNAL.'}</span>
        {state.navUnlocked&&<nav className="path-navigation" aria-label="Persistent paths"><button onClick={()=>navigate('DOJO')} aria-current={state.scene==='DOJO'?'page':undefined}>道 <span>Dojo</span></button><button onClick={()=>navigate('COMMISSION')} aria-current={state.scene==='COMMISSION'?'page':undefined}>代 <span>Commission</span></button></nav>}
      </div>
    </div>
    {state.reducedMotion&&<div className="reduced-strip"><p className="reduced-notice">Stillness is a way through. Your motion preference is respected; all paths and controls remain available.</p><StoryboardStrip/></div>}
    <aside className="compositor-proof"><details><summary>Compositor :: 霧</summary><div className="proof-controls"><div className="proof-channel"><label htmlFor="fog-proof">Fog density</label><input id="fog-proof" type="range" min="0.05" max="1" step="0.01" defaultValue="0.36" onChange={event=>window.__GH_DEBUG?.setFog(Number(event.target.value))}/></div><div className="proof-channel"><label htmlFor="ink-bleed">Wet bleed</label><input id="ink-bleed" type="range" min="0" max="1.5" step="0.05" defaultValue="1" onChange={event=>window.__GH_DEBUG?.setInk({bleed:Number(event.target.value)})}/></div><div className="proof-channel"><label htmlFor="ink-pressure">Ink pressure</label><input id="ink-pressure" type="range" min="0.5" max="1.5" step="0.05" defaultValue="1" onChange={event=>window.__GH_DEBUG?.setInk({pressure:Number(event.target.value)})}/></div><span>GSAP → shared uniforms / local material study</span></div></details></aside>
    <footer className="foundation-footer"><span>GHOSTHAND.STUDIO <i>/</i> V3 · LOCAL</span><Receipt/></footer>
    <div className="ceremonial-flash" aria-hidden="true"/><div className="ceremonial-cut" aria-hidden="true"/>
    <CursorGhost/>
    <p className="sr-only" role="status">{soundError}</p>
    <noscript>Ghost Hand’s interactive foundation requires JavaScript. No form data is collected. Contact hello@ghosthand.studio.</noscript>
  </div>;
}
