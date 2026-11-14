'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { SCENES, SCENE_IDS, TIMING, type SceneId } from '@/core/config';
import { useJourney } from '@/core/world';
import { useParam } from '@/core/params';
import { queueInput } from '@/core/input';
import { HAND_SVG } from '@/systems/ink/sources';
import DrainScene from './DrainScene';
import { memberBuilds, relics, stations } from '@/core/fixtures';
import { advanceJourney, completeGate, commitFork, navigate, sealRitual, resetJourney, setSelectedMember, setSelectedRelic } from '@/core/director';

function SceneLabel({ scene, detail }: { scene: SceneId; detail?: string }) {
  const def = SCENES[scene];
  return <div className="scene-label"><span>{def.index} / {def.title}</span><span>{detail ?? `${def.glyph} · ${def.verb}`}</span></div>;
}

function NextStep({ children = 'Continue the descent', disabled = false }: { children?: ReactNode; disabled?: boolean }) {
  return <button className="journey-next" disabled={disabled} onClick={advanceJourney}>{children}<span aria-hidden="true">↓</span></button>;
}

/** Static authored-study companion for reduced motion. */
function HandFixture() {
  return <div className="ink-hand-fallback" aria-hidden="true" dangerouslySetInnerHTML={{__html:HAND_SVG}}/>;
}

function Threshold() {
  const ready = useJourney(s => s.thresholdReady);
  return <><SceneLabel scene="THRESHOLD" detail="A command, not a request."/><div className="threshold-body"><div className="summon-line"><span aria-hidden="true">&gt; </span><span>summon</span><i aria-hidden="true">_</i></div><h1>COMMAND<br/>THE <em>UNSEEN.</em></h1><p>Human instinct.<br/>Sovereign systems.<br/>The work is yours.</p><HandFixture/><div className="threshold-action"><NextStep disabled={!ready}>{ready ? 'Enter the descent' : 'The hand is arriving'}</NextStep><span className="fixture-note">V3 INK STUDY / AUTHORED PATHS, AWAITING CANONICAL SOURCE</span></div></div><span className="threshold-sigil" aria-hidden="true">手</span></>;
}

function Legend() {
  return <><SceneLabel scene="LEGEND"/><div className="scene-title"><span className="scene-overline">TWO INSTINCTS. ONE PRACTICE.</span><h2>The work needs<br/><em>both hands.</em></h2></div><div className="founder-diptych"><article><div className="founder-fixture" aria-label="Chris Kyser portrait placeholder">CK<span>PORTRAIT FIXTURE</span></div><span className="scene-overline">ARCHITECTURE / INTELLIGENCE</span><h3>Chris Kyser</h3><p>Application systems, knowledge architecture, and the technical foundations beneath the experience.</p></article><div className="blade-relay" aria-hidden="true"/><article><div className="founder-fixture" aria-label="Jesse Gawlik portrait placeholder">JG<span>PORTRAIT FIXTURE</span></div><span className="scene-overline">PRODUCT / CREATIVE SYSTEMS</span><h3>Jesse Gawlik</h3><p>Experience strategy, product design, and the instinct that makes complex things feel clear.</p></article></div><div className="credential-fragments" aria-label="Areas of prior experience"><span>PRODUCT FOUNDATIONS</span><span>KNOWLEDGE SYSTEMS</span><span>DESIGN OPERATIONS</span><span>BRAND WORLDS</span></div><NextStep>Look beneath the surface</NextStep></>;
}


