'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type RefObject, type ReactNode } from 'react';
import { useJourney } from '@/core/world';
import { useParam } from '@/core/params';
import { advanceJourney } from '@/core/director';
import { FORGE_HOME, FORGE_TARGETS, OWN_TARGET, OWN_RADIUS, pointFromClient, normalizeTrainingSeed, type Point, type Size } from '@/core/gates';
import { beginGateDrag, moveGateDrag, cancelGateDrag, releaseForge, seatForge, startTraining, releaseOwn, claimOwn, releaseFleet, dispatchFleet } from '@/core/gate-director';

type Variables = CSSProperties & Record<`--${string}`, string | number>;
type Travel = { dx: number; dy: number; elapsed: number };
type DragOrigin = { pointer: number; index: number; x: number; y: number; at: number; offset: Point; element: HTMLButtonElement };
const FLEET_HOME: Point[] = [{ x: .2, y: .77 }, { x: .5, y: .77 }, { x: .8, y: .77 }];

/** Events express intent; shared parameters carry every continuous movement. */
function useGateDrag(board: RefObject<HTMLDivElement | null>, home: (index: number) => Point, blocked: (index: number) => boolean,
  finish: (index: number, point: Point, size: Size, travel: Travel) => boolean) {
  const origin = useRef<DragOrigin | null>(null);
  const [armed, setArmed] = useState<number | null>(null);
  const reduced = useJourney(state => state.reducedMotion);
  const cancel = useCallback(() => {
    const start = origin.current;
    origin.current = null;
    setArmed(null);
    if (start) {
      cancelGateDrag();
      if (start.element.hasPointerCapture(start.pointer)) start.element.releasePointerCapture(start.pointer);
    }
  }, []);
  useEffect(() => {
    window.addEventListener('blur', cancel);
    return () => { window.removeEventListener('blur', cancel); if (origin.current) cancelGateDrag(); origin.current = null; };
  }, [cancel]);
  useEffect(() => { cancel(); }, [reduced, cancel]);
  const onDown = (event: PointerEvent<HTMLButtonElement>, index: number) => {
    if (blocked(index) || !event.isPrimary || event.button !== 0 || origin.current || !board.current) return;
    const rect = board.current.getBoundingClientRect(), hit = pointFromClient({ x: event.clientX, y: event.clientY }, rect), anchor = home(index);
    if (!beginGateDrag(index, anchor)) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    origin.current = { pointer: event.pointerId, index, x: event.clientX, y: event.clientY, at: performance.now(), offset: { x: hit.x - anchor.x, y: hit.y - anchor.y }, element: event.currentTarget };
    setArmed(index);
  };
  const pointAt = (event: PointerEvent<HTMLButtonElement>, start: DragOrigin) => {
    const rect = board.current!.getBoundingClientRect(), point = pointFromClient({ x: event.clientX, y: event.clientY }, rect);
    return { point: { x: point.x - start.offset.x, y: point.y - start.offset.y }, size: { width: rect.width, height: rect.height } };
  };
  const onMove = (event: PointerEvent<HTMLButtonElement>) => {
    const start = origin.current;
    if (!start || start.pointer !== event.pointerId || !board.current) return;
    event.preventDefault();
    moveGateDrag(start.index, pointAt(event, start).point);
  };
  const onUp = (event: PointerEvent<HTMLButtonElement>) => {
    const start = origin.current;
    if (!start || start.pointer !== event.pointerId || !board.current) return;
    event.preventDefault();
    const { point, size } = pointAt(event, start);
    origin.current = null;
    setArmed(null);
    finish(start.index, point, size, { dx: event.clientX - start.x, dy: event.clientY - start.y, elapsed: Math.max(1, performance.now() - start.at) });
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return { armed, onDown, onMove, onUp, cancel };
}

function DragBindings({ index, label, className, disabled, drag, onKeyboard, children }: {
  index: number; label: string; className: string; disabled: boolean; drag: ReturnType<typeof useGateDrag>; onKeyboard: () => void; children: ReactNode;
}) {
  return <button type="button" className={className} aria-label={label} disabled={disabled} draggable={false}
    onPointerDown={event => drag.onDown(event, index)} onPointerMove={drag.onMove} onPointerUp={drag.onUp}
    onPointerCancel={drag.cancel} onLostPointerCapture={drag.cancel} onBlur={drag.cancel}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); drag.cancel(); }
      else if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) { event.preventDefault(); drag.cancel(); onKeyboard(); }
    }}
    onClick={event => event.preventDefault()}>{children}</button>;
}

