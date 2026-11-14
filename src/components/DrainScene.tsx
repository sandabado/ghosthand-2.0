'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { TIMING } from '@/core/config';
import { drainAudit } from '@/core/fixtures';
import { useJourney } from '@/core/world';
import { releaseDrain, selectDrainAudit, updateDrainGesture } from '@/core/director';
import ScrollCue from './ScrollCue';

type GestureOrigin = { pointer: number; x: number; y: number };

/** The upward rite is isolated from native page scrolling. It never moves the camera. */
export default function DrainScene() {
  const released = useJourney(state => state.drainReleased);
  const settled = useJourney(state => state.drainSettled);
  const selected = useJourney(state => state.drainAuditIndex);
  const source = useJourney(state => state.drainAuditSource);
  const [armed, setArmed] = useState(false);
  const [ready, setReady] = useState(false);
  const origin = useRef<GestureOrigin | null>(null);
  const readyRef = useRef(false);
  const item = drainAudit[Math.max(0, Math.min(drainAudit.length - 1, selected))];
  const phase = settled ? 'free' : released ? 'releasing' : 'bound';

  const cancel = useCallback(() => {
    const wasActive = origin.current !== null;
    origin.current = null;
    readyRef.current = false;
    setArmed(false);
    setReady(false);
    if (wasActive) updateDrainGesture(0);
  }, []);

  useEffect(() => {
    window.addEventListener('blur', cancel);
    return () => {
      window.removeEventListener('blur', cancel);
      origin.current = null;
    };
  }, [cancel]);
  useEffect(() => { if (released) cancel(); }, [released, cancel]);

  const onDown = (event: PointerEvent<HTMLDivElement>) => {
    if (released || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    origin.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY };
    readyRef.current = false;
    setReady(false);
    setArmed(true);
    updateDrainGesture(0);
  };
  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = origin.current;
    if (!start || start.pointer !== event.pointerId || released) return;
    event.preventDefault();
    const up = start.y - event.clientY;
    const lateral = Math.abs(start.x - event.clientX);
    const progress = up > lateral ? Math.max(0, Math.min(1, up / TIMING.lookUpPixels)) : 0;
    updateDrainGesture(progress);
    const nextReady = progress >= 1;
    if (nextReady !== readyRef.current) {
      readyRef.current = nextReady;
      setReady(nextReady);
    }
  };
  const onUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = origin.current;
    if (!start || start.pointer !== event.pointerId) return;
    event.preventDefault();
    const up = start.y - event.clientY;
    const lateral = Math.abs(start.x - event.clientX);
    const committed = !released && up >= TIMING.lookUpPixels && up > lateral;
    origin.current = null;
    readyRef.current = false;
    setArmed(false);
    setReady(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (committed) releaseDrain('pointer');
    else updateDrainGesture(0);
  };

  const status = settled ? 'The threads are released. The way is open.' : released ? 'The threads are releasing. Stay with the dawn.' : ready ? 'The upward stroke is ready. Release to let go.' : armed ? 'Draw upward, then release.' : 'Follow a thread, then deliberately look up.';

  return <div className="drain-v4" data-phase={phase} data-armed={armed} data-ready={ready}>
    <div className="drain-v4-label"><span>03 / THE DRAIN</span><span>{settled ? 'THE WEIGHT HAS LIFTED.' : released ? 'THE THREADS LET GO.' : 'THE COST OF BORROWED POWER'}</span></div>
    <div className="drain-v4-stage">
      <div className="drain-story">
        <span className="drain-overline">{settled ? 'A DIFFERENT DAWN.' : released ? 'NO NEED TO HOLD ON.' : 'EVERY THREAD TAKES SOMETHING.'}</span>
        <h2 className="drain-v4-title">{settled ? <>Air,<br/><em>again.</em></> : released ? <>Let it<br/><em>leave.</em></> : <>What is<br/><em>owning you?</em></>}</h2>
        <p className="drain-v4-lede">{settled ? 'Nothing pulling at your attention. The next move is yours.' : released ? 'The grip loosens. The room opens. Stay with the light.' : 'Rent. Noise. Friction. Follow an invisible thread and see what it carries.'}</p>

        <div className="drain-look-zone" role="group" aria-label={released ? 'Look up complete' : 'Look up interaction area'} aria-describedby="drain-look-help" aria-disabled={released} tabIndex={released ? -1 : 0}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={cancel} onLostPointerCapture={cancel} onBlur={cancel}
          onKeyDown={event => {
            if (event.key === 'Escape') { event.preventDefault(); cancel(); }
            if (event.key === 'ArrowUp' && !released) { event.preventDefault(); cancel(); releaseDrain('keyboard'); }
          }}>
          <div className="drain-gesture-rail" aria-hidden="true"><i/></div>
          <span className="drain-look-arrow" aria-hidden="true">{settled ? '手' : '↑'}</span>
          <div><strong>{settled ? 'A little more room.' : released ? 'Let the threads fall away.' : ready ? 'Release.' : armed ? 'Keep going.' : 'Look up.'}</strong>
            <span id="drain-look-help">{released ? 'A little room to choose.' : 'Press here. Draw upward. Release.'}</span>
            <small>{settled ? 'NO PULL. JUST POSSIBILITY.' : released ? 'LET THE WEIGHT LEAVE.' : 'KEYBOARD / FOCUS HERE + ↑'}</small></div>
        </div>
        <button className="keyboard-action drain-key-release" type="button" disabled={released} onClick={event => releaseDrain(event.detail === 0 ? 'keyboard' : 'pointer')}>{settled ? 'The threads are released' : released ? 'The threads are letting go' : 'Release the threads · keyboard alternative'}</button>
        <p className="drain-phase-status sr-only" role="status" aria-live="polite">{status}</p>
      </div>

      <aside className="drain-inspection" aria-label="Illustrative filament audit">
        <div className="drain-airspace" aria-hidden="true"><span>{settled ? 'NO PULL. JUST POSSIBILITY.' : released ? 'FOLLOW THE RELEASE.' : 'FOLLOW A THREAD.'}</span><i>+</i><span>{released ? 'THE LIGHT IS COMING THROUGH.' : 'HOVER A FILAMENT TO TRACE IT.'}</span></div>
        {!settled ? <>
          <div className="drain-trace-card" role="group" aria-label="Selected illustrative thread" data-source={source}>
            <div className="drain-trace-top"><span>{released ? 'THE GRIP IS LOOSENING' : source === 'filament' ? 'FILAMENT TRACED' : 'A THREAD IN THE SYSTEM'}</span><span>{String(selected + 1).padStart(2, '0')} / {String(drainAudit.length).padStart(2, '0')}</span></div>
            <h3>{item?.name}</h3><p className="drain-trace-rate">{item?.rate}</p>
            <p id="drain-trace-meaning" className="drain-trace-meaning">{item?.meaning}</p>
          </div>
          <details id="drain-thread-list" className="drain-thread-list">
            <summary><span>Inspect all threads</span><span>{drainAudit.length} / AUDIT <b aria-hidden="true">+</b></span></summary>
            <ul>{drainAudit.map((thread, index) => <li key={thread.id}><button type="button" className="drain-thread-option" disabled={released} aria-pressed={selected === index} aria-describedby={selected === index ? 'drain-trace-meaning' : undefined}
              onPointerEnter={() => { if (!released) selectDrainAudit(index, 'pointer'); }}
              onFocus={() => selectDrainAudit(index, 'keyboard')}
              onClick={event => selectDrainAudit(index, event.detail === 0 ? 'keyboard' : 'pointer')}><span>{thread.name}</span><b>{thread.rate}</b></button></li>)}</ul>
          </details>
        </> : <div className="drain-free-space"><span aria-hidden="true">手</span><p>Less pulling.<br/>More room to make.</p><small>THE NEXT MOVE IS YOURS.</small></div>}
      </aside>
    </div>
    <div className="drain-v4-bottom"><p>{settled ? 'THE WAY IS OPEN.' : released ? 'STAY WITH THE DAWN.' : 'ILLUSTRATIVE BURDENS. NOT YOUR ACCOUNT DATA.'}</p><ScrollCue ready={settled} label="Scroll into the craft" waiting={released?'Stay with the dawn':'First, release the threads'}/></div>
  </div>;
}
