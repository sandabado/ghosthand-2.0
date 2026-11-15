'use client';
import { useEffect,useRef,useSyncExternalStore,type MouseEvent } from 'react';
import dynamic from 'next/dynamic';
import { commitSummon } from '../core/director';
import { useJourney } from '../core/world';

const StillHeldSword=dynamic(()=>import('./StillHeldSword'),{ssr:false});
const renderFailed=()=>document.documentElement.dataset.renderFailed==='true';
const renderAvailable=()=>false;
const watchRenderFailure=(notify:()=>void)=>{
  const observer=new MutationObserver(notify);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-render-failed']});
  return()=>observer.disconnect();
};

/** P01 is a command: guide the fingertip, then deliberately receive the blade. */
export default function ThresholdScene(){
  const phase=useJourney(state=>state.thresholdPhase),pointer=useRef('mouse');
  const reduced=useJourney(state=>state.reducedMotion),failed=useSyncExternalStore(watchRenderFailure,renderFailed,renderAvailable);
  const fallback=reduced||failed,params=useJourney.getState().params;
  useEffect(()=>{if(fallback)void import('./StillHeldSword').catch(()=>{});},[fallback]);
  const summon=(event:MouseEvent<HTMLButtonElement>)=>{
    const source=event.detail===0?'keyboard':pointer.current==='touch'?'touch':'pointer';
    const target=source==='touch'?[event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2] as const:undefined;
    commitSummon(source,target);
  };
  return <div className="summon-entry" data-phase={phase}>
    <h1 className="sr-only">Summon Ghost Hand Studio</h1>
    <button type="button" className="summon-trigger" aria-label="Summon" aria-describedby="summon-help" disabled={phase!=='pointing'}
      onPointerDown={event=>{pointer.current=event.pointerType;}} onClick={summon}>
      <span className="summon-word" aria-hidden="true">summon<span className="summon-caret">_</span></span>
    </button>
    <p id="summon-help" className="sr-only">Move your pointer to guide the hand. Click or press Enter to summon the sword.</p>
    <div className="summon-hand-fallback" aria-hidden="true">
      {phase==='pointing'&&<img className="summon-fallback-point" src="/summon-entry/pointing-hand.webp" alt="" width={1536} height={1024} decoding="async"/>}
      {fallback&&phase!=='pointing'&&<StillHeldSword mode="opening" targetX={params.summonTargetX} targetY={params.summonTargetY}/>}
    </div>
  </div>;
}
