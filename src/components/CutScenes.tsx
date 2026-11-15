'use client';

import { useCallback,useEffect,useLayoutEffect,useRef,useState,type KeyboardEvent,type PointerEvent } from 'react';
import dynamic from 'next/dynamic';
import { TIMING } from '@/core/config';
import { useJourney } from '@/core/world';
import { useParam } from '@/core/params';
import { aimFork,previewForkStroke,cancelForkStroke,commitFork } from '@/core/director';
import { strokeComplete } from '@/core/cut';
import { useRenderFailure } from '@/core/render-fallback';

const StillHeldSword=dynamic(()=>import('./StillHeldSword'),{ssr:false});

type ForkBranch='DOJO'|'CHAINS_HOLD';
type StrokeKind='pointer'|'keyboard';
type PointerOrigin={pointer:number;x:number;y:number;element:HTMLButtonElement};

function CutLabel({number,title}:{number:string;title:string;detail:string}){
  return <div className="cut6-label"><span>{number} / {title}</span></div>;
}

export function PursuitScene(){
  return <div className="cut6-scene cut6-pursuit">
    <CutLabel number="05" title="THE PURSUIT" detail="ONE INVITATION."/>
    <div className="cut6-pursuit-stage"><h2>Follow.</h2><div className="cut6-pursuit-vector" aria-hidden="true"><i/></div></div>
  </div>;
}

function MergeContent({command}:{command:string}){
  return <div className="cut6-merge-stage"><div className="cut6-summon" aria-label="Summon"><span aria-hidden="true">&gt;</span><span aria-hidden="true">{command}</span><i aria-hidden="true">_</i></div><h2 className="cut6-merge-title">One hand.<br/><em>One purpose.</em></h2></div>;
}

export function MergeScene(){
  const time=useParam('ceremonyTime'),ink=useParam('inkFlow');
  const reduced=useJourney(state=>state.reducedMotion);
  const failed=useRenderFailure(),fallback=reduced||failed;
  const original=useRef<HTMLDivElement>(null),shear=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const source=original.current,layer=shear.current;if(!source||!layer||fallback)return;
    // Two inert visual pieces reproduce the same page-space type. Only layout
    // and reading changes require measurement; the shared engine owns motion.
    const align=()=>{
      const rect=source.getBoundingClientRect();
      layer.style.setProperty('--slice-content-left',`${rect.left}px`);layer.style.setProperty('--slice-content-top',`${rect.top}px`);
      layer.style.setProperty('--slice-content-width',`${rect.width}px`);layer.style.setProperty('--slice-content-height',`${rect.height}px`);
    };
    const reader=source.closest('.current-shell'),observer=new ResizeObserver(align);
    observer.observe(source);reader?.addEventListener('scroll',align,{passive:true});window.addEventListener('resize',align);align();
    return()=>{observer.disconnect();reader?.removeEventListener('scroll',align);window.removeEventListener('resize',align);};
  },[fallback]);
  const command=fallback?'summon':Array.from('summon').slice(0,Math.ceil(Math.max(0,Math.min(1,ink))*6)).join('');
  const phase=time<TIMING.merge.handStart?'The hand arrives.':time<TIMING.merge.swordStart?'The hand opens to receive the blade.':time<TIMING.merge.cutStart?'The hand receives the glowing blade.':'The blade cuts the page open.';
  return <div className="cut6-scene cut6-merge">
    <div ref={original} className="cut6-merge-original"><MergeContent command={command}/></div>
    {!fallback&&<div className="cut6-next-reveal" aria-hidden="true" inert><p>Bring the<br/><em>impossible thing.</em></p></div>}
    {!fallback&&<div ref={shear} className="cut6-merge-shear" aria-hidden="true" inert>
      <div className="cut6-merge-half cut6-merge-half-upper"><div className="cut6-page-content"><MergeContent command={command}/></div></div>
      <div className="cut6-merge-half cut6-merge-half-lower"><div className="cut6-page-content"><MergeContent command={command}/></div></div>
    </div>}
    {fallback&&<StillHeldSword/>}
    <p className="sr-only" aria-live="off">{phase}</p>
  </div>;
}

