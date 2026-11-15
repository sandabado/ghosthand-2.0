'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { TIMING, type SwordMoment } from '@/core/config';
import { relics } from '@/core/fixtures';
import { strokeComplete } from '@/core/cut';
import { OATH_GREETINGS, oathGreetingFrame } from '@/core/smithy';
import { cancelCommissionStroke, commitCommissionSeal, previewCommissionStroke, selectCommissionRelic } from '@/core/smithy-director';
import { navigate,navigateAbout,resetJourney } from '@/core/director';
import WorkMenu from './WorkMenu';
import { useJourney } from '@/core/world';
import { useParam } from '@/core/params';
import ScrollCue from './ScrollCue';
import dynamic from 'next/dynamic';
import { useRenderFailure } from '@/core/render-fallback';

const StillWeapon=dynamic(()=>import('./StillHeldSword').then(module=>module.StillWeapon),{ssr:false});

type StrokeMode='pointer'|'keyboard';
type CapturedStroke={id:number;x:number;y:number;element:HTMLButtonElement};

const swordLabels:Record<SwordMoment,string>={
  'opening-glint':'The opening glint',pursuit:'The pursuit',merge:'The merge',
  'commission-handover':'The handover','sheathed-oath':'The blade at rest',
};

function CatalogueColophon({index}:{index:number}){
  const material=(relics[index]?.material??'').split(' · ');
  return <div className="smithy8-colophon"><div>{material.map(part=><strong key={part}>{part}</strong>)}</div><i aria-hidden="true"/></div>;
}

/** A quiet still-path counterpart; the normal blade belongs to the World. */
function StillBlade({sheathed=false}:{sheathed?:boolean}){
  const reduced=useJourney(state=>state.reducedMotion),failed=useRenderFailure();
  if(!reduced&&!failed)return null;
  return <div className={`smithy8-still-blade ${sheathed?'is-sheathed':''}`} aria-hidden="true"><StillWeapon sheathed={sheathed}/></div>;
}

