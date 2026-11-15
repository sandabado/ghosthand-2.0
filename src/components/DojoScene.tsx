'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { TIMING } from '@/core/config';
import { memberBuilds } from '@/core/fixtures';
import { strokeComplete } from '@/core/cut';
import { useJourney } from '@/core/world';
import { cancelHankoStroke, commitHanko, previewHankoStroke, queueDojoLook, selectDojoBuild, setDojoMove, stopDojoInput } from '@/core/dojo-director';
import ScrollCue from './ScrollCue';
import WorkShowcase from './WorkShowcase';

type CapturedPointer = { id: number; x: number; y: number; element: HTMLElement };
type StrokeMode = 'pointer' | 'keyboard';
type PermissionOrientation = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };

/** Static counterparts to the chamber's six live shader studies. */
function StudyArt({ index }: { index: number }) {
  const body = index === 0 ? <>{Array.from({ length: 13 }, (_, i) => <g key={i} transform={`rotate(${i * 27.7} 160 130)`}><path d="M160 130 C185 72 231 68 271 38"/><circle cx="271" cy="38" r={i % 3 === 0 ? 5 : 2}/><path d="M160 130 201 88" opacity=".3"/></g>)}<circle cx="160" cy="130" r="23"/><circle cx="160" cy="130" r="8"/></>
    : index === 1 ? <>{[30, 56, 83, 110].map((r, i) => <g key={r} transform={`rotate(${i * 19} 160 130)`}><ellipse cx="160" cy="130" rx={r} ry={r * .43}/><path d={`M${160 - r} 130H${160 + r}`}/></g>)}<path d="M160 20V240M50 130H270" strokeDasharray="2 8"/><circle cx="160" cy="130" r="7"/></>
      : index === 2 ? <>{Array.from({ length: 6 }, (_, row) => Array.from({ length: 8 }, (_, col) => <g key={`${row}-${col}`}><path d={`M${48 + col * 32} ${50 + row * 32}l32 32m-32 0 32-32`}/><circle cx={48 + col * 32} cy={50 + row * 32} r={(row + col) % 4 === 0 ? 4 : 1.5}/></g>))}<path d="M48 50 272 210M48 210 272 50" strokeWidth="2"/></>
        : index === 3 ? <>{[0, 1, 2, 3].map(i => <path key={i} d={`M160 ${30 + i * 22}l${95 - i * 22} ${100 - i * 22}-${95 - i * 22} ${100 - i * 22}-${95 - i * 22}-${100 - i * 22}Z`}/>)}<path d="M160 30V230M65 130H255M110 80 210 180M110 180 210 80" strokeDasharray="2 5"/><circle cx="160" cy="130" r="6"/></>
          : index === 4 ? <>{[65, 160, 255].map((x, i) => <g key={x} transform={`translate(${x - 160} ${i === 1 ? -28 : 20})`}><path d="M142 180V123q0-10 6-10t6 10V78q0-11 6-11t6 11v36-55q0-10 6-10t6 10v56-32q0-9 6-9t6 9v61q-1 24-15 37l-7 9Z"/><path d="m132 45 28-22 28 22M160 24v29"/><path d="M143 195h34m-34 12h34"/></g>)}</>
            : <><path d="M92 44H47v172h93v-41H91v-43h46V87h46V44h90v173h-45v-44h-45v-42h45V88h-45M137 131h46M137 175h46"/>{[[47,44],[47,216],[140,216],[91,132],[137,87],[183,44],[273,217],[228,173],[228,88]].map(([x,y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="5"/>)}<circle cx="160" cy="131" r="82" strokeDasharray="1 9"/></>;
  return <div className={`dojo7-art dojo7-art-${index}`} aria-hidden="true"><div className="dojo7-art-grid"/><svg viewBox="0 0 320 260" fill="none" stroke="currentColor" strokeWidth=".9" strokeLinecap="round" strokeLinejoin="round">{body}</svg><div className="dojo7-art-scan"/><i/></div>;
}

function MoveControl({ x, z, label, glyph, reduced }: { x: number; z: number; label: string; glyph: string; reduced: boolean }) {
  const pointer = useRef<{ id: number; element: HTMLButtonElement } | null>(null);
  const [pressed, setPressed] = useState(false);
  const cancel = useCallback(() => {
    const start = pointer.current; pointer.current = null;
    setPressed(false); setDojoMove(0, 0);
    if (start?.element.hasPointerCapture(start.id)) start.element.releasePointerCapture(start.id);
  }, []);
  useEffect(() => {
    window.addEventListener('blur', cancel);
    return () => { window.removeEventListener('blur', cancel); setDojoMove(0, 0); };
  }, [cancel]);
  useEffect(() => { cancel(); }, [reduced, cancel]);
  const down = (event: PointerEvent<HTMLButtonElement>) => {
    if (reduced || !event.isPrimary || event.button !== 0 || pointer.current) return;
    event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = { id: event.pointerId, element: event.currentTarget }; setPressed(true); setDojoMove(x, z);
  };
  const key = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); cancel(); }
    else if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); setPressed(true); setDojoMove(x, z); }
  };
  return <button type="button" className="dojo7-move-key" aria-label={label} aria-pressed={pressed} disabled={reduced} onClick={event => event.preventDefault()}
    onPointerDown={down} onPointerUp={event => { if (pointer.current?.id === event.pointerId) cancel(); }} onPointerCancel={cancel} onLostPointerCapture={cancel} onBlur={cancel}
    onKeyDown={key} onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); cancel(); } }}><span aria-hidden="true">{glyph}</span></button>;
}