function ForkHalf({branch,title,number,copy,glyph}:{branch:ForkBranch;title:React.ReactNode;number:string;copy:React.ReactNode;glyph:string}){
  const choice=useJourney(state=>state.forkChoice),unlocked=useJourney(state=>state.navUnlocked);
  const scene=useJourney(state=>state.scene),reduced=useJourney(state=>state.reducedMotion);
  const origin=useRef<PointerOrigin|null>(null),mode=useRef<StrokeKind|null>(null),readyRef=useRef(false);
  const [kind,setKind]=useState<StrokeKind|null>(null),[ready,setReady]=useState(false);
  const active=scene==='FORK'&&unlocked,disabled=!active||choice!==null;
  const sign=branch==='DOJO'?-1:1,id=branch==='DOJO'?'sovereign':'chains';
  const clearLocal=useCallback(()=>{origin.current=null;mode.current=null;readyRef.current=false;setKind(null);setReady(false);},[]);
  const cancel=useCallback(()=>{
    const start=origin.current,wasActive=mode.current!==null;
    clearLocal();
    if(wasActive)cancelForkStroke();
    if(start?.element.hasPointerCapture(start.pointer))start.element.releasePointerCapture(start.pointer);
  },[clearLocal]);
  useEffect(()=>{
    window.addEventListener('blur',cancel);
    return()=>{
      window.removeEventListener('blur',cancel);
      const start=origin.current,wasActive=mode.current!==null;
      origin.current=null;mode.current=null;
      if(wasActive)cancelForkStroke();
      if(start?.element.hasPointerCapture(start.pointer))start.element.releasePointerCapture(start.pointer);
    };
  },[cancel]);
  useEffect(()=>{cancel();},[reduced,cancel]);
  useEffect(()=>{if(disabled)cancel();},[disabled,cancel]);
  const updateReady=(progress:number)=>{
    previewForkStroke(progress);
    const next=progress>=1;
    if(next!==readyRef.current){readyRef.current=next;setReady(next);}
  };
  const onDown=(event:PointerEvent<HTMLButtonElement>)=>{
    if(disabled||!event.isPrimary||event.button!==0||mode.current!==null)return;
    event.preventDefault();event.currentTarget.focus({preventScroll:true});event.currentTarget.setPointerCapture(event.pointerId);
    origin.current={pointer:event.pointerId,x:event.clientX,y:event.clientY,element:event.currentTarget};
    mode.current='pointer';setKind('pointer');readyRef.current=false;setReady(false);previewForkStroke(0);aimFork(sign*.8);
  };
  const onMove=(event:PointerEvent<HTMLButtonElement>)=>{
    const start=origin.current;if(!start||mode.current!=='pointer'||start.pointer!==event.pointerId||disabled)return;
    event.preventDefault();updateReady(Math.max(0,Math.min(1,Math.hypot(event.clientX-start.x,event.clientY-start.y)/TIMING.strokePixels)));
  };
  const onUp=(event:PointerEvent<HTMLButtonElement>)=>{
    const start=origin.current;if(!start||mode.current!=='pointer'||start.pointer!==event.pointerId)return;
    event.preventDefault();const complete=!disabled&&strokeComplete(Math.hypot(event.clientX-start.x,event.clientY-start.y));
    clearLocal();
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    if(complete)commitFork(branch,'pointer');else cancelForkStroke();
  };
  const onKey=(event:KeyboardEvent<HTMLButtonElement>)=>{
    if(event.key==='Escape'){if(mode.current!==null){event.preventDefault();cancel();}return;}
    if(disabled)return;
    if(event.key===' '){
      event.preventDefault();if(event.repeat)return;
      cancel();mode.current='keyboard';setKind('keyboard');previewForkStroke(0);aimFork(sign*.8);
    }else if(mode.current==='keyboard'&&event.key==='ArrowDown'){
      event.preventDefault();updateReady(1);
    }else if(mode.current==='keyboard'&&event.key==='ArrowUp'){
      event.preventDefault();updateReady(0);
    }else if(event.key==='Enter'){
      event.preventDefault();if(mode.current==='keyboard'&&readyRef.current){clearLocal();commitFork(branch,'keyboard');}
    }
  };
  const lean=(event:PointerEvent<HTMLElement>)=>{
    if(disabled||event.pointerType==='touch'||mode.current!==null)return;
    const rect=event.currentTarget.getBoundingClientRect(),local=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
    aimFork(sign*(.4+.6*(branch==='DOJO'?1-local:local)));
  };
  const guide=choice===branch?'THE CHOICE HOLDS.':choice!==null?'LET IT FALL AWAY.':ready?kind==='keyboard'?'ENTER TO COMMIT':'RELEASE TO COMMIT':kind?'DRAW YOUR STROKE':'PRESS · DRAW · RELEASE';
  return <article className="cut6-fork-card" data-branch={branch} data-armed={kind!==null} data-selected={choice===branch} data-rejected={choice!==null&&choice!==branch} aria-labelledby={`cut6-title-${id}`}
    onPointerEnter={lean} onPointerMove={lean} onPointerLeave={()=>{if(mode.current===null&&!disabled)aimFork(0);}}>
    <span className="cut6-fork-glyph" aria-hidden="true">{glyph}</span><span className="cut6-fork-number">{number}</span><h3 id={`cut6-title-${id}`} className="cut6-fork-title">{title}</h3><span id={`cut6-copy-${id}`} className="cut6-fork-copy">{copy}</span>
    <button type="button" className="cut6-stroke-grip" data-branch={branch} disabled={disabled} aria-label={branch==='DOJO'?'Commit to Forge the blade':'Commit to Wear the chains'} aria-describedby={`cut6-copy-${id} cut6-fork-help`}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={cancel} onLostPointerCapture={cancel} onBlur={()=>{cancel();if(!disabled)aimFork(0);}}
      onFocus={()=>{if(!disabled)aimFork(sign*.75);}} onKeyDown={onKey} onClick={event=>event.preventDefault()}>
      <span className="cut6-stroke-guide"><i aria-hidden="true"/><span>{guide}</span></span><b aria-hidden="true">↗</b>
    </button>
    <span className="cut6-fork-status" role="status">{ready?'Stroke ready. Release the pointer, or press Enter after the keyboard stroke.':kind?'Armed. Draw at least forty pixels, or press Arrow Down then Enter.':''}</span>
  </article>;
}