function CommissionSeal(){
  const scene=useJourney(state=>state.scene),reduced=useJourney(state=>state.reducedMotion);
  const selected=useJourney(state=>state.selectedRelic),sealed=useJourney(state=>state.commissionSeal);
  const phase=useJourney(state=>state.commissionPhase),sealedIndex=useJourney(state=>state.commissionSealedRelic);
  const disabled=scene!=='COMMISSION'||sealed||phase!=='idle';
  const origin=useRef<CapturedStroke|null>(null),mode=useRef<StrokeMode|null>(null),readyRef=useRef(false);
  const [armed,setArmed]=useState<StrokeMode|null>(null),[ready,setReady]=useState(false);
  const clear=useCallback(()=>{origin.current=null;mode.current=null;readyRef.current=false;setArmed(null);setReady(false);},[]);
  const cancel=useCallback(()=>{
    const start=origin.current,active=mode.current!==null;clear();
    if(active)cancelCommissionStroke();
    if(start?.element.hasPointerCapture(start.id))start.element.releasePointerCapture(start.id);
  },[clear]);
  useEffect(()=>{
    const visibility=()=>{if(document.hidden)cancel();};
    window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',visibility);
    return()=>{
      window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',visibility);
      const start=origin.current,active=mode.current!==null;origin.current=null;mode.current=null;
      if(active)cancelCommissionStroke();
      if(start?.element.hasPointerCapture(start.id))start.element.releasePointerCapture(start.id);
    };
  },[cancel]);
  useEffect(()=>{cancel();},[reduced,cancel]);
  useEffect(()=>{if(disabled)cancel();},[disabled,cancel]);
  const preview=(distance:number)=>{
    const progress=Number.isFinite(distance)?Math.max(0,Math.min(1,distance/TIMING.strokePixels)):0;
    previewCommissionStroke(progress);const next=progress>=1;
    if(next!==readyRef.current){readyRef.current=next;setReady(next);}
  };
  const down=(event:PointerEvent<HTMLButtonElement>)=>{
    if(disabled||!event.isPrimary||event.button!==0||mode.current!==null)return;
    if(event.pointerType==='touch'&&!(event.target instanceof Element&&event.target.closest('.smithy8-seal-tool')))return;
    event.preventDefault();event.currentTarget.focus({preventScroll:true});event.currentTarget.setPointerCapture(event.pointerId);
    origin.current={id:event.pointerId,x:event.clientX,y:event.clientY,element:event.currentTarget};
    mode.current='pointer';setArmed('pointer');readyRef.current=false;setReady(false);previewCommissionStroke(0);
  };
  const move=(event:PointerEvent<HTMLButtonElement>)=>{
    const start=origin.current;if(!start||mode.current!=='pointer'||event.pointerId!==start.id||disabled)return;
    event.preventDefault();preview(Math.hypot(event.clientX-start.x,event.clientY-start.y));
  };
  const up=(event:PointerEvent<HTMLButtonElement>)=>{
    const start=origin.current;if(!start||mode.current!=='pointer'||event.pointerId!==start.id)return;
    event.preventDefault();const accepted=!disabled&&strokeComplete(Math.hypot(event.clientX-start.x,event.clientY-start.y));clear();
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    if(accepted)commitCommissionSeal('pointer');else cancelCommissionStroke();
  };
  const key=(event:KeyboardEvent<HTMLButtonElement>)=>{
    if(event.key==='Escape'){event.preventDefault();cancel();return;}
    if(disabled)return;
    if(event.key===' '){event.preventDefault();if(event.repeat)return;cancel();mode.current='keyboard';setArmed('keyboard');previewCommissionStroke(0);}
    else if(mode.current==='keyboard'&&event.key==='ArrowDown'){event.preventDefault();preview(TIMING.strokePixels);}
    else if(mode.current==='keyboard'&&event.key==='ArrowUp'){event.preventDefault();preview(0);}
    else if(event.key==='Enter'){event.preventDefault();if(mode.current==='keyboard'&&readyRef.current){clear();commitCommissionSeal('keyboard');}}
  };
  const current=relics[selected]??relics[0],marked=sealedIndex===null?undefined:relics[sealedIndex];
  const guide=phase==='pressing'?'THE INK TAKES HOLD.':sealed?'THE INTENTION REMAINS.':ready?armed==='keyboard'?'ENTER TO SET THE SEAL':'RELEASE TO SET THE SEAL':armed?'DRAW YOUR INTENTION':'PRESS · DRAW · RELEASE';
  return <section className="smithy8-seal" data-phase={phase} data-sealed={sealed} aria-labelledby="smithy8-seal-heading">
    <div className="smithy8-seal-copy"><span className="smithy8-overline ritual-option">Optional · Project mark</span><h3 id="smithy8-seal-heading">A purpose.<br/><em>A promise to begin.</em></h3><p>Mark a direction for your project, or keep scrolling.</p><div className="smithy8-intention"><span>{sealed?'THE MARK BELONGS TO':'CHOOSE A DIRECTION'}</span><div role="group" aria-label="Choose an instrument for the local commission mark">{relics.map((relic,index)=><button key={relic.id} type="button" aria-label={`Choose ${relic.title} for the seal`} aria-pressed={selected===index} onClick={()=>selectCommissionRelic(index,'intention')}><span>0{index+1}</span><strong>{relic.title.replace(/^\d+\s*\/\s*/,'')}</strong><i aria-hidden="true">{sealedIndex===index?'委':selected===index?'↗':'·'}</i></button>)}</div><p>{sealed?marked?`Your local mark remains with ${marked.title.replace(/^\d+\s*\/\s*/,'')}.`:'Your local mark has been received.':current.title.replace(/^\d+\s*\/\s*/,'')}</p></div><small>A local project intention only. No order or message is created.</small></div>
    <div className="smithy8-docket"><div className="smithy8-docket-head"><span>GHOST HAND / 委</span><span>{sealed?'MARK RECEIVED':'A THOUGHT, HELD'}</span></div><span className="smithy8-docket-title">MADE WITH<br/><em>INTENT.</em></span><div className="smithy8-impression" aria-hidden="true"><b>委</b><i/><small>GHOST HAND</small></div><div className="smithy8-paper-pressure" aria-hidden="true"/><button type="button" className="smithy8-seal-grip" disabled={disabled} aria-label={sealed?'Commission seal already committed':'Commit the Commission seal'} aria-describedby="smithy8-seal-help" data-armed={armed!==null}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={event=>{if(origin.current?.id===event.pointerId)cancel();}} onLostPointerCapture={event=>{if(origin.current?.id===event.pointerId)cancel();}} onBlur={cancel} onKeyDown={key} onClick={event=>event.preventDefault()}>
      <span className="smithy8-seal-tool" aria-hidden="true"><i/><b>委</b><em>GHOST HAND</em></span><span className="smithy8-seal-caption">{guide}</span><span className="smithy8-seal-track" aria-hidden="true"><i/></span></button><div className="smithy8-docket-foot"><span>LOCAL INTENTION</span></div></div>
    <p id="smithy8-seal-help" className="smithy8-seal-help">Drag the seal at least 40px, then release.<br/><span>KEYBOARD / SPACE → ↓ → ENTER. ESC CANCELS.</span></p><p className="sr-only" aria-live="polite">{sealed?`The local Commission mark is sealed${marked?` for ${marked.title}`:''}. Scrolling continues to the Oath.`:ready?'Stroke ready. Release the pointer or press Enter.':armed?'Draw at least forty pixels, or press Arrow Down then Enter.':'The seal is optional. Scroll past it to continue.'}</p>
  </section>;
}

