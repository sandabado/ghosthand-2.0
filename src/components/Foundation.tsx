'use client';
import dynamic from 'next/dynamic';
import { useCallback,useEffect,useLayoutEffect,useRef,useState } from 'react';
import { startEngine,type EngineHandle } from '../core/engine';
import { goHome,navigate,returnToStory } from '../core/director';
import { useJourney } from '../core/world';
import { soundDirector } from '../core/sound';
import SceneDirector,{StoryboardStrip} from './SceneDirector';
import CursorGhost from '../systems/CursorGhost';
import JourneyGuide from './JourneyGuide';
import Receipt from './Receipt';
import WorkMenu from './WorkMenu';
function CanvasUnavailable(){
  useEffect(()=>{document.documentElement.dataset.renderFailed='true';},[]);
  return null;
}
const WorldCanvas=dynamic<{onAdvanceReady:(advance:(time:number)=>void)=>void}>(()=>import('../world/WorldCanvas').catch(()=>({default:CanvasUnavailable})),{ssr:false,loading:()=>null});

function SoundControl(){
  const enabled=useJourney(s=>s.soundEnabled);
  const [error,setError]=useState('');
  const setSound=async()=>{
    try{await soundDirector.enable(!useJourney.getState().soundEnabled);setError('');}
    catch{setError('Audio unavailable in this browser. The journey remains silent.');}
  };
  return <><button className="sound-toggle" onClick={setSound} aria-pressed={enabled}>Sound :: 響 <span>{enabled?'ON':'OFF'}</span></button><p className="sr-only" role="status">{error}</p></>;
}

function PathNavigation(){
  const unlocked=useJourney(s=>s.navUnlocked),scene=useJourney(s=>s.scene),canReturn=useJourney(s=>s.navigationStack.length>0);
  if(!unlocked)return null;
  return <nav className="path-navigation" aria-label="Studio navigation"><WorkMenu/><button onClick={()=>navigate('COMMISSION')} aria-current={scene==='COMMISSION'?'page':undefined}><span>Start a project</span></button>{canReturn&&<button type="button" className="story-return" onClick={returnToStory}>Return to story <span aria-hidden="true">↩</span></button>}</nav>;
}

export default function Foundation(){
  const root=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null),engine=useRef<EngineHandle|null>(null);
  const advance=useRef<(t:number)=>void>(()=>{});
  const scene=useJourney(s=>s.scene),previousScene=useJourney(s=>s.previousScene);
  const reducedMotion=useJourney(s=>s.reducedMotion),resetVersion=useJourney(s=>s.resetVersion);
  const focusedScene=useRef({scene,resetVersion});
  const onAdvanceReady=useCallback((fn:(t:number)=>void)=>{advance.current=fn;engine.current?.setAdvance(fn);},[]);
  useEffect(()=>{
    if(!root.current||!stage.current)return;
    engine.current=startEngine(root.current,stage.current);engine.current.setAdvance(advance.current);
    return()=>{engine.current?.destroy();engine.current=null;};
  },[]);
  useLayoutEffect(()=>{
    if(focusedScene.current.scene===scene&&focusedScene.current.resetVersion===resetVersion)return;
    focusedScene.current={scene,resetVersion};
    const heading=root.current?.querySelector<HTMLElement>('.current-shell h1,.current-shell h2');
    if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
  },[scene,resetVersion]);
  return <div ref={root} className="foundation-root" data-scene={scene} data-reduced={reducedMotion}>
    <a href="#journey" className="skip-link" onClick={event=>{event.preventDefault();const heading=root.current?.querySelector<HTMLElement>('.current-shell h1,.current-shell h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}}>Enter the story</a>
    <div className="world-canvas" aria-hidden="true"><WorldCanvas onAdvanceReady={onAdvanceReady}/></div>
    <div className="world-vignette" aria-hidden="true"/>
    <header className="world-header"><a className="wordmark" href="#home" onClick={event=>{event.preventDefault();goHome();}} aria-label="Ghost Hand Studio — Home"><span className="wordmark-glyph">手</span><span>GHOST HAND<small>STUDIO</small></span></a><SoundControl/></header>
    <div id="journey" ref={stage} className="journey-stage">
      <main className="journey-content" tabIndex={-1}>
        {previousScene&&<div className="previous-shell" aria-hidden="true" inert><SceneDirector sceneOverride={previousScene}/></div>}
        <div key={`${scene}-${resetVersion}`} className="current-shell" data-lenis-prevent><SceneDirector sceneOverride={scene}/></div>
      </main>
      <div className="journey-bottom"><JourneyGuide/><PathNavigation/></div>
    </div>
    {reducedMotion&&<div className="reduced-strip"><p className="reduced-notice">Stillness is a way through. Your motion preference is respected; all paths and controls remain available.</p><StoryboardStrip/></div>}
    <footer className="foundation-footer"><Receipt/></footer>
    <div className="ceremonial-flash" aria-hidden="true"/>
    <CursorGhost/>
    <noscript>Ghost Hand’s interactive foundation requires JavaScript. No form data is collected. Contact hello@ghosthand.studio.</noscript>
  </div>;
}