type StrokeProps = { label: string; className?: string; onCommit:()=>void; disabled?:boolean; children?:ReactNode; };
/** A click never commits. Keyboard stroke is arm → travel → release. */
function StrokeCommit({label,className='',onCommit,disabled=false,children}:StrokeProps) {
  const [armed,setArmed]=useState(false);
  const [travelled,setTravelled]=useState(false);
  const origin=useRef<{x:number;y:number}|null>(null);
  const done=()=>{setArmed(false);setTravelled(false);origin.current=null;onCommit();};
  const cancel=()=>{setArmed(false);setTravelled(false);origin.current=null;};
  const onDown=(event:PointerEvent<HTMLButtonElement>)=>{if(disabled)return;event.currentTarget.setPointerCapture(event.pointerId);origin.current={x:event.clientX,y:event.clientY};setArmed(true);setTravelled(false);};
  const onMove=(event:PointerEvent<HTMLButtonElement>)=>{if(!origin.current)return;if(Math.hypot(event.clientX-origin.current.x,event.clientY-origin.current.y)>=TIMING.strokePixels)setTravelled(true);};
  const onUp=(event:PointerEvent<HTMLButtonElement>)=>{if(!origin.current)return;const distance=Math.hypot(event.clientX-origin.current.x,event.clientY-origin.current.y);if(distance>=TIMING.strokePixels)done();else cancel();};
  const onKey=(event:KeyboardEvent<HTMLButtonElement>)=>{if(event.key===' '){event.preventDefault();origin.current=null;setArmed(true);setTravelled(false);}else if(armed&&event.key==='ArrowDown'){event.preventDefault();setTravelled(true);}else if(armed&&travelled&&event.key==='Enter'){event.preventDefault();done();}else if(event.key==='Escape'){event.preventDefault();cancel();}else if(event.key==='Enter'){event.preventDefault();}};
  return <button type="button" className={`stroke-commit ${className} ${armed?'is-armed':''} ${travelled?'has-travelled':''}`} aria-label={label} disabled={disabled} onClick={e=>e.preventDefault()} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={cancel} onKeyDown={onKey} onBlur={cancel}>{children??label}<span className="stroke-guide" aria-hidden="true"><i/>{travelled?'RELEASE TO COMMIT':armed?'DRAW YOUR STROKE':'PRESS · DRAW · RELEASE'}</span><span className="sr-only" aria-live="polite">{travelled?'Stroke ready. Release pointer or press Enter to commit.':armed?'Armed. Drag at least forty pixels, or press Arrow Down then Enter.':'Keyboard: Space to arm, Arrow Down to draw, Enter to commit.'}</span></button>;
}

function LatticeGate({done}:{done:boolean}) {
  const [strands,setStrands]=useState<number[]>([]);
  const start=useRef<{x:number;y:number;index:number}|null>(null);
  const seat=(index:number)=>{if(strands.includes(index)||done)return;const next=[...strands,index];setStrands(next);if(next.length===3)completeGate(1);};
  return <div className="lattice-rite"><div className="lattice-field" aria-label="Three lattice strands">{[0,1,2].map(index=><button key={index} className={`lattice-strand ${done||strands.includes(index)?'is-seated':''}`} aria-label={`Drag lattice strand ${index+1} into place`} disabled={done||strands.includes(index)} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);start.current={x:e.clientX,y:e.clientY,index};}} onPointerUp={e=>{const p=start.current;start.current=null;if(p&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>=TIMING.strokePixels)seat(index);}} onPointerCancel={()=>{start.current=null;}}><span>0{index+1}</span><i/><b>{done||strands.includes(index)?'SEATED':'DRAW INTO PLACE'}</b></button>)}</div><button className="keyboard-action" disabled={done} onClick={()=>seat([0,1,2].find(index=>!strands.includes(index))??0)}>{done?'Lattice complete':'Seat the next strand · keyboard alternative'}</button></div>;
}

function TrainGate({done}:{done:boolean}) {
  const [code,setCode]=useState('');
  return <div className={`training-terminal ${done?'is-compiled':''}`}><div><span>GHOST / LOCAL TERMINAL</span><span>{done?'COMPILED':'AWAITING INPUT'}</span></div><label htmlFor="training-code">Three keystrokes begin the conversation.</label><span className="terminal-prompt">&gt; <input id="training-code" value={code} readOnly={done} autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="type..." maxLength={24} onChange={event=>{setCode(event.target.value);if(event.target.value.length>=3)completeGate(2);}}/></span><pre aria-live="polite">{done?'hand.connect();\ncontext.compile();\nhuman.retainControl();\n\n✓ a working foundation.':'// your input is the beginning\n// the ghost completes the loop'}</pre><span className="fixture-note">ILLUSTRATIVE CODE / NO COMMANDS ARE EXECUTED</span></div>;
}