function MovementConsole() {
  const reduced = useJourney(state => state.reducedMotion);
  const pad = useRef<HTMLDivElement>(null), drag = useRef<CapturedPointer | null>(null), alive = useRef(true), permissionSerial = useRef(0);
  const [locked, setLocked] = useState(false), [gyro, setGyro] = useState(false), [status, setStatus] = useState('');
  const cancelDrag = useCallback(() => {
    const start = drag.current; drag.current = null; stopDojoInput();
    if (start?.element.hasPointerCapture(start.id)) start.element.releasePointerCapture(start.id);
  }, []);
  useEffect(() => {
    alive.current = true;
    const element = pad.current;
    const lock = () => {
      const captured = document.pointerLockElement === element;
      if (alive.current) { setLocked(captured); if (!captured) setStatus('Pointer released. Drag the field or use W A S D; scroll to continue.'); }
      cancelDrag();
    };
    const blur = () => {
      permissionSerial.current++; cancelDrag(); setGyro(false);
      if (document.pointerLockElement === element) document.exitPointerLock();
    };
    const visibility = () => { if (document.hidden) blur(); };
    document.addEventListener('pointerlockchange', lock); window.addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility);
    return () => {
      alive.current = false; permissionSerial.current++; cancelDrag();
      if (document.pointerLockElement === element) document.exitPointerLock();
      document.removeEventListener('pointerlockchange', lock); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility);
    };
  }, [cancelDrag]);
  useEffect(() => {
    permissionSerial.current++; cancelDrag();
    if (reduced) { setGyro(false); if (document.pointerLockElement === pad.current) document.exitPointerLock(); }
  }, [reduced, cancelDrag]);
  useEffect(() => {
    if (!gyro || reduced) return;
    let previous: { gamma: number; beta: number } | null = null;
    const orientation = (event: DeviceOrientationEvent) => {
      if (event.gamma === null || event.beta === null || !Number.isFinite(event.gamma) || !Number.isFinite(event.beta)) return;
      const next = { gamma: event.gamma, beta: event.beta };
      if (previous) {
        const dx = Math.max(-12, Math.min(12, ((next.gamma - previous.gamma + 540) % 360) - 180));
        const dy = Math.max(-12, Math.min(12, ((next.beta - previous.beta + 540) % 360) - 180));
        queueDojoLook(dx * 2, dy * 2);
      }
      previous = next;
    };
    window.addEventListener('deviceorientation', orientation);
    return () => { window.removeEventListener('deviceorientation', orientation); stopDojoInput(); };
  }, [gyro, reduced]);
  const capture = async () => {
    if (reduced || !pad.current) return;
    if (locked) { document.exitPointerLock(); return; }
    try {
      cancelDrag(); await pad.current.requestPointerLock();
      if (!alive.current || useJourney.getState().reducedMotion || useJourney.getState().scene !== 'DOJO') { if (document.pointerLockElement) document.exitPointerLock(); return; }
      setStatus('Pointer captured. Move to look; W A S D to walk. Escape returns the pointer.');
    } catch { if (alive.current) setStatus('Pointer capture is unavailable here. Drag the field or use W A S D.'); }
  };
  const toggleGyro = async () => {
    if (gyro) { setGyro(false); return; }
    const serial = ++permissionSerial.current;
    try {
      if (typeof DeviceOrientationEvent === 'undefined') { setStatus('Tilt is unavailable here. Drag the field to look around.'); return; }
      const device = DeviceOrientationEvent as PermissionOrientation;
      const result = device.requestPermission ? await device.requestPermission() : 'granted';
      if (!alive.current || serial !== permissionSerial.current || useJourney.getState().reducedMotion || useJourney.getState().scene !== 'DOJO') return;
      if (result !== 'granted') { setStatus('Tilt permission was not granted. Drag controls remain available.'); return; }
      cancelDrag(); setGyro(true); setStatus('Tilt is on. Move gently to look around; scrolling still carries the story.');
    } catch { if (alive.current) setStatus('Tilt is unavailable here. Drag controls remain available.'); }
  };
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (reduced || locked || !event.isPrimary || event.button !== 0 || drag.current) return;
    event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, element: event.currentTarget };
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.id !== event.pointerId || reduced) return;
    event.preventDefault(); queueDojoLook(event.clientX - start.x, event.clientY - start.y); start.x = event.clientX; start.y = event.clientY;
  };
  return <div className="dojo7-movement"><div ref={pad} className="dojo7-move-pad" tabIndex={0} role="group" aria-label="Dojo movement controls" aria-describedby="dojo7-move-help" aria-disabled={reduced} data-locked={locked}
    onPointerDown={down} onPointerMove={move} onPointerUp={event => { if (drag.current?.id === event.pointerId) cancelDrag(); }} onPointerCancel={cancelDrag} onLostPointerCapture={cancelDrag} onBlur={cancelDrag} onKeyDown={event => { if (event.key === 'Escape') cancelDrag(); }}>
      <span className="dojo7-pad-corner" aria-hidden="true">┌</span><span className="dojo7-pad-label">OPTIONAL EXPLORATION</span><div className="dojo7-pad-mark" aria-hidden="true"><i/><b>手</b><i/></div><strong>{reduced ? 'The room holds still.' : 'Look with your hand.'}</strong><span id="dojo7-move-help">{reduced ? 'Scroll to explore.' : 'DRAG TO LOOK · W A S D TO WALK'}</span><span className="dojo7-pad-corner" aria-hidden="true">┘</span>
    </div><div className="dojo7-control-row"><div className="dojo7-walk-controls dojo7-move-controls" role="group" aria-label="Hold a direction to walk" aria-disabled={reduced}><MoveControl x={-1} z={0} label="Hold to move left" glyph="←" reduced={reduced}/><MoveControl x={0} z={-1} label="Hold to move forward" glyph="↑" reduced={reduced}/><MoveControl x={0} z={1} label="Hold to move backward" glyph="↓" reduced={reduced}/><MoveControl x={1} z={0} label="Hold to move right" glyph="→" reduced={reduced}/></div><button type="button" className="dojo7-control-button" disabled={reduced} aria-pressed={locked} onClick={capture}>{locked ? 'Release pointer' : 'Capture pointer'}<span aria-hidden="true">↗</span></button><button type="button" className="dojo7-control-button" disabled={reduced} aria-pressed={gyro} onClick={toggleGyro}>{gyro ? 'Disable tilt' : 'Enable tilt'}<span aria-hidden="true">↗</span></button></div><p className="dojo7-input-status" role="status">{reduced ? 'Movement rests. Scroll to explore every work and the mark below.' : status || 'Explore freely. Scrolling always carries you onward.'}</p></div>;
}