function ForgeBoard() {
  const board = useRef<HTMLDivElement>(null);
  const seated = useJourney(state => state.forgeSeated), settled = useJourney(state => state.forgeSettled);
  const active = useParam('gateActive');
  const pointerSnapBusy = active >= 0 && seated.includes(active) && !settled.includes(active);
  const drag = useGateDrag(board, index => FORGE_HOME[index], index => seated.includes(index) || pointerSnapBusy, (index, point, size) => releaseForge(index, point, size));
  const selected = drag.armed ?? active;
  const next = [0, 1, 2].find(index => !seated.includes(index));
  return <div className="gate5-rite gate5-forge">
    <div className="gate5-board-head"><span>鍛 / THE LATTICE</span><span>{settled.length} / 3 CONNECTED</span></div>
    <div ref={board} className="gate5-board forge5-field" role="group" aria-label="Forge lattice. Drag each loose strand to its matching numbered socket.">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="forge5-blueprint" aria-hidden="true"><path d="M46 10 88 36 88 64 46 90 25 75 25 25Z M25 25 66 24 88 36 82 50 88 64 66 76 25 75 46 50Z M46 10 46 50 46 90 M25 25 82 50 25 75 M66 24 46 50 66 76"/></svg>
      <span className="forge5-axis" aria-hidden="true">STRUCTURE / 01—03</span>
      {FORGE_HOME.map((home, index) => {
        const target = FORGE_TARGETS[index];
        const vars: Variables = { '--home-x': home.x, '--home-y': home.y, '--target-x': target.x, '--target-y': target.y, '--seat': `var(--forge-${index},0)` };
        return <div key={index} className="forge5-thread" data-active={selected === index} data-seated={seated.includes(index)} data-settled={settled.includes(index)} style={vars}>
          <i className="forge5-wire forge5-wire-glow" aria-hidden="true"/><i className="forge5-wire" aria-hidden="true"/>
          <span className="forge5-socket" data-forge-slot={index} aria-hidden="true"><b>{index + 1}</b><i/></span>
          <DragBindings index={index} label={`Drag forge strand ${index + 1} into socket ${index + 1}; Enter or Space to seat it`} className="forge5-node" disabled={seated.includes(index) || pointerSnapBusy} drag={drag} onKeyboard={() => seatForge(index)}><span>{String(index + 1).padStart(2, '0')}</span><i aria-hidden="true"/></DragBindings>
        </div>;
      })}
      <div className="gate5-board-caption"><span>{settled.length === 3 ? 'EVERY CONNECTION HOLDS.' : drag.armed !== null ? 'FIND ITS PLACE. LET IT HOLD.' : 'PULL A STRAND INTO ITS NUMBERED SOCKET.'}</span><b aria-hidden="true">{settled.length === 3 ? '結' : '＋'}</b></div>
    </div>
    <button type="button" className="gate5-alt" disabled={next === undefined || pointerSnapBusy} onClick={() => { if (next !== undefined) seatForge(next); }}>{next === undefined ? 'The lattice is connected' : pointerSnapBusy ? 'Let the connection settle' : `Seat strand ${next + 1} · keyboard alternative`}<span aria-hidden="true">↗</span></button>
    <p className="gate5-quiet-status" role="status">{settled.length === 3 ? 'Three strands connected. The forge is complete.' : `${settled.length} of three strands connected.`}</p>
  </div>;
}