function OwnGate({done}:{done:boolean}) {
  const ring=useRef<HTMLDivElement>(null);
  return <div className="ownership-rite"><div ref={ring} className={`ownership-ring ${done?'is-owned':''}`}><span>{done?'主':'＋'}</span><b>{done?'YOUR TOOLS. YOUR TERMS.':'DROP THE TOOL HERE'}</b></div><button className="ownership-tool" disabled={done} aria-label="Drag the tool into the ownership ring" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={e=>{const rect=ring.current?.getBoundingClientRect();if(rect&&e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom)completeGate(3);}} draggable={!done} onDragStart={e=>e.dataTransfer.setData('text/plain','ghost-tool')} onDragEnd={e=>{const rect=ring.current?.getBoundingClientRect();if(rect&&e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom)completeGate(3);}}><span aria-hidden="true">⌘</span>{done?'OWNED':'TAKE THE TOOL'}</button><button className="keyboard-action" disabled={done} onClick={()=>completeGate(3)}>{done?'Ownership established':'Place the tool in the ring · keyboard alternative'}</button></div>;
}

function FleetGate({done}:{done:boolean}) {
  const [sent,setSent]=useState<number[]>([]);
  const origin=useRef<{x:number;y:number}|null>(null);
  const dispatch=(index:number)=>{if(done||sent.includes(index))return;const next=[...sent,index];setSent(next);if(next.length===3)completeGate(4);};
  return <div className="fleet-rite"><div className="fleet-hands">{[0,1,2].map(index=><button key={index} disabled={done||sent.includes(index)} className={done||sent.includes(index)?'is-dispatched':''} aria-label={`Flick ghost hand ${index+1} into the dark`} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);origin.current={x:e.clientX,y:e.clientY};}} onPointerUp={e=>{const p=origin.current;origin.current=null;if(p&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>=TIMING.strokePixels)dispatch(index);}} onPointerCancel={()=>{origin.current=null;}}><span aria-hidden="true">手</span><i>{done||sent.includes(index)?'DISPATCHED':`HAND 0${index+1}`}</i></button>)}</div><button className="keyboard-action" disabled={done} onClick={()=>dispatch([0,1,2].find(index=>!sent.includes(index))??0)}>{done?'The fleet is moving':'Dispatch the next hand · keyboard alternative'}</button><span className="fixture-note">FLEET INPUT FIXTURE / NO EXTERNAL AGENTS ARE LAUNCHED</span></div>;
}

function CraftGate({gate}:{gate:number}) {
  const completed=useJourney(s=>s.completedGates.includes(gate));
  const scene=`CRAFT_F${gate}` as SceneId;
  const def=SCENES[scene];
  const station=stations[gate-1];
  const titles=[<>Give form<br/>to <em>the possible.</em></>,<>Teach the system.<br/><em>Keep the instinct.</em></>,<>The tools<br/>should <em>be yours.</em></>,<>One intention.<br/><em>Many hands.</em></>];
  return <><SceneLabel scene={scene} detail={`GATE ${gate} OF 4 / ${completed?'RITE COMPLETE':'INPUT FIXTURE'}`}/><div className="craft-layout"><div className="scene-title"><span className="gate-kanji" aria-hidden="true">{def.glyph}</span><span className="scene-overline">{station?.stop??def.title}</span><h2>{titles[gate-1]}</h2><p className="scene-lede">{station?.meaning}</p><span className="interaction-instruction">{station?.interact}</span></div><div className="gate-interaction">{gate===1?<LatticeGate done={completed}/>:gate===2?<TrainGate done={completed}/>:gate===3?<OwnGate done={completed}/>:<FleetGate done={completed}/>}</div></div><div className="gate-footer"><span role="status">{completed?'THE WAY IS OPEN.':'COMPLETE THE RITE TO OPEN THE WAY.'}</span><NextStep disabled={!completed}>{gate===4?'Follow what comes next':'Pass through the gate'}</NextStep></div></>;
}

function Pursuit() { return <><SceneLabel scene="PURSUIT" detail="ONE INVITATION / ONE PURSUIT"/><div className="ceremony-title pursuit-title"><span className="scene-overline">THE BLADE LEADS.</span><h2>Follow.</h2><p>The next moment is already in motion.</p></div></>; }