function HankoRitual() {
  const sealed = useJourney(state => state.dojoSeal), phase = useJourney(state => state.dojoPhase), reduced = useJourney(state => state.reducedMotion), scene = useJourney(state => state.scene);
  const disabled = sealed || phase !== 'idle' || scene !== 'DOJO';
  const origin = useRef<CapturedPointer | null>(null), mode = useRef<StrokeMode | null>(null), readyRef = useRef(false);
  const [armed, setArmed] = useState<StrokeMode | null>(null), [ready, setReady] = useState(false);
  const clear = useCallback(() => { origin.current = null; mode.current = null; readyRef.current = false; setArmed(null); setReady(false); }, []);
  const cancel = useCallback(() => {
    const start = origin.current, active = mode.current !== null; clear();
    if (active) cancelHankoStroke();
    if (start?.element.hasPointerCapture(start.id)) start.element.releasePointerCapture(start.id);
  }, [clear]);
  useEffect(() => {
    window.addEventListener('blur', cancel);
    return () => {
      window.removeEventListener('blur', cancel);
      const start = origin.current, active = mode.current !== null; origin.current = null; mode.current = null;
      if (active) cancelHankoStroke();
      if (start?.element.hasPointerCapture(start.id)) start.element.releasePointerCapture(start.id);
    };
  }, [cancel]);
  useEffect(() => { cancel(); }, [reduced, cancel]);
  useEffect(() => { if (disabled) cancel(); }, [disabled, cancel]);
  const preview = (distance: number) => {
    const progress = Math.max(0, Math.min(1, distance / TIMING.strokePixels)); previewHankoStroke(progress);
    const next = progress >= 1; if (next !== readyRef.current) { readyRef.current = next; setReady(next); }
  };
  const down = (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || !event.isPrimary || event.button !== 0 || mode.current !== null) return;
    if (event.pointerType === 'touch' && !(event.target instanceof Element && event.target.closest('.dojo7-hanko-handle'))) return;
    event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId);
    origin.current = { id: event.pointerId, x: event.clientX, y: event.clientY, element: event.currentTarget }; mode.current = 'pointer'; setArmed('pointer'); setReady(false); readyRef.current = false; previewHankoStroke(0);
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const start = origin.current; if (!start || mode.current !== 'pointer' || event.pointerId !== start.id || disabled) return;
    event.preventDefault(); preview(Math.hypot(event.clientX - start.x, event.clientY - start.y));
  };
  const up = (event: PointerEvent<HTMLButtonElement>) => {
    const start = origin.current; if (!start || mode.current !== 'pointer' || event.pointerId !== start.id) return;
    event.preventDefault(); const accepted = !disabled && strokeComplete(Math.hypot(event.clientX - start.x, event.clientY - start.y)); clear();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (accepted) commitHanko('pointer'); else cancelHankoStroke();
  };
  const key = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); cancel(); return; }
    if (disabled) return;
    if (event.key === ' ') { event.preventDefault(); if (event.repeat) return; cancel(); mode.current = 'keyboard'; setArmed('keyboard'); previewHankoStroke(0); }
    else if (mode.current === 'keyboard' && event.key === 'ArrowDown') { event.preventDefault(); preview(TIMING.strokePixels); }
    else if (mode.current === 'keyboard' && event.key === 'ArrowUp') { event.preventDefault(); preview(0); }
    else if (event.key === 'Enter') { event.preventDefault(); if (mode.current === 'keyboard' && readyRef.current) { clear(); commitHanko('keyboard'); } }
  };
  const guide = phase === 'pressing' ? 'THE MARK TAKES HOLD.' : sealed ? 'THE INTENTION REMAINS.' : ready ? armed === 'keyboard' ? 'ENTER TO PRESS THE MARK' : 'RELEASE TO PRESS THE MARK' : armed ? 'DRAW YOUR STROKE' : 'PRESS · DRAW · RELEASE';
  return <div className="dojo7-offering" data-phase={phase} data-sealed={sealed}>
    <div className="dojo7-offering-copy"><span className="dojo7-overline ritual-option">Optional · Leave a personal mark</span><h3>Leave a mark.<br/><em>Keep the intent.</em></h3><p>Mark your passage, or keep scrolling.</p><small>A mark of intent. No membership or payment is created.</small></div>
    <div className="dojo7-dais"><div className="dojo7-stone-top" aria-hidden="true"><i/><i/><i/></div><div className="dojo7-impact-ring" aria-hidden="true"/><div className="dojo7-imprint" aria-hidden="true"><span>手</span><i/></div><button type="button" className="dojo7-hanko-grip" disabled={disabled} aria-label={sealed ? 'Dojo hanko already sealed' : 'Commit the Dojo hanko seal'} aria-describedby="dojo7-hanko-help" data-armed={armed !== null}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onLostPointerCapture={cancel} onBlur={cancel} onKeyDown={key} onClick={event => event.preventDefault()}>
      <span className="dojo7-hanko-handle" aria-hidden="true"><i/><b>手</b><em>GHOST HAND</em></span><span className="dojo7-hanko-caption">{guide}</span><span className="dojo7-hanko-track" aria-hidden="true"><i/></span></button></div>
    <p id="dojo7-hanko-help" className="dojo7-hanko-help">Drag the seal at least 40px, then release.<br/><span>KEYBOARD / SPACE → ↓ → ENTER. ESC CANCELS.</span></p><p className="sr-only" aria-live="polite">{sealed ? 'Your local hanko mark is sealed. Scrolling continues to the Oath.' : ready ? 'Stroke ready. Release the pointer or press Enter to seal your mark.' : armed ? 'Draw at least forty pixels, or press Arrow Down then Enter.' : 'The hanko ritual is optional. Scroll past it to continue.'}</p>
  </div>;
}