export function CommissionScene(){
  const root=useRef<HTMLDivElement>(null),selected=useJourney(state=>state.selectedRelic),reduced=useJourney(state=>state.reducedMotion);
  useEffect(()=>()=>{if(useJourney.getState().scene!=='COMMISSION')useJourney.setState({commissionExploring:false});},[]);
  const focusRelic=(index:number)=>{
    selectCommissionRelic(index,'catalogue');
    const stop=root.current?.querySelector<HTMLElement>(`[data-smithy-relic="${index}"]`);if(!stop)return;
    const shell=stop.closest<HTMLElement>('.current-shell');
    if(!reduced&&shell)shell.scrollTop+=stop.getBoundingClientRect().top-shell.getBoundingClientRect().top-24;
    else stop.scrollIntoView({behavior:'auto',block:'start'});
    stop.querySelector<HTMLElement>('h3')?.focus({preventScroll:true});
  };
  return <div ref={root} className="smithy8-scene">
    <div className="smithy8-entry"><div className="smithy8-entry-copy"><h2>Bring the<br/><em>impossible thing.</em></h2><p>Tell us what you're trying to make.<br/>We'll start with a conversation.</p><a className="smithy8-contact" href="mailto:hello@ghosthand.studio?subject=Ghost%20Hand%20%E2%80%94%20Start%20a%20project">Email the studio <span aria-hidden="true">↗</span></a><small className="studio-contact-email">hello@ghosthand.studio</small></div><div className="smithy8-handover-space" role="img" aria-label="The same blade is offered hilt first, toward the visitor."><StillBlade/></div></div>
    <div className="studio-exploration studio-commission-extras"><details className="studio-extra" onToggle={event=>{if(root.current?.closest('.current-shell'))useJourney.setState({commissionExploring:event.currentTarget.open});}}><summary>Explore possible instruments <span aria-hidden="true">＋</span></summary><div>
    <div className="smithy8-catalogue-heading"><div><h3>Made for<br/><em>the way you work.</em></h3><p>Three illustrative instruments. A conversation shapes the real thing.</p></div><nav className="smithy8-catalogue-index" aria-label="Commission catalogue">{relics.map((relic,index)=><button key={relic.id} type="button" aria-label={`View ${relic.title}`} aria-current={selected===index?'location':undefined} onClick={()=>focusRelic(index)}>0{index+1}</button>)}</nav></div>
    <div className="smithy8-catalogue">{relics.map((relic,index)=><article className="smithy8-paper" key={relic.id} data-smithy-relic={index} data-active={selected===index} aria-labelledby={`smithy8-title-${relic.id}`}><div className="smithy8-paper-head"><span>0{index+1}</span></div><div className="smithy8-paper-body"><div><h3 id={`smithy8-title-${relic.id}`} tabIndex={-1}>{relic.title.replace(/^\d+\s*\/\s*/,'')}</h3><p>{relic.description}</p></div><CatalogueColophon index={index}/></div><div className="smithy8-paper-foot"><span>CONCEPT STUDY</span></div></article>)}</div>
    </div></details><details className="studio-extra"><summary>Leave a project mark <span aria-hidden="true">＋</span></summary><CommissionSeal/></details></div>
    <div className="smithy8-exit"><ScrollCue label="Scroll into stillness"/></div>
  </div>;
}