function Merge() {
  const time=useParam('ceremonyTime');
  const phase=time<TIMING.merge.summon?'WAIT':time<TIMING.merge.handStart?'SUMMON':time<TIMING.merge.swordStart?'INK':time<TIMING.merge.flashStart?'DESCENT':time<TIMING.merge.fork?'THE CUT':'THE CHOICE';
  return <><SceneLabel scene="MERGE" detail={`LOCAL CLOCK / ${time.toFixed(1)}s`}/><div className="merge-content"><div className="summon-line"><span aria-hidden="true">&gt; </span><span>summon</span><i aria-hidden="true">_</i></div><HandFixture/><div className="merge-title"><span className="scene-overline">THOUGHT. INSTRUMENT. INTENTION.</span><h2>One hand.<br/><em>One purpose.</em></h2></div><div className="ceremony-readout" aria-live="off"><span>{phase}</span><span>FORK / {TIMING.merge.fork.toFixed(1)}s</span></div></div></>;
}

function Fork() {
  return <><SceneLabel scene="FORK" detail="THE WAY IS A CHOICE."/><div className="fork-heading"><span className="scene-overline">TWO DESTINIES / ONE STROKE</span><h2>Choose what<br/><em>holds you.</em></h2></div><div className="fork-halves"><StrokeCommit className="fork-half fork-sovereign" label="Commit to Forge the blade" onCommit={()=>commitFork('DOJO')}><span className="fork-glyph" aria-hidden="true">主</span><span className="fork-number">01 / SOVEREIGN</span><strong>FORGE<br/>THE BLADE.</strong><span className="fork-copy">Build the instinct.<br/>Own the instrument.</span></StrokeCommit><StrokeCommit className="fork-half fork-chains" label="Commit to Wear the chains" onCommit={()=>commitFork('CHAINS_HOLD')}><span className="fork-glyph" aria-hidden="true">縛</span><span className="fork-number">02 / BORROWED</span><strong>WEAR<br/>THE CHAINS.</strong><span className="fork-copy">The familiar room.<br/>The borrowed power.</span></StrokeCommit></div><p className="fork-instruction">Pointer: press, draw at least {TIMING.strokePixels}px, release. Keyboard: focus a half, Space → ↓ → Enter. Escape cancels.</p></>;
}

function Dojo() {
  const selected=useJourney(s=>s.selectedMember);
  const sealed=useJourney(s=>s.dojoSeal);
  const reduced=useJourney(s=>s.reducedMotion);
  const [pointerStatus,setPointerStatus]=useState('');
  const [tiltEnabled,setTiltEnabled]=useState(false);
  const drag=useRef<{x:number;y:number}|null>(null);
  const lookArea=useRef<HTMLDivElement>(null);
  const member=memberBuilds[selected]??memberBuilds[0];
  useEffect(()=>{if(!tiltEnabled||reduced)return;const handle=(event:DeviceOrientationEvent)=>queueInput({dx:(event.gamma??0)/300,dy:((event.beta??45)-45)/300});window.addEventListener('deviceorientation',handle);return()=>window.removeEventListener('deviceorientation',handle);},[tiltEnabled,reduced]);
  const tilt=async()=>{try{const device=DeviceOrientationEvent as typeof DeviceOrientationEvent&{requestPermission?:()=>Promise<string>};if(device.requestPermission&&await device.requestPermission()!=='granted'){setPointerStatus('Tilt permission was not granted. Drag controls remain available.');return;}setTiltEnabled(value=>!value);}catch{setPointerStatus('Tilt is unavailable. Use drag or keyboard controls.');}};
  return <><SceneLabel scene="DOJO" detail="ENTER / A BOUNDED FOUNDATION CHAMBER"/><div className="dojo-heading"><div className="scene-title"><span className="scene-overline">PRACTICE BECOMES A PLACE.</span><h2>Enter<br/><em>the dojo.</em></h2></div><p className="scene-lede">Six windows into what comes next.<br/>Explore the chamber. Follow your instinct.</p></div><div className="dojo-layout"><div><div ref={lookArea} tabIndex={0} className="dojo-look-area" role="group" aria-label="Dojo movement controls" onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);drag.current={x:event.clientX,y:event.clientY};}} onPointerMove={event=>{if(!drag.current||reduced)return;queueInput({dx:(event.clientX-drag.current.x)/180,dy:(event.clientY-drag.current.y)/180});drag.current={x:event.clientX,y:event.clientY};}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}><span aria-hidden="true">手</span><strong>Move with intent.</strong><span>W / A / S / D · drag this field · optional tilt</span></div><div className="dojo-input-options"><button className="keyboard-action" disabled={reduced} onClick={async()=>{try{await lookArea.current?.requestPointerLock();setPointerStatus('Pointer captured. Move to explore; Escape releases.');}catch{setPointerStatus('Pointer capture unavailable. Drag or use WASD instead.');}}}>Capture pointer</button><button className="keyboard-action" disabled={reduced} onClick={tilt}>{tiltEnabled?'Disable tilt':'Enable tilt'}</button></div><p className="input-status" role="status">{pointerStatus||'Motion stays inside the chamber. Escape releases pointer capture.'}</p></div><div className="member-scrolls"><span className="scene-overline">SIX MEMBER BUILD FIXTURES / SHADER TEXTURES</span><div>{memberBuilds.map((build,index)=><button key={build.id} aria-pressed={selected===index} onClick={()=>setSelectedMember(index)}><span>0{index+1}</span><strong>{build.title}</strong><span aria-hidden="true">↗</span></button>)}</div><p><strong>{member?.title}</strong><span>{member?.description}</span><small>{member?.maker} / Real member media is not supplied.</small></p></div></div><div className="dojo-offering"><div><span className="scene-overline">THE HANKO / JOIN RITUAL FIXTURE</span><h3>A place for<br/>your own mark.</h3><p>No membership is created. Terms and community systems await a later incantation.</p></div><StrokeCommit className={`ritual-seal dojo-seal ${sealed?'is-sealed':''}`} label={sealed?'Dojo hanko already sealed':'Commit the Dojo hanko seal'} disabled={sealed} onCommit={()=>sealRitual('dojo')}><span aria-hidden="true">手</span><strong>{sealed?'MARK RECEIVED':'LEAVE YOUR MARK'}</strong></StrokeCommit></div><button className="journey-next" onClick={()=>navigate('OATH')}>Carry it forward<span aria-hidden="true">↓</span></button></>;
}