function TrainingBoard() {
  const seed = useJourney(state => state.trainSeed), phase = useJourney(state => state.trainPhase);
  const reveal = useParam('trainReveal');
  const [draft, setDraft] = useState('');
  const composing = useRef(false);
  const begin = (value: string) => {
    const normalized = normalizeTrainingSeed(value);
    setDraft(normalized ?? value);
    if (normalized !== null) startTraining(normalized);
  };
  const script = `intent.capture(${JSON.stringify(seed)});\ncontext.connect();\nworkflow.compile();\ncontrol.remains("you");`;
  const characters = Array.from(script);
  const written = phase === 'idle' ? '' : characters.slice(0, Math.floor(characters.length * Math.max(0, Math.min(1, reveal)))).join('');
  return <div className="gate5-rite gate5-train" data-phase={phase}>
    <div className="gate5-board-head"><span>修 / THE CONVERSATION</span><span>{phase === 'compiled' ? 'READY' : phase === 'writing' ? 'THE GHOST IS WRITING' : 'YOUR MOVE'}</span></div>
    <div className="gate5-board train5-terminal">
      <div className="train5-terminal-top" aria-hidden="true"><span>GHOST / HAND</span><span>LOCAL SESSION</span></div>
      <label htmlFor="training-code">Three characters. Your first move.</label>
      <div className="train5-prompt"><span aria-hidden="true">&gt;</span><input id="training-code" className="gate5-training-input" type="text" value={phase === 'idle' ? draft : seed} readOnly={phase !== 'idle'} autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={24} placeholder="begin…" aria-describedby="train5-help"
        onCompositionStart={() => { composing.current = true; }} onCompositionEnd={event => { composing.current = false; begin(event.currentTarget.value); }}
        onChange={event => { if (composing.current || (event.nativeEvent instanceof InputEvent && event.nativeEvent.isComposing)) setDraft(event.target.value); else begin(event.target.value); }}/><i aria-hidden="true"/></div>
      <p id="train5-help">{phase === 'idle' ? 'You start the thought. The ghost carries it forward.' : phase === 'writing' ? 'A little intent becomes a working shape.' : 'The system moves. The decision stays yours.'}</p>
      <div className="train5-writing" aria-hidden="true"><span className="train5-ghost">手</span><pre>{phase === 'idle' ? '// listening for your intention' : written}<span className="train5-caret">▍</span></pre></div>
      <div className="train5-compile" aria-hidden="true"><i/><span>{phase === 'compiled' ? 'COMPILED / HUMAN IN THE LOOP' : phase === 'writing' ? 'CONNECTING THE CONTEXT' : 'WAITING FOR A SPARK'}</span><b>{phase === 'compiled' ? '✓' : '＋'}</b></div>
    </div>
    <p className="gate5-demo-note">An illustrative command. Nothing is executed or sent.</p>
    <p className="gate5-quiet-status" role="status">{phase === 'compiled' ? 'The ghost finished the command. Training complete.' : phase === 'writing' ? 'The ghost is completing your command.' : 'Type three characters to begin.'}</p>
  </div>;
}

function OwnBoard() {
  const board = useRef<HTMLDivElement>(null);
  const phase = useJourney(state => state.ownPhase);
  const drag = useGateDrag(board, () => { const p = useJourney.getState().params; return { x: p.ownX, y: p.ownY }; }, () => phase !== 'idle', (_index, point, size, travel) => releaseOwn(point, size, Math.hypot(travel.dx, travel.dy)));
  return <div className="gate5-rite gate5-own" data-phase={phase}>
    <div className="gate5-board-head"><span>主 / THE SOVEREIGN LOCK</span><span>{phase === 'locked' ? 'YOURS' : phase === 'locking' ? 'CLAIMING' : 'UNCLAIMED'}</span></div>
    <div ref={board} className="gate5-board own5-field" role="group" aria-label="Sovereignty lock. Drag the tool into the circle." style={{ '--ring-x': OWN_TARGET.x, '--ring-y': OWN_TARGET.y, '--ring-radius': OWN_RADIUS } as Variables}>
      <div className="own5-orbit" aria-hidden="true"><i/><i/><i/><b>YOUR CIRCLE</b></div>
      <div className="own5-ring" data-own-target aria-hidden="true"><span>主</span><i className="own5-lock-mark">主</i><b>{phase === 'locked' ? 'SOVEREIGN' : 'PLACE THE TOOL'}</b><em/></div>
      <div className="own5-route" aria-hidden="true"><span>FROM BORROWED</span><i/><span>TO YOURS</span></div>
      <DragBindings index={0} label="Drag the tool into your sovereignty circle; Enter or Space to claim it" className="own5-tool" disabled={phase !== 'idle'} drag={drag} onKeyboard={claimOwn}><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 9 24 3 34 9 40 20 34 32 24 39 14 32 8 20Z M14 9 24 20 34 9 M24 20V39 M8 20H40 M14 32 24 20 34 32"/></svg><span>{phase === 'idle' ? 'TAKE HOLD' : 'HELD BY YOU'}</span></DragBindings>
      <div className="gate5-board-caption"><span>{phase === 'locked' ? 'YOUR TOOLS. YOUR TERMS.' : phase === 'locking' ? 'LET IT BECOME YOURS.' : drag.armed === 0 ? 'BRING IT INTO YOUR CIRCLE.' : 'TAKE THE TOOL. SET THE TERMS.'}</span><b aria-hidden="true">{phase === 'locked' ? '主' : '↗'}</b></div>
    </div>
    <button type="button" className="gate5-alt" disabled={phase !== 'idle'} onClick={claimOwn}>{phase === 'locked' ? 'Ownership established' : phase === 'locking' ? 'The lock is settling' : 'Place the tool · keyboard alternative'}<span aria-hidden="true">↗</span></button>
    <p className="gate5-quiet-status" role="status">{phase === 'locked' ? 'The tool is locked in your circle. Ownership established.' : phase === 'locking' ? 'The sovereignty lock is closing.' : 'The tool is waiting to be claimed.'}</p>
  </div>;
}

