'use client';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { SCENES,TIMING } from './config';
import { runtime,useJourney,notifyParams } from './world';
import { input,clearInput } from './input';
import { advanceJourney,recordSword,transitionTo,prepareDrain,stopDrainRite,settleDrainForReducedMotion,prepareFork,stopForkRite,stepForkMotion,settleForkForReducedMotion } from './director';
import { tlFall,tlPass,tlPursue } from './verbs';
import { prepareGate,stopGateRites,settleGatesForReducedMotion } from './gate-director';
import { soundDirector } from './sound';
import { freshTravel,travelReady } from './travel';

export interface EngineHandle { setAdvance:(advance:(t:number)=>void)=>void; destroy:()=>void; }
declare global { interface Window { __GH_DEBUG?: {
  snapshot:()=>unknown; setFog:(value:number)=>void; setInk:(value:{bleed?:number;pressure?:number})=>void;
}; } }

export function startEngine(root:HTMLElement,stage:HTMLElement):EngineHandle {
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  useJourney.setState({reducedMotion:reduced.matches,ready:true});
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.disable(false,false);
  gsap.config({autoSleep:0});
  gsap.ticker.lagSmoothing(0);
  gsap.ticker.remove(gsap.updateRoot);
  const lenis=new Lenis({autoRaf:false,smoothWheel:!reduced.matches,lerp:0.1});
  let logicalTime=gsap.globalTimeline.time(),advanceWorld:(t:number)=>void=()=>{},timeline:gsap.core.Timeline|null=null;
  let sampleStart=performance.now(),sampleFrames=0,lastNotify=0,destroyed=false;
  let resizePending=false,pauseNextFrame=false;
  let enteredAt=logicalTime,readiness=travelReady(useJourney.getState()),readyBurst=input.scrollBurst,consumedSerial=input.scrollSerial;
  let lastWheelAt=-Infinity,touchY:number|null=null,touchBlocked=false;
  const oldRestoration=window.history.scrollRestoration;
  window.history.scrollRestoration='manual';
  const updateProgress=(progress:number)=>{
    const s=useJourney.getState();
    if(SCENES[s.scene].budget===0)return;
    s.params.progress=progress;
    s.params.depth=Object.keys(SCENES).indexOf(s.scene)+progress;
  };
  // One live spine. Recreate only when motion preference changes its pinning mode.
  function makeSpine(){
    ScrollTrigger.enable();
    const instance=ScrollTrigger.create({trigger:stage,start:'top top',end:()=>`+=${Math.max(1,SCENES[useJourney.getState().scene].budget)}`,
      pin:!useJourney.getState().reducedMotion,pinSpacing:true,anticipatePin:0,onUpdate:self=>updateProgress(self.progress)});
    ScrollTrigger.disable(false,false);instance.enable(false,false);return instance;
  }
  let spine=makeSpine();
  function resizeSpine(){
    lenis.resize();spine.refresh();resizePending=false;
  }
  function sceneEntry(){
    timeline?.kill();
    const s=useJourney.getState(),p=s.params;
    if(s.scene==='DRAIN')prepareDrain();else stopDrainRite();
    if(s.scene.startsWith('CRAFT_F'))prepareGate();else stopGateRites();
    if(s.scene==='FORK')prepareFork();else stopForkRite();
    soundDirector.setSilent(false);clearInput();
    p.inkFlow=0;p.hand=0;p.inkTipDecay=0;p.sword=0;p.flash=0;p.ceremonyTime=0;p.pursuit=0;
    p.progress=0;p.pass=0;p.fall=0;p.cameraX=0;p.cameraZ=0;
    enteredAt=logicalTime;readiness=travelReady(s);readyBurst=input.scrollBurst;consumedSerial=input.scrollSerial;input.scrollDirection=0;
    const shell=root.querySelector('.current-shell');if(shell)shell.scrollTop=0;
    lenis.scrollTo(0,{immediate:true,force:true});resizePending=true;
    if(s.scene==='THRESHOLD'){
      const t=TIMING.threshold;
      timeline=gsap.timeline();
      timeline.to(p,{ceremonyTime:t.unlock,duration:t.unlock,ease:'none'},0)
        .to(p,{inkFlow:1,duration:TIMING.nudge},t.summon)
        .to(p,{hand:1,duration:t.handDuration,ease:'none'},t.handStart)
        .to(p,{inkTipDecay:1,duration:TIMING.draw,ease:'power2.out'},t.handStart+t.handDuration)
        .call(()=>{recordSword('opening-glint');soundDirector.emit('shing');},[],t.glint)
        .set(p,{sword:1},t.glint).set(p,{sword:0},t.glint+t.glintDuration)
        .call(()=>useJourney.setState({thresholdReady:true}),[],t.unlock);
    }else if(s.scene==='PURSUIT'){
      recordSword('pursuit');soundDirector.emit('shing');
      timeline=tlPursue(p,()=>transitionTo('MERGE',true));
    }else if(s.scene==='MERGE'){
      const t=TIMING.merge;
      const startedAt=logicalTime,wallStarted=performance.now();
      const mark=(event:string,scheduled:number)=>{
        runtime.ceremonyEvents.push({event,scheduled,observed:logicalTime-startedAt,wallSeconds:(performance.now()-wallStarted)/1000});
      };
      timeline=gsap.timeline();
      timeline.to(p,{ceremonyTime:t.fork,duration:t.fork,ease:'none'},0)
        .call(()=>mark('summon',t.summon),[],t.summon)
        .to(p,{inkFlow:1,duration:TIMING.nudge},t.summon)
        .call(()=>mark('hand-start',t.handStart),[],t.handStart)
        .to(p,{hand:1,duration:t.handDuration,ease:'none'},t.handStart)
        .to(p,{inkTipDecay:1,duration:TIMING.draw,ease:'power2.out'},t.handStart+t.handDuration)
        .call(()=>{mark('sword-start',t.swordStart);recordSword('merge');soundDirector.emit('shing');},[],t.swordStart)
        .fromTo(p,{sword:0.001},{sword:1,duration:t.swordDuration,ease:'none',immediateRender:false},t.swordStart)
        .call(()=>mark('flash-start',t.flashStart),[],t.flashStart)
        .set(p,{flash:1},t.flashStart)
        .to(p,{flash:0,duration:t.flashDuration,ease:'none'},t.flashStart)
        .call(()=>{mark('cut-start',t.cutStart);soundDirector.setSilent(true);},[],t.cutStart)
        .fromTo(p,{cutProgress:0},{cutProgress:1,duration:t.cutDuration,ease:'expo.out',immediateRender:false},t.cutStart)
        .call(()=>mark('cut-end',t.cutStart+t.cutDuration),[],t.cutStart+t.cutDuration)
        .call(()=>mark('flash-end',t.flashStart+t.flashDuration),[],t.flashStart+t.flashDuration)
        .call(()=>{
          mark('fork-interactive',t.fork);soundDirector.setSilent(false);
          useJourney.setState({navUnlocked:true});transitionTo('FORK',true);
        },[],t.fork);
    }else if(s.scene==='COMMISSION'){
      recordSword('commission-handover');timeline=tlPass(p);
    }else if(s.scene==='OATH'){
      recordSword('sheathed-oath');
    }else if(s.scene.startsWith('CRAFT_'))timeline=tlPass(p);
    else if(s.scene==='LEGEND'||s.scene==='DRAIN')timeline=tlFall(p,Object.keys(SCENES).indexOf(s.scene));
    else if(s.scene==='CHAINS_HOLD')timeline=tlPass(p);
  }
  const unsubscribe=useJourney.subscribe((s,old)=>{
    if(s.scene!==old.scene||s.resetVersion!==old.resetVersion)sceneEntry();
    else if(travelReady(s)!==readiness){readiness=travelReady(s);readyBurst=input.scrollBurst;consumedSerial=input.scrollSerial;input.scrollDirection=0;}
  });
  const isolated=(target:EventTarget|null)=>Boolean(target instanceof Element&&target.closest('.receipt-panel,.compositor-proof,.reduced-strip'));
  const gestureTarget=(target:EventTarget|null)=>Boolean(target instanceof Element&&target.closest('.drain-look-zone,.forge5-node,.own5-tool,.fleet5-hand,.cut6-stroke-grip,.stroke-commit'));
  const scrollIntent=(direction:number,source:string,newBurst:boolean)=>{
    if(newBurst)input.scrollBurst++;
    input.scrollSerial++;input.scrollDirection=direction;input.scrollSource=source;
  };
  const onWheel=(event:WheelEvent)=>{
    if(isolated(event.target)||event.ctrlKey||Math.abs(event.deltaY)<=Math.abs(event.deltaX)){input.scrollDirection=0;return;}
    const now=performance.now();scrollIntent(Math.sign(event.deltaY),'wheel',now-lastWheelAt>TIMING.travel.burstGap);lastWheelAt=now;
  };
  const onTouchStart=(event:TouchEvent)=>{
    touchBlocked=event.touches.length!==1||isolated(event.target)||gestureTarget(event.target);
    touchY=event.touches[0]?.clientY??null;input.scrollDirection=0;
    if(!touchBlocked)input.scrollBurst++;
  };
  const onTouchMove=(event:TouchEvent)=>{
    if(touchBlocked||touchY===null||event.touches.length!==1){input.scrollDirection=0;return;}
    const y=event.touches[0].clientY,delta=touchY-y;touchY=y;
    if(Math.abs(delta)>1)scrollIntent(Math.sign(delta),'touch',false);
  };
  const onTouchEnd=()=>{touchY=null;};
  const onTouchCancel=()=>{touchY=null;input.scrollDirection=0;};
  const onPointer=(event:PointerEvent)=>{
    if(document.pointerLockElement){input.dx+=event.movementX/180;input.dy+=event.movementY/180;return;}
    input.x=(event.clientX/innerWidth-0.5)*2;input.y=(event.clientY/innerHeight-0.5)*2;
    input.cursorX=event.clientX;input.cursorY=event.clientY;
    input.serial++;
    input.hover=Boolean((event.target as Element)?.closest('button,a,input,summary,[role="button"],.drain-look-zone,.drain-thread-list,.drain-trace-card'));
  };
  const onKey=(event:KeyboardEvent)=>{
    if((event.target as Element)?.closest('input,textarea,select,[contenteditable="true"]'))return;
    input.keys.add(event.code);
    const interactive=(event.target as Element)?.closest('button,a,input,textarea,select,[contenteditable="true"]');
    if(!interactive&&!isolated(event.target)&&!event.repeat){
      if(['PageDown','ArrowDown','Space','End'].includes(event.code))scrollIntent(event.code==='Space'&&event.shiftKey?-1:1,'keyboard',true);
      else if(['PageUp','ArrowUp','Home'].includes(event.code))scrollIntent(-1,'keyboard',true);
    }
    if(useJourney.getState().scene==='DOJO'&&['KeyW','KeyA','KeyS','KeyD'].includes(event.code))event.preventDefault();
  };
  const onKeyUp=(event:KeyboardEvent)=>input.keys.delete(event.code);
  const onResize=()=>{resizePending=true;};
  const onVisibility=()=>{pauseNextFrame=true;touchY=null;touchBlocked=false;clearInput();};
  const onMotion=()=>{
    useJourney.setState({reducedMotion:reduced.matches});
    if(reduced.matches)settleDrainForReducedMotion();
    if(reduced.matches)settleGatesForReducedMotion();
    if(reduced.matches)settleForkForReducedMotion();
    spine.kill();spine=makeSpine();
    readyBurst=input.scrollBurst;consumedSerial=input.scrollSerial;input.scrollDirection=0;enteredAt=logicalTime;
    lenis.options.smoothWheel=!reduced.matches;resizePending=true;
  };
  window.addEventListener('pointermove',onPointer,{passive:true});window.addEventListener('pointerdown',onPointer,{passive:true});window.addEventListener('keydown',onKey);
  window.addEventListener('keyup',onKeyUp);window.addEventListener('blur',clearInput);
  window.addEventListener('resize',onResize);reduced.addEventListener('change',onMotion);
  document.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('wheel',onWheel,{passive:true});window.addEventListener('touchstart',onTouchStart,{passive:true});
  window.addEventListener('touchmove',onTouchMove,{passive:true});window.addEventListener('touchend',onTouchEnd,{passive:true});window.addEventListener('touchcancel',onTouchCancel,{passive:true});
  function domAdapter(){
    const state=useJourney.getState(),p=state.params;
    if(state.scene==='CHAINS_HOLD'){
      const door=root.querySelector<HTMLElement>('.current-shell .cut6-hold-door'),canvas=root.querySelector('canvas');
      if(door&&canvas){const rect=door.getBoundingClientRect(),view=canvas.getBoundingClientRect();
        if(view.width>0&&view.height>0){p.holdDoorX=(rect.left+rect.width/2-view.left)/view.width*2-1;p.holdDoorY=1-(rect.top+rect.height/2-view.top)/view.height*2;
          p.holdDoorWidth=rect.width/view.width*2;p.holdDoorHeight=rect.height/view.height*2;}
      }
    }
    const vars={hand:p.hand,sword:p.sword,flash:p.flash,cut:p.cutProgress,ceremony:p.ceremonyTime,pursuit:p.pursuit,
      'scene-mix':p.sceneMix,ink:p.inkFlow,time:p.time,depth:p.depth,progress:p.progress,'pointer-x':p.pointerX,
      'drain-tension':p.drainTension,'drain-snap':p.drainSnap,'drain-dawn':p.drainDawn,'drain-gesture':p.drainGesture,released:p.released};
    Object.assign(vars,{'forge-0':p.forge0,'forge-1':p.forge1,'forge-2':p.forge2,'gate-active':p.gateActive,
      'gate-drag-x':p.gateDragX,'gate-drag-y':p.gateDragY,'train-reveal':p.trainReveal,'train-compile':p.trainCompile,
      'own-x':p.ownX,'own-y':p.ownY,'own-lock':p.ownLock,'fleet-0':p.fleet0,'fleet-1':p.fleet1,'fleet-2':p.fleet2,'gate-pulse':p.gatePulse});
    Object.assign(vars,{'fork-lean':p.forkLean,'fork-choice':p.forkChoice,'fork-collapse':p.forkCollapse,'fork-stroke':p.forkStroke,'fork-reveal':p.forkReveal});
    for(const [name,value] of Object.entries(vars))root.style.setProperty(`--${name}`,String(value));
    const cursor=root.querySelector<HTMLElement>('.cursor-ghost');
    if(cursor){cursor.style.transform=`translate3d(${p.cursorX}px,${p.cursorY}px,0)`;cursor.dataset.hover=String(p.cursorHover>0.5);}
  }
  function heartbeat(_time:number,deltaMs:number){
    if(destroyed||document.hidden)return;
    const elapsedDelta=pauseNextFrame?0:deltaMs/1000;pauseNextFrame=false;
    const dt=Math.min(elapsedDelta,0.05);
    logicalTime+=elapsedDelta;
    const s=useJourney.getState(),p=s.params;
    runtime.clockPhases=['input'];
    stepForkMotion(dt);
    p.pointerPixelX=input.cursorX;p.pointerPixelY=input.cursorY;p.pointerSerial=input.serial;
    if(!s.reducedMotion){
      p.pointerX+= (input.x-p.pointerX)*0.08;p.pointerY+=(input.y-p.pointerY)*0.08;
      if(s.scene==='DOJO'){
        const speed=dt*1.5;
        p.cameraX=Math.max(-2,Math.min(2,p.cameraX+(Number(input.keys.has('KeyD'))-Number(input.keys.has('KeyA')))*speed+input.dx*0.8));
        p.cameraZ=Math.max(-2,Math.min(1.6,p.cameraZ+(Number(input.keys.has('KeyS'))-Number(input.keys.has('KeyW')))*speed+input.dy*0.8));
      }
      p.cursorX+=(input.cursorX-p.cursorX)*0.3;p.cursorY+=(input.cursorY-p.cursorY)*0.3;p.cursorHover=input.hover?1:0;
    }
    input.dx=0;input.dy=0;
    if(resizePending)resizeSpine();
    runtime.clockPhases.push('Lenis');lenis.raf(logicalTime*1000);ScrollTrigger.update();updateProgress(spine.progress);
    runtime.clockPhases.push('GSAP timelines');gsap.updateRoot(logicalTime);p.time=logicalTime;
    if(soundDirector.isSilent&&soundDirector.snapshot().connected)runtime.silenceViolations++;
    const shell=root.querySelector<HTMLElement>('.current-shell');
    const atContentEnd=s.reducedMotion?stage.getBoundingClientRect().bottom<=innerHeight+4:!shell||shell.scrollHeight-shell.clientHeight-shell.scrollTop<=4;
    if(freshTravel({ready:travelReady(useJourney.getState()),progress:p.progress,atContentEnd,burst:input.scrollBurst,readyBurst,
      serial:input.scrollSerial,consumedSerial,direction:input.scrollDirection,elapsedSinceEntry:logicalTime-enteredAt})){
      const from=useJourney.getState().scene,source=input.scrollSource,burst=input.scrollBurst;consumedSerial=input.scrollSerial;
      advanceJourney();const to=useJourney.getState().scene;
      if(to!==from)runtime.travelEvents.push({from,to,input:source,at:performance.now(),burst});
    }
    runtime.clockPhases.push('DOM / uniform adapters');domAdapter();
    runtime.clockPhases.push('R3F uniform upload / composer render');
    if(!s.reducedMotion||runtime.frames%12===0)advanceWorld(logicalTime);
    runtime.frames++;sampleFrames++;
    const elapsed=(performance.now()-sampleStart)/1000;
    if(elapsed>=2){runtime.fps=sampleFrames/elapsed;runtime.sampleSeconds=elapsed;sampleStart=performance.now();sampleFrames=0;}
    if(logicalTime-lastNotify>0.1){notifyParams();lastNotify=logicalTime;}
  }
  runtime.heartbeatOwners++;gsap.ticker.add(heartbeat);
  sceneEntry();
  const setFog=(value:number)=>gsap.to(useJourney.getState().params,{fogDensity:value,duration:TIMING.fogTween,ease:'power2.out'});
  const setInk=(value:{bleed?:number;pressure?:number})=>{
    const target:Record<string,number>={};
    if(value.bleed!==undefined)target.inkBleed=Math.max(0,Math.min(1.5,value.bleed));
    if(value.pressure!==undefined)target.inkPressure=Math.max(0.5,Math.min(1.5,value.pressure));
    gsap.to(useJourney.getState().params,{...target,duration:TIMING.fogTween,ease:'power2.out'});
  };
  window.__GH_DEBUG={setFog,setInk,snapshot:()=>{
    const s=useJourney.getState();return {scene:s.scene,navUnlocked:s.navUnlocked,thresholdReady:s.thresholdReady,
      drainReleased:s.drainReleased,drainSettled:s.drainSettled,drainAuditIndex:s.drainAuditIndex,drainAuditSource:s.drainAuditSource,completedGates:s.completedGates,swordMoments:s.swordMoments,
      swordCount:s.swordMoments.length,shingCount:s.shingCount,soundEnabled:s.soundEnabled,
      reducedMotion:s.reducedMotion,dojoSeal:s.dojoSeal,commissionSeal:s.commissionSeal,
      visitedScenes:s.visitedScenes,journey:s.journeyNumber,
      gates:{forgeSeated:s.forgeSeated,forgeSettled:s.forgeSettled,trainSeed:s.trainSeed,trainPhase:s.trainPhase,
        ownPhase:s.ownPhase,fleetSent:s.fleetSent,fleetSettled:s.fleetSettled},
      forkChoice:s.forkChoice,travel:{ready:travelReady(s),readyBurst,burst:input.scrollBurst,serial:input.scrollSerial,consumedSerial},
      params:Object.fromEntries(Object.entries(s.params).filter(([,value])=>typeof value==='number')),audio:soundDirector.snapshot(),runtime:{...runtime}};
  }};
  console.info('BUILT BY GHOST HANDS — v6 The Cut. Scroll between chapters; local demonstrations; no trackers. Runtime receipt: window.__GH_DEBUG.snapshot()');
  return {setAdvance(fn){advanceWorld=fn;},destroy(){
    destroyed=true;timeline?.kill();stopDrainRite();stopGateRites();stopForkRite();unsubscribe();lenis.destroy();spine.kill();ScrollTrigger.disable(false,true);
    gsap.ticker.remove(heartbeat);runtime.heartbeatOwners--;gsap.ticker.add(gsap.updateRoot);
    window.removeEventListener('pointermove',onPointer);window.removeEventListener('pointerdown',onPointer);window.removeEventListener('keydown',onKey);
    window.removeEventListener('keyup',onKeyUp);window.removeEventListener('blur',clearInput);
    window.removeEventListener('resize',onResize);reduced.removeEventListener('change',onMotion);
    document.removeEventListener('visibilitychange',onVisibility);window.history.scrollRestoration=oldRestoration;
    window.removeEventListener('wheel',onWheel);window.removeEventListener('touchstart',onTouchStart);window.removeEventListener('touchmove',onTouchMove);
    window.removeEventListener('touchend',onTouchEnd);window.removeEventListener('touchcancel',onTouchCancel);
    delete window.__GH_DEBUG;
  }};
}