function Commission() {
  const selected=useJourney(s=>s.selectedRelic);
  const sealed=useJourney(s=>s.commissionSeal);
  const relic=relics[selected]??relics[0];
  return <><SceneLabel scene="COMMISSION" detail="THE SMITHY / FIXTURE CATALOG"/><div className="commission-layout"><div className="scene-title"><span className="scene-overline">BRING THE IMPOSSIBLE THING.</span><h2>Some tools<br/>must be <em>made.</em></h2><p className="scene-lede">A purpose-built instrument.<br/>An idea with a particular shape.<br/>A different kind of commission.</p><span className="fixture-note">EXPLORATORY OFFERING / NO ORDER OR PAYMENT IS CREATED</span></div><div className="relic-scroll"><span className="catalog-heading">GHOST HAND / RELICS / FOUNDATION CATALOG</span><div className="relic-index">{relics.map((item,index)=><button key={item.id} aria-pressed={index===selected} onClick={()=>setSelectedRelic(index)}>0{index+1}<span>{item.title}</span></button>)}</div><span className="relic-id">{relic?.id}</span><h3>{relic?.title}</h3><span className="relic-material">{relic?.material}</span><p>{relic?.description}</p><div className="commission-ritual"><StrokeCommit className={`ritual-seal commission-seal ${sealed?'is-sealed':''}`} label={sealed?'Commission seal already committed':'Commit the Commission seal'} disabled={sealed} onCommit={()=>sealRitual('commission')}><span aria-hidden="true">委</span><strong>{sealed?'INTENTION RECORDED':'SEAL THE INTENTION'}</strong></StrokeCommit><span>ILLUSTRATIVE SEAL<br/>NO COMMERCIAL COMMITMENT</span></div></div></div><button className="journey-next" onClick={()=>navigate('OATH')}>Continue to the oath<span aria-hidden="true">↓</span></button></>;
}

function ChainsHold() {
  return <><SceneLabel scene="CHAINS_HOLD" detail="ONE ROOM. ONE DOOR."/><div className="chains-hold"><span className="chains-glyph" aria-hidden="true">縛</span><h2>The door<br/>is <em>still yours.</em></h2><p>Nothing needs to be bought.<br/>You can simply choose again.</p><button className="green-doorway" onClick={()=>navigate('FORK')} aria-label="Step through the green doorway and return to the Fork"><span className="door-frame" aria-hidden="true"/><span>ONE STEP / RETURN TO THE FORK</span><b aria-hidden="true">↑</b></button></div></>;
}