function FleetBoard() {
  const board = useRef<HTMLDivElement>(null);
  const sent = useJourney(state => state.fleetSent), settled = useJourney(state => state.fleetSettled);
  const active = useParam('gateActive');
  const [origins, setOrigins] = useState<Point[]>(FLEET_HOME);
  const drag = useGateDrag(board, index => FLEET_HOME[index], index => sent.includes(index), (index, point, _size, travel) => {
    const accepted = releaseFleet(index, travel);
    if (accepted) setOrigins(previous => previous.map((entry, at) => at === index ? point : entry));
    return accepted;
  });
  const selected = drag.armed ?? active;
  const next = [0, 1, 2].find(index => !sent.includes(index));
  const sendByKeyboard = (index: number) => {
    setOrigins(previous => previous.map((entry, at) => at === index ? FLEET_HOME[index] : entry));
    dispatchFleet(index);
  };
  return <div className="gate5-rite gate5-fleet">
    <div className="gate5-board-head"><span>霊 / THE FLEET</span><span>{settled.length} / 3 IN MOTION</span></div>
    <div ref={board} className="gate5-board fleet5-field" role="group" aria-label="Ghost fleet. Flick each hand upward into the dark.">
      <svg className="fleet5-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M20 78C20 50 28 27 43 0 M50 78V0 M80 78C80 50 72 27 57 0"/><path d="m44 12 6-9 6 9"/></svg>
      <span className="fleet5-destination" aria-hidden="true">INTO THE POSSIBLE</span>
      {FLEET_HOME.map((home, index) => <div key={index} className="fleet5-hand-wrap" data-active={selected === index && !sent.includes(index)} data-sent={sent.includes(index)} data-settled={settled.includes(index)} style={{ '--home-x': home.x, '--home-y': home.y, '--flight-x': origins[index].x, '--flight-y': origins[index].y, '--flight': `var(--fleet-${index},0)`, '--flight-lean': index - 1 } as Variables}>
        <i className="fleet5-wake" aria-hidden="true"/><DragBindings index={index} label={`Flick ghost hand ${index + 1} upward into the dark; Enter or Space to dispatch it`} className="fleet5-hand" disabled={sent.includes(index)} drag={drag} onKeyboard={() => sendByKeyboard(index)}><span aria-hidden="true">手</span><b>0{index + 1}</b><i aria-hidden="true"/></DragBindings>
        <span className="fleet5-arrival" aria-hidden="true">{settled.includes(index) ? 'DISPATCHED' : sent.includes(index) ? 'IN FLIGHT' : 'READY'}</span>
      </div>)}
      <div className="gate5-board-caption"><span>{settled.length === 3 ? 'ONE INTENTION. ALREADY IN MOTION.' : drag.armed !== null ? 'SEND IT UPWARD. LET GO.' : 'FLICK UP. A LONGER SWEEP WORKS TOO.'}</span><b aria-hidden="true">{settled.length === 3 ? '霊' : '↑'}</b></div>
    </div>
    <button type="button" className="gate5-alt" disabled={next === undefined} onClick={() => { if (next !== undefined) sendByKeyboard(next); }}>{next === undefined ? 'The fleet is moving' : `Dispatch hand ${next + 1} · keyboard alternative`}<span aria-hidden="true">↗</span></button>
    <p className="gate5-demo-note">A local dispatch study. No external agents are launched.</p>
    <p className="gate5-quiet-status" role="status">{settled.length === 3 ? 'All three hands dispatched. The fleet is complete.' : `${settled.length} of three hands dispatched.`}</p>
  </div>;
}