function OathReceipt(){
  const moments=useJourney(state=>state.swordMoments);
  const dojo=useJourney(state=>state.dojoSeal),commission=useJourney(state=>state.commissionSeal),markedIndex=useJourney(state=>state.commissionSealedRelic);
  const marked=markedIndex===null?undefined:relics[markedIndex];
  return <details className="oath8-record"><summary>Your journey <span aria-hidden="true">＋</span></summary><section className="oath8-receipt" aria-labelledby="oath8-receipt-title"><h3 id="oath8-receipt-title">What remains<br/><em>is what you keep.</em></h3><div className="oath8-receipt-grid"><div><span className="oath8-receipt-overline">MOMENTS VISITED</span><ol>{moments.map(moment=><li key={moment}><span aria-hidden="true">—</span>{swordLabels[moment]}</li>)}</ol></div><dl><div><dt>DOJO HANKO</dt><dd>{dojo?'MARK RECEIVED':'UNMARKED'}</dd></div><div><dt>COMMISSION 委</dt><dd>{commission?'MARK RECEIVED':'UNMARKED'}{commission&&marked&&<small>{marked.title.replace(/^\d+\s*\/\s*/,'')}</small>}</dd></div></dl></div><div className="oath8-receipt-foot"><p>Your marks are local intentions.</p></div></section></details>;
}

export function OathScene(){
  const time=useParam('oathTime');
  const frame=oathGreetingFrame(time,TIMING.oath),greeting=OATH_GREETINGS[frame.index];
  return <div className="oath8-scene"><div className="smithy8-label"><span>11 / THE OATH</span></div><div className="oath8-arrival"><div className="oath8-greeting" aria-hidden="true"><span className="oath8-word" lang={greeting?.lang}>{greeting?.text??''}</span><span className="oath8-hand">手</span></div><div className="oath8-translations" aria-label="A welcome in four languages">{OATH_GREETINGS.map(word=><span key={word.lang} lang={word.lang}>{word.text}</span>)}</div><h2>The hand<br/>is <em>yours.</em></h2><p>The intention stays with you.</p><StillBlade sheathed/><p className="sr-only">A sheathed sword rests on its stand. A welcome in four languages dissolves into the hand.</p></div><OathReceipt/><div className="oath8-close"><h3>Make the<br/><em>next thing matter.</em></h3><button type="button" className="smithy8-contact" onClick={()=>navigate('COMMISSION')}>Start a project <span aria-hidden="true">↗</span></button><div className="oath8-replay"><button type="button" onClick={resetJourney}>Begin a new journey <span aria-hidden="true">↺</span></button><small>Resets this journey and its marks.</small></div></div><nav className="oath-studio-footer" aria-label="Studio footer"><WorkMenu/><button type="button" onClick={navigateAbout}>About</button><button type="button" onClick={()=>navigate('COMMISSION')}>Contact</button></nav><details className="studio-extra studio-about" id="studio-about"><summary>About Ghost Hand Studio <span aria-hidden="true">＋</span></summary><div className="studio-about-people"><article><h3>Chris Kyser</h3><p>Systems, knowledge, technical architecture.</p></article><article><h3>Jesse Gawlik</h3><p>Product, experience, creative direction.</p></article></div></details></div>;
}