export default function DojoScene() {
  const root = useRef<HTMLDivElement>(null), selected = useJourney(state => state.selectedMember), reduced = useJourney(state => state.reducedMotion);
  useEffect(()=>()=>{if(useJourney.getState().scene!=='DOJO')useJourney.setState({dojoExploring:false});},[]);
  const focusStudy = (index: number) => {
    selectDojoBuild(index, 'button');
    const stop = root.current?.querySelector<HTMLElement>(`[data-dojo-stop="${index}"]`); if (!stop) return;
    const shell = stop.closest<HTMLElement>('.current-shell');
    if (!reduced && shell) shell.scrollTop += stop.getBoundingClientRect().top - shell.getBoundingClientRect().top - 24;
    else stop.scrollIntoView({ behavior: 'auto', block: 'start' });
    stop.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true });
  };
  return <div ref={root} className="dojo7-scene">
    <header className="studio-work-intro"><p>An idea becomes an instrument</p><h2>A thought.<br/><em>A useful thing.</em></h2></header>
    <WorkShowcase project="wishh"/>
    <div className="studio-exploration"><p>Stay curious.</p><h3>A little further<br/><em>inside the studio.</em></h3>
    <details className="studio-extra" onToggle={event=>{if(root.current?.closest('.current-shell'))useJourney.setState({dojoExploring:event.currentTarget.open});}}><summary>Explore the chamber <span aria-hidden="true">＋</span></summary><div><MovementConsole/></div></details>
    <details className="studio-extra"><summary>Visual experiments <span aria-hidden="true">＋</span></summary><div>
    <div className="dojo7-work-heading"><div><h3>Studies in <em>motion.</em></h3><p>Six authored visual experiments.</p></div><nav className="dojo7-work-index" aria-label="Visual study index">{memberBuilds.map((build, index) => <button type="button" key={build.id} aria-label={`View ${build.title}`} aria-current={selected === index ? 'location' : undefined} onClick={() => focusStudy(index)}>0{index + 1}</button>)}</nav></div>
    <div className="dojo7-studies">{memberBuilds.map((build, index) => <article key={build.id} id={`dojo7-work-${build.id}`} className="dojo7-study" data-dojo-stop={index} data-active={selected === index} aria-labelledby={`dojo7-title-${build.id}`}><div className="dojo7-study-copy"><div className="dojo7-study-meta"><span>0{index + 1}</span></div><h3 id={`dojo7-title-${build.id}`} tabIndex={-1}>{build.title}</h3><p>{build.description}</p><span className="dojo7-study-medium">{build.maker}</span></div><StudyArt index={index}/></article>)}</div>
    </div></details>
    <details className="studio-extra"><summary>Leave a personal mark <span aria-hidden="true">＋</span></summary><HankoRitual/></details>
    </div>
    <div className="dojo7-exit"><ScrollCue label="Scroll into the practice"/></div>
  </div>;
}