function Oath() {
  const time=useParam('time');
  const reduced=useJourney(s=>s.reducedMotion);
  const greetings=['Welcome','ようこそ','Bienvenido','Willkommen','手'];
  const phase=time/TIMING.greeting;
  const index=Math.floor(phase)%greetings.length;
  const dissolve=reduced?1:Math.min(1,(phase%1)*2);
  return <><SceneLabel scene="OATH" detail="THE BLADE RESTS. THE PRACTICE REMAINS."/><div className="oath-content"><span className="scene-overline">NOT AN ENDING. AN INTENTION.</span><div className="oath-greeting" aria-hidden="true"><span style={{opacity:reduced?0:1-dissolve}}>{greetings[index]}</span><span className="oath-hand" style={{opacity:dissolve}}>手</span></div><h2>What you make<br/><em>is what you keep.</em></h2><p>The hand is yours.<br/>The next move is too.</p><button className="keyboard-action" onClick={resetJourney}>Begin a new journey · resets all marks and counters</button></div></>;
}

export default function SceneDirector({sceneOverride}:{sceneOverride?:SceneId}={}) {
  const activeScene=useJourney(s=>s.scene);
  const scene=sceneOverride??activeScene;
  const reset=useJourney(s=>s.resetVersion);
  let content:ReactNode;
  switch(scene){case 'THRESHOLD':content=<Threshold/>;break;case 'LEGEND':content=<Legend/>;break;case 'DRAIN':content=<DrainScene/>;break;case 'CRAFT_F1':case 'CRAFT_F2':case 'CRAFT_F3':case 'CRAFT_F4':content=<CraftGate key={`${scene}-${reset}`} gate={Number(scene.slice(-1))}/>;break;case 'PURSUIT':content=<Pursuit/>;break;case 'MERGE':content=<Merge/>;break;case 'FORK':content=<Fork/>;break;case 'DOJO':content=<Dojo/>;break;case 'COMMISSION':content=<Commission/>;break;case 'CHAINS_HOLD':content=<ChainsHold/>;break;case 'OATH':content=<Oath/>;break;}
  return <section key={`${scene}-${reset}`} className={`gh-scene gh-${scene.toLowerCase()}`} aria-label={SCENES[scene].title} data-scene={scene}>{content}</section>;
}

const stripCopy:Record<SceneId,string>={THRESHOLD:'Summon. The hand arrives. The opening glint gives way to the descent.',LEGEND:'Chris Kyser and Jesse Gawlik. Different instincts in one practice.',DRAIN:'Audit the borrowed threads. Deliberately look up to release them.',CRAFT_F1:'鍛 Forge — connect the lattice.',CRAFT_F2:'修 Train — begin with three keystrokes.',CRAFT_F3:'主 Own — place the tool in your circle.',CRAFT_F4:'霊 Fleet — dispatch the hands.',PURSUIT:'The single pursuit follows the sword toward the hand.',MERGE:'Summon and ink. The sword descends. Flash and cut overlap. The Fork is ready at eight seconds.',FORK:'主 leads to Dojo. 縛 leads to the holding room. A stroke commits either choice.',DOJO:'Explore six build fixtures and the hanko mark. Continue to Oath.',COMMISSION:'The separate 代 path offers a fixture catalog and 委 seal, then Oath.',CHAINS_HOLD:'One physical green doorway returns to the Fork. Persistent path navigation remains available.',OATH:'The sheathed sword rests. Greetings become 手. Begin again only by explicit reset.'};
export function StoryboardStrip() {
  return <details className="storyboard-strip" open><summary>THE STILL PATH / THE SAME JOURNEY, WITHOUT MOTION</summary><p>Use the scene controls below to travel at your pace. The ceremony has the same approved markers; camera and atmospheric motion are still.</p><ol>{SCENE_IDS.map(id=><li key={id}><span aria-hidden="true">{SCENES[id].glyph}</span><div><strong>{SCENES[id].index} / {SCENES[id].title}</strong><p>{stripCopy[id]}</p></div></li>)}</ol></details>;
}