export function ForkScene(){
  const choice=useJourney(state=>state.forkChoice);
  return <div className="cut6-scene cut6-fork" data-committing={choice!==null}>
    <CutLabel number="07" title="THE FORK" detail="ONE STROKE. TWO DESTINIES."/>
    <div className="cut6-fork-heading"><div><span className="ritual-option required-action">Choose your path</span><h2>Choose what<br/><em>holds you.</em></h2></div><p>Press and drag either grip to choose.<br/>Or enter Dojo or Commission below.</p></div>
    <div className="cut6-fork-stage"><ForkHalf branch="DOJO" number="01 / SOVEREIGN" glyph="主" title={<>FORGE<br/>THE BLADE.</>} copy={<>Explore the work in the Dojo.</>}/><ForkHalf branch="CHAINS_HOLD" number="02 / BORROWED" glyph="縛" title={<>WEAR<br/>THE CHAINS.</>} copy={<>Enter the holding room.<br/>You can return here.</>}/><span className="cut6-fork-seam" aria-hidden="true"/></div>
    <p id="cut6-fork-help" className="cut6-fork-help"><span>Drag either grip at least 40px, then release.</span><span>KEYBOARD: SPACE → ↓ → ENTER · ESC CANCELS</span></p>
    <p className="cut6-fork-status" role="status">{choice!==null?'The choice is made. The other path is falling away.':'Choose a path above, or use Dojo or Commission below.'}</p>
  </div>;
}

export function ChainsHoldScene(){
  return <div className="cut6-scene cut6-hold">
    <CutLabel number="10" title="THE HOLDING ROOM" detail="THE DOOR REMAINS OPEN."/>
    <div className="cut6-hold-stage"><div className="cut6-hold-copy"><span aria-hidden="true">縛</span><h2>The room<br/>is <em>familiar.</em></h2><p>You can still put it down.</p></div><div className="cut6-hold-door" role="img" aria-label="One green doorway returns to the Fork. Scroll down to pass through."><span>RETURN TO<br/>THE FORK</span><b aria-hidden="true">↓</b></div></div>
    <div className="cut6-hold-foot"><span>Scroll through the green door ↓</span></div>
  </div>;
}