const GATES = [
  { glyph: '鍛', name: 'FORGE', overline: 'GIVE THE POSSIBLE A STRUCTURE.', first: 'Give form.', last: 'Make it hold.', body: 'Take a loose thread. Pull it into place. Give the whole thing something to stand on.', instruction: 'Three strands. Three connections. A foundation you can feel.', result: 'The structure holds. Build on it.' },
  { glyph: '修', name: 'TRAIN', overline: 'A LITTLE INTENT GOES A LONG WAY.', first: 'A spark.', last: 'Then a system.', body: 'You begin the thought. The ghost carries the thread. What it learns stays in your hands.', instruction: 'Type three characters. Watch the ghost find the shape.', result: 'A working shape. Your instinct still leads.' },
  { glyph: '主', name: 'OWN', overline: 'POWER NEEDS A PLACE TO BELONG.', first: 'The power.', last: 'In your hands.', body: 'A tool should answer to you. Bring it into your circle. Set the terms.', instruction: 'Take hold. Drag into the ring. Let the lock close.', result: 'The tools are yours. So is the next move.' },
  { glyph: '霊', name: 'FLEET', overline: 'ONE INTENTION. ROOM TO MULTIPLY.', first: 'One intent.', last: 'Many hands.', body: 'A single intention can move more than one hand. Send them where the work begins.', instruction: 'Flick the hands upward. Let the momentum carry them.', result: 'The fleet is moving. Follow what comes next.' },
];

export default function GatesScene({ gate }: { gate: number }) {
  const completed = useJourney(state => state.completedGates.includes(gate));
  const definition = GATES[gate - 1] ?? GATES[0];
  return <div className="gates-v5" data-gate={gate} data-complete={completed}>
    <div className="gate5-label"><span>04.{gate} / {definition.name}</span><span>{completed ? 'THE WAY IS OPEN.' : 'A PRACTICE. NOT A PROMISE.'}</span></div>
    <div className="gate5-stage">
      <div className="gate5-story"><span className="gate5-overline">{definition.overline}</span><h2 className="gate5-title">{definition.first}<br/><em>{definition.last}</em></h2><p className="gate5-lede">{completed ? definition.result : definition.body}</p><div className="gate5-instruction"><span aria-hidden="true">{definition.glyph}</span><p>{definition.instruction}</p></div><div className="gate5-sequence" aria-label={`Craft gate ${gate} of four`}>{GATES.map((entry, index) => <span key={entry.name} aria-current={gate === index + 1 ? 'step' : undefined}><i aria-hidden="true">{entry.glyph}</i><b>{entry.name}</b></span>)}</div></div>
      {gate === 1 ? <ForgeBoard/> : gate === 2 ? <TrainingBoard/> : gate === 3 ? <OwnBoard/> : <FleetBoard/>}
    </div>
    <div className="gate5-footer"><p role="status">{completed ? 'THE RITE IS COMPLETE. THE NEXT MOVE IS YOURS.' : 'COMPLETE THE RITE TO OPEN THE WAY.'}</p><button type="button" className="journey-next gate5-next" disabled={!completed} onClick={advanceJourney}>{completed ? gate === 4 ? 'Follow what comes next' : 'Pass through the gate' : 'First, complete the rite'}<span aria-hidden="true">↓</span></button></div>
  </div>;
}
