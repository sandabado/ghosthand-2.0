'use client';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { SCENES,TIMING,type SceneId } from './config';
import { runtime,useJourney,notifyParams } from './world';
import { input,clearInput } from './input';
import { advanceJourney,retreatJourney,commitSummon,recordSword,transitionTo,prepareDrain,stopDrainRite,settleDrainForReducedMotion,prepareFork,stopForkRite,stepForkMotion,settleForkForReducedMotion } from './director';
import { tlFall,tlPass,tlPursue } from './verbs';
import { prepareGate,stopGateRites,settleGatesForReducedMotion } from './gate-director';
import { soundDirector } from './sound';
import { backwardDestination,freshReverseTravel,freshTravel,travelReady } from './travel';
import { splitScrollDelta,journeyGuidance,nativeReadingProgress } from './journey-ux';
import { prepareDojo,stopDojo,stepDojo,queueDojoLook,stopDojoInput,selectDojoBuild,settleDojoForReducedMotion } from './dojo-director';
import { nearestDojoStop } from './dojo';
import { nextRenderDeadline } from './performance-policy';
import { getPerformanceSnapshot,samplePerformance,setPerformanceMode } from './performance';
import { prepareSmithy,stopSmithy,stepSmithy,selectCommissionRelic,settleSmithyForMotion } from './smithy-director';
import { advanceSummonPointer,summonPointer,type SummonPoint } from './summon';
import { mergeSlicePose } from '../systems/cut/merge-pose';
import {fragmentTarget,installNavigation,sceneFragment,validHistory,type JourneyHistory,type NavigationRequest,type ReaderSnapshot} from './navigation';

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
  // Input is routed into the active reader, including its surrounding margins.
  // Lenis retains the shared scroll spine; it does not consume a second copy of input.
  const lenis=new Lenis({autoRaf:false,smoothWheel:false,virtualScroll:()=>false,lerp:0.1});
  let logicalTime=gsap.globalTimeline.time(),advanceWorld:(t:number)=>void=()=>{},timeline:gsap.core.Timeline|null=null;
  let sampleStart=performance.now(),sampleFrames=0,lastNotify=0,destroyed=false;
  let renderDeadline=NaN;
  const updatePerformanceMode=()=>{const s=useJourney.getState();setPerformanceMode({visible:!document.hidden,reduced:s.reducedMotion,critical:s.scene==='MERGE'||s.scene==='PURSUIT'||s.scene==='THRESHOLD'&&s.thresholdPhase!=='pointing'||s.dojoPhase==='pressing'||s.commissionPhase==='pressing'});};
  let resizePending=false,pauseNextFrame=false;
  let enteredAt=logicalTime,readiness=travelReady(useJourney.getState()),readyBurst=input.scrollBurst,consumedSerial=input.scrollSerial;
  let lastWheelAt=-Infinity,lastScrollAt=-Infinity,touchY:number|null=null,touchBlocked=false;
  let pendingScroll=0,readingSpine=0;
  type Placement={scene:SceneId;side:'start'|'end'|'restore'|'about';reader?:ReaderSnapshot;history?:'push'|'replace'|'restore';fragment?:string};
  let pendingEntry:Placement|null=null,requestedNavigation:Partial<Placement>|null=null;
  const savedReaders=new Map<SceneId,ReaderSnapshot>(),historyEntries=new Map<string,JourneyHistory>(),readerFocus=new Map<SceneId,number>();
  const historySession=Math.random().toString(36).slice(2);let historySerial=0,activeHistoryKey='',activeFragment='';
  let summonAim:SummonPoint=[useJourney.getState().params.summonX,useJourney.getState().params.summonY];
  const oldRestoration=window.history.scrollRestoration;
  window.history.scrollRestoration='manual';
  let shell=root.querySelector<HTMLElement>('.current-shell'),section:Element|null=null;
  let cursor=root.querySelector<HTMLElement>('.cursor-ghost'),canvas:HTMLCanvasElement|null=null,holdDoor:HTMLElement|null=null;
  let layoutDirty=true,geometryDirty=true;
  let dojoStops:{index:number;top:number;height:number}[]=[],smithyStops:{index:number;top:number;height:number}[]=[];
  const layout={shellTop:0,shellHeight:1,shellClient:1,shellMax:0,stageTop:0,stageHeight:1,stageBottom:1,viewWidth:document.documentElement.clientWidth,viewHeight:innerHeight};
  const cssValues=new Map<string,string>();let cursorTransform='',cursorHover='';
  const invalidateLayout=()=>{layoutDirty=true;};
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>{layoutDirty=true;geometryDirty=true;}):null;
  observer?.observe(stage);
  function syncLayout(){
    if(!shell?.isConnected){shell=root.querySelector<HTMLElement>('.current-shell');geometryDirty=true;layoutDirty=true;}
    const nextSection=shell?.firstElementChild??null;
    if(nextSection!==section){
      if(section)observer?.unobserve(section);section=nextSection;if(section)observer?.observe(section);
      geometryDirty=true;layoutDirty=true;
    }
    if(!layoutDirty&&!geometryDirty)return;
    if(shell){
      const rect=shell.getBoundingClientRect();layout.shellTop=rect.top;layout.shellHeight=rect.height;
      layout.shellClient=shell.clientHeight;layout.shellMax=Math.max(0,shell.scrollHeight-layout.shellClient);
      if(geometryDirty){
        const stops=(selector:string,key:'dojoStop'|'smithyRelic')=>Array.from(shell!.querySelectorAll<HTMLElement>(selector),stop=>{
          const bounds=stop.getBoundingClientRect();return {index:Number(stop.dataset[key]),top:bounds.top-rect.top+shell!.scrollTop,height:bounds.height};
        });
        dojoStops=stops('[data-dojo-stop]','dojoStop');smithyStops=stops('[data-smithy-relic]','smithyRelic');
        holdDoor=shell.querySelector<HTMLElement>('.cut6-hold-door');
      }
    }
    if(useJourney.getState().reducedMotion){const rect=stage.getBoundingClientRect();layout.stageTop=rect.top;layout.stageHeight=rect.height;layout.stageBottom=rect.bottom;}
    if(!canvas?.isConnected)canvas=root.querySelector('canvas');
    const view=canvas?.getBoundingClientRect();
    layout.viewWidth=view?.width||document.documentElement.clientWidth;layout.viewHeight=view?.height||innerHeight;
    if(!cursor?.isConnected)cursor=root.querySelector<HTMLElement>('.cursor-ghost');
    if(holdDoor&&view){
      const rect=holdDoor.getBoundingClientRect(),p=useJourney.getState().params;
      if(view.width>0&&view.height>0){p.holdDoorX=(rect.left+rect.width/2-view.left)/view.width*2-1;p.holdDoorY=1-(rect.top+rect.height/2-view.top)/view.height*2;
        p.holdDoorWidth=rect.width/view.width*2;p.holdDoorHeight=rect.height/view.height*2;}
    }
    layoutDirty=false;geometryDirty=false;
  }
  const updateProgress=(progress:number)=>{
    const s=useJourney.getState();
    if(SCENES[s.scene].budget===0){
      if(s.scene==='OATH')s.params.progress=s.reducedMotion?progress:layout.shellMax>0?(shell?.scrollTop??0)/layout.shellMax:0;
      return;
    }
    s.params.progress=progress;
    s.params.depth=Object.keys(SCENES).indexOf(s.scene)+progress;
  };
  let refreshReader:{reader:HTMLElement;scene:SceneId;offset:number;focus:HTMLElement|null}|null=null;
  function preserveReaderRefresh(){
    refreshReader=null;const state=useJourney.getState(),reader=root.querySelector<HTMLElement>('.current-shell');
    if(pendingEntry||state.reducedMotion||!reader?.isConnected||reader.firstElementChild?.getAttribute('data-scene')!==state.scene)return;
    refreshReader={reader,scene:state.scene,offset:reader.scrollTop,focus:reader.contains(document.activeElement)?document.activeElement as HTMLElement:null};
  }
  function restoreReaderRefresh(){
    const saved=refreshReader;refreshReader=null;
    if(!saved||pendingEntry||useJourney.getState().reducedMotion||useJourney.getState().scene!==saved.scene||!saved.reader.isConnected||root.querySelector('.current-shell')!==saved.reader)return;
    saved.reader.scrollTop=Math.max(0,Math.min(saved.offset,saved.reader.scrollHeight-saved.reader.clientHeight));
    if(saved.focus?.isConnected)saved.focus.focus({preventScroll:true});
    layoutDirty=true;geometryDirty=true;
  }
  // One live spine. Recreate only when motion preference changes its pinning mode.
  function makeSpine(){
    ScrollTrigger.enable();
    const instance=ScrollTrigger.create({trigger:stage,start:'top top',end:()=>`+=${Math.max(1,SCENES[useJourney.getState().scene].budget)}`,
      pin:!useJourney.getState().reducedMotion,pinSpacing:true,anticipatePin:0,onUpdate:self=>updateProgress(self.progress),
      onRefreshInit:preserveReaderRefresh,onRefresh:restoreReaderRefresh});
    ScrollTrigger.disable(false,false);instance.enable(false,false);return instance;
  }
  let spine=makeSpine();
  function resizeSpine(){
    lenis.resize();spine.refresh();resizePending=false;layoutDirty=true;geometryDirty=true;
  }
  const focusSelector='a[href],button,input,textarea,select,summary,[tabindex]';
  const historyKey=()=>`${historySession}-${++historySerial}`;
  const fragmentUrl=(fragment:string)=>`${window.location.pathname}${window.location.search}${fragment?`#${fragment}`:''}`;
  function captureReader(scene=useJourney.getState().scene):ReaderSnapshot|null {
    const state=useJourney.getState();if(sceneFragment(scene)===null)return null;
    if(pendingEntry||section?.getAttribute('data-scene')!==scene||!shell)return savedReaders.get(scene)??null;
    const focus=Array.from(shell.querySelectorAll<HTMLElement>(focusSelector));
    const focused=focus.indexOf(document.activeElement as HTMLElement);
    const progress=state.reducedMotion?nativeReadingProgress(layout.stageTop,layout.stageHeight,innerHeight):SCENES[scene].budget>0?readingSpine/SCENES[scene].budget:state.params.progress;
    return {scene,offset:Math.max(0,state.reducedMotion?-layout.stageTop:shell.scrollTop),progress:Math.max(0,Math.min(1,progress)),
      spine:Math.max(0,readingSpine),reduced:state.reducedMotion,fragment:activeFragment||sceneFragment(scene)||'',
      details:Array.from(shell.querySelectorAll<HTMLDetailsElement>('details'),detail=>detail.open),focusIndex:focused>=0?focused:readerFocus.get(scene)??-1};
  }
  function rememberCurrent(persist=true,scene=useJourney.getState().scene,returns=useJourney.getState().navigationStack){
    const reader=captureReader(scene);if(!reader)return null;savedReaders.set(reader.scene,reader);
    if(activeHistoryKey){
      const entry:JourneyHistory={ghostHand:1,key:activeHistoryKey,reader,returns:returns.slice()};
      historyEntries.set(entry.key,entry);
      if(persist&&validHistory(window.history.state)&&window.history.state.key===entry.key)window.history.replaceState(entry,'',fragmentUrl(reader.fragment));
    }
    return reader;
  }
  function writeHistory(mode:'push'|'replace'|'restore'='push',fragment=sceneFragment(useJourney.getState().scene)??''){
    const reader=captureReader();if(!reader)return;
    const current=validHistory(window.history.state)?window.history.state:null;
    const replace=mode!=='push'||current?.reader.scene==='THRESHOLD'||current?.reader.scene===reader.scene&&current.reader.fragment===fragment;
    if(!replace||!activeHistoryKey)activeHistoryKey=historyKey();
    activeFragment=fragment;reader.fragment=fragment;
    const entry:JourneyHistory={ghostHand:1,key:activeHistoryKey,reader,returns:useJourney.getState().navigationStack.slice()};
    savedReaders.set(reader.scene,reader);historyEntries.set(entry.key,entry);
    window.history[replace?'replaceState':'pushState'](entry,'',fragmentUrl(fragment));
  }
  function followNavigation(scene:SceneId,placement:Partial<Placement>,returns=useJourney.getState().navigationStack){
    if(scene==='THRESHOLD'&&useJourney.getState().navUnlocked){scene='LEGEND';placement={side:'start',fragment:'home',history:placement.history};}
    requestedNavigation={scene,...placement};
    useJourney.setState({navigationStack:returns,...(scene==='THRESHOLD'?{}:{navUnlocked:true,thresholdReady:true,thresholdPhase:'departing' as const})});
    transitionTo(scene);
    if(requestedNavigation)sceneEntry();
  }
  function handleNavigation(request:NavigationRequest){
    const state=useJourney.getState(),origin=rememberCurrent();
    if(request.kind==='return'){
      const returns=state.navigationStack,target=returns.at(-1);if(!target)return;
      followNavigation(target.scene,{side:'restore',reader:target,fragment:target.fragment,history:'push'},returns.slice(0,-1));return;
    }
    const scene:SceneId=request.kind==='scene'?request.scene:request.kind==='about'?'OATH':state.navUnlocked?'LEGEND':'THRESHOLD';
    const fragment=request.kind==='about'?'about':sceneFragment(scene)??'';
    const returns=origin&&(scene!==state.scene||request.kind==='about'&&activeFragment!=='about')?[...state.navigationStack,origin]:state.navigationStack;
    const remembered=(scene==='DOJO'||scene==='CRAFT_F4')&&scene!==state.scene?savedReaders.get(scene):undefined;
    followNavigation(scene,{side:request.kind==='about'?'about':remembered?'restore':'start',reader:remembered,fragment,history:'push'},returns);
  }
  function restoreLocation(initial=false){
    const origin=initial?null:rememberCurrent(false),hash=window.location.hash.replace(/^#/,'');
    const target=fragmentTarget(hash),stored=validHistory(window.history.state)&&window.history.state.reader.fragment===hash?window.history.state as JourneyHistory:null;
    const entry=stored?(historyEntries.get(stored.key)??stored):null;
    if(entry){
      activeHistoryKey=entry.key;
      const reader=entry.reader.scene==='THRESHOLD'&&useJourney.getState().navUnlocked?{...entry.reader,scene:'LEGEND' as const,fragment:'home'}:entry.reader;
      followNavigation(reader.scene,{side:'restore',reader,fragment:reader.fragment,history:'restore'},entry.returns);return;
    }
    activeHistoryKey=historyKey();
    if(target){
      const returns=origin?[...useJourney.getState().navigationStack,origin]:[];
      followNavigation(target.scene,{side:target.anchor?'about':'start',fragment:hash,history:initial?'replace':'restore'},returns);
    }else if(initial){
      requestedNavigation={side:'start',history:'replace',fragment:sceneFragment(useJourney.getState().scene)??''};sceneEntry();
    }else writeHistory('replace',activeFragment);
  }
  /** React may still expose the outgoing section when the store first changes. */
  function placeReaderEntry(){
    const entry=pendingEntry,state=useJourney.getState();
    if(!entry||entry.scene!==state.scene||!shell?.isConnected||section?.getAttribute('data-scene')!==state.scene||root.dataset.reduced!==String(state.reducedMotion))return false;
    const reader=entry.reader;
    if(reader)Array.from(shell.querySelectorAll<HTMLDetailsElement>('details')).forEach((detail,index)=>{detail.open=reader.details[index]??false;});
    const about=entry.side==='about'?shell.querySelector<HTMLDetailsElement>('#studio-about'):null;if(about)about.open=true;
    resizeSpine();syncLayout();
    const fromEnd=entry.side==='end',budget=SCENES[state.scene].budget;
    let offset=fromEnd?(state.reducedMotion?Math.max(0,layout.stageHeight-innerHeight):layout.shellMax):0;
    let progress=fromEnd?1:0;
    if(reader){offset=reader.reduced===state.reducedMotion?reader.offset:reader.progress*(state.reducedMotion?Math.max(0,layout.stageHeight-innerHeight):layout.shellMax);progress=reader.progress;}
    if(about){const rect=about.getBoundingClientRect();offset=state.reducedMotion?Math.max(0,rect.top-layout.stageTop-24):Math.max(0,shell.scrollTop+rect.top-shell.getBoundingClientRect().top-24);}
    const maximum=state.reducedMotion?Math.max(0,layout.stageHeight-innerHeight):layout.shellMax;offset=Math.max(0,Math.min(maximum,offset));
    if(about)progress=maximum>0?offset/maximum:0;
    readingSpine=reader?Math.max(0,Math.min(budget,reader.spine)):budget*progress;
    if(state.reducedMotion){
      const top=window.scrollY+layout.stageTop,target=top+offset;
      window.scrollTo({top:target,left:0,behavior:'instant'});
      lenis.scrollTo(target,{immediate:true,force:true});
    }else{
      shell.scrollTop=offset;
      lenis.scrollTo(readingSpine,{immediate:true,force:true});
    }
    state.params.progress=progress;
    updateProgress(state.params.progress);
    pendingEntry=null;pendingScroll=0;clearInput();
    consumedSerial=input.scrollSerial;readyBurst=input.scrollBurst-1;enteredAt=logicalTime;lastScrollAt=-Infinity;
    useJourney.setState({readerEntry:null});
    layoutDirty=true;syncLayout();
    const focus=reader&&reader.focusIndex>=0?shell.querySelectorAll<HTMLElement>(focusSelector)[reader.focusIndex]:about?.querySelector<HTMLElement>('summary');
    focus?.focus({preventScroll:true});
    writeHistory(entry.history,entry.fragment);
    return true;
  }
  function receiveSummon(){
    const state=useJourney.getState();if(state.scene!=='THRESHOLD'||state.thresholdPhase!=='receiving')return;
    timeline?.kill();const p=state.params,t=TIMING.threshold;
    pendingScroll=0;readingSpine=0;clearInput();lenis.scrollTo(0,{immediate:true,force:true});
    const source=runtime.summonEvents.findLast(event=>event.event==='commit')?.input??'pointer';
    const markSword=()=>{
      if(useJourney.getState().swordMoments.includes('opening-glint'))return;
      recordSword('opening-glint');soundDirector.emit('shing');runtime.summonEvents.push({event:'sword',input:source,at:performance.now()});
    };
    const finish=()=>{
      const current=useJourney.getState();if(current.scene!=='THRESHOLD'||current.thresholdPhase==='pointing')return;
      runtime.summonEvents.push({event:'route',input:source,at:performance.now()});
      useJourney.setState({thresholdReady:true,navUnlocked:true});transitionTo('LEGEND');
    };
    p.hand=1;p.inkFlow=1;p.inkTipDecay=1;p.flash=0;p.summonLeave=0;
    if(state.reducedMotion){
      // A still, received blade acknowledges the same command before continuing.
      p.ceremonyTime=Math.max(t.swordStart+t.swordDuration,t.gripStart+t.gripDuration);p.sword=1;markSword();
      timeline=gsap.timeline().call(finish,[],t.reducedDuration);
      return;
    }
    p.ceremonyTime=0;p.sword=0;
    timeline=gsap.timeline().to(p,{ceremonyTime:t.unlock,duration:t.unlock,ease:'none'},0)
      .call(markSword,[],t.swordStart)
      .fromTo(p,{sword:.001},{sword:1,duration:t.swordDuration,ease:'power2.out',immediateRender:false},t.swordStart)
      .call(()=>{runtime.summonEvents.push({event:'departure',input:source,at:performance.now()});useJourney.setState({thresholdPhase:'departing'});},[],t.departure)
      .to(p,{summonLeave:1,duration:t.departureDuration,ease:'power3.inOut'},t.departure)
      .call(finish,[],t.unlock);
  }
  function sceneEntry(){
    renderDeadline=NaN;
    timeline?.kill();
    const s=useJourney.getState(),p=s.params;
    const navigation=requestedNavigation;requestedNavigation=null;
    pendingEntry={scene:s.scene,side:navigation?.side??s.readerEntry??'start',reader:navigation?.reader,
      history:navigation?.history??(s.scene==='THRESHOLD'?'replace':'push'),fragment:navigation?.fragment??sceneFragment(s.scene)??undefined};
    if(s.practiceExploring)useJourney.setState({practiceExploring:false});
    if(s.scene==='DRAIN')prepareDrain();else stopDrainRite();
    if(s.scene.startsWith('CRAFT_F'))prepareGate();else stopGateRites();
    if(s.scene==='FORK')prepareFork();else stopForkRite();
    if(s.scene==='DOJO')prepareDojo();else stopDojo();
    if(s.scene==='COMMISSION'||s.scene==='OATH')prepareSmithy();else stopSmithy();
    soundDirector.setSilent(false);clearInput();
    p.inkFlow=0;p.hand=0;p.inkTipDecay=0;p.sword=0;p.flash=0;p.ceremonyTime=0;p.pursuit=0;
    p.progress=0;p.pass=0;p.fall=0;p.cameraX=0;p.cameraZ=0;
    enteredAt=logicalTime;readiness=travelReady(s);readyBurst=input.scrollBurst-1;consumedSerial=input.scrollSerial;input.scrollDirection=0;
    pendingScroll=0;readingSpine=0;
    layoutDirty=true;geometryDirty=true;resizePending=true;
    if(s.scene==='THRESHOLD'){
      p.hand=1;p.inkFlow=1;p.inkTipDecay=1;p.summonLeave=0;summonAim=[p.summonX,p.summonY];
      useJourney.setState({thresholdPhase:'pointing',thresholdReady:false});
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
          mark('contact-interactive',t.fork);soundDirector.setSilent(false);
          transitionTo('COMMISSION',true);
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
    if(s.resetVersion!==old.resetVersion){savedReaders.clear();readerFocus.clear();requestedNavigation={side:'start',history:'replace',fragment:''};}
    else if(s.scene!==old.scene&&!requestedNavigation)rememberCurrent(true,old.scene,old.navigationStack);
    if(s.scene!==old.scene||s.resetVersion!==old.resetVersion||s.readerEntry!==null&&s.readerEntry!==old.readerEntry)sceneEntry();
    else if(s.scene==='THRESHOLD'&&s.thresholdPhase==='receiving'&&old.thresholdPhase==='pointing')receiveSummon();
    else if(travelReady(s)!==readiness){readiness=travelReady(s);readyBurst=input.scrollBurst-1;consumedSerial=input.scrollSerial;input.scrollDirection=0;}
  });
  const isolated=(target:EventTarget|null)=>Boolean(target instanceof Element&&target.closest('.receipt-drawer,.compositor-proof,.reduced-strip'));
  const gestureTarget=(target:EventTarget|null)=>Boolean(target instanceof Element&&target.closest('.summon-trigger,.drain-look-zone:not([aria-disabled="true"]),.forge5-node,.own5-tool,.fleet5-hand,.cut6-stroke-grip,.stroke-commit,.dojo7-move-pad:not([aria-disabled="true"]),.dojo7-hanko-handle,.dojo7-move-controls:not([aria-disabled="true"]),.smithy8-seal-tool'));
  const scrollIntent=(direction:number,source:string,newBurst:boolean)=>{
    if(newBurst)input.scrollBurst++;
    input.scrollSerial++;input.scrollDirection=direction;input.scrollSource=source;
    lastScrollAt=logicalTime;
  };
  const onWheel=(event:WheelEvent)=>{
    if(isolated(event.target)||event.ctrlKey||Math.abs(event.deltaY)<=Math.abs(event.deltaX)){input.scrollDirection=0;return;}
    if(useJourney.getState().scene==='THRESHOLD'){input.scrollDirection=0;pendingScroll=0;if(!useJourney.getState().reducedMotion)event.preventDefault();return;}
    const now=performance.now();scrollIntent(Math.sign(event.deltaY),'wheel',now-lastWheelAt>TIMING.travel.burstGap);lastWheelAt=now;
    if(!useJourney.getState().reducedMotion){
      event.preventDefault();
      pendingScroll+=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
    }
  };
  const onTouchStart=(event:TouchEvent)=>{
    pendingScroll=0;
    touchBlocked=event.touches.length!==1||isolated(event.target)||gestureTarget(event.target);
    touchY=event.touches[0]?.clientY??null;input.scrollDirection=0;
    if(!touchBlocked)input.scrollBurst++;
  };
  const onTouchMove=(event:TouchEvent)=>{
    if(touchBlocked||touchY===null||event.touches.length!==1){input.scrollDirection=0;return;}
    const y=event.touches[0].clientY,delta=touchY-y;touchY=y;
    if(Math.abs(delta)>1){
      scrollIntent(Math.sign(delta),'touch',false);
      if(!useJourney.getState().reducedMotion){event.preventDefault();pendingScroll+=delta;}
    }
  };
  const onTouchEnd=()=>{touchY=null;};
  const onTouchCancel=()=>{touchY=null;input.scrollDirection=0;pendingScroll=0;};
  const onPointer=(event:PointerEvent)=>{
    if(event.type==='pointerdown'&&(event.target as Element)?.closest('button,a,input,summary,.dojo7-move-pad')){input.scrollDirection=0;pendingScroll=0;}
    if(document.pointerLockElement){if(useJourney.getState().scene==='DOJO')queueDojoLook(event.movementX,event.movementY);return;}
    input.x=(event.clientX/innerWidth-0.5)*2;input.y=(event.clientY/innerHeight-0.5)*2;
    if(useJourney.getState().scene==='THRESHOLD'&&useJourney.getState().thresholdPhase==='pointing')summonAim=summonPointer(input.x,-input.y);
    input.cursorX=event.clientX;input.cursorY=event.clientY;
    input.serial++;
    input.hover=Boolean((event.target as Element)?.closest('button,a,input,summary,[role="button"],.drain-look-zone,.drain-thread-list,.drain-trace-card'));
  };
  const onKey=(event:KeyboardEvent)=>{
    const paging=['PageDown','PageUp','Home','End'].includes(event.code);
    if(event.defaultPrevented&&!paging)return;
    if(event.code==='Escape'&&document.pointerLockElement){event.preventDefault();stopDojoInput();clearInput();pendingScroll=0;document.exitPointerLock();return;}
    const disclosure=event.code==='Escape'?(event.target as Element)?.closest<HTMLDetailsElement>('details[open]'):null;
    if(disclosure){event.preventDefault();disclosure.open=false;disclosure.querySelector('summary')?.focus({preventScroll:true});return;}
    if(event.code==='Escape'&&useJourney.getState().navigationStack?.length&&!document.pointerLockElement&&!(event.target as Element)?.closest('[data-armed="true"]')){
      event.preventDefault();handleNavigation({kind:'return'});return;
    }
    const editable=(event.target as Element)?.closest('input,textarea,select,[contenteditable="true"]');
    if(editable&&(!paging||['Home','End'].includes(event.code)||editable.matches('textarea,select,[contenteditable="true"]')))return;
    input.keys.add(event.code);
    if(useJourney.getState().scene==='THRESHOLD'&&!isolated(event.target)){
      const control=(event.target as Element)?.closest('button,a,input,summary');
      if(event.code==='Enter'&&!event.repeat&&!control){event.preventDefault();commitSummon('keyboard');return;}
      if(!control&&['PageDown','PageUp','ArrowDown','ArrowUp','Space','Home','End'].includes(event.code)){
        input.scrollDirection=0;pendingScroll=0;if(!useJourney.getState().reducedMotion)event.preventDefault();return;
      }
    }
    if(event.code==='Escape'&&useJourney.getState().scene==='DOJO'){
      stopDojoInput();clearInput();pendingScroll=0;if(document.pointerLockElement?.closest('.dojo7-move-pad'))document.exitPointerLock();
    }
    const interactive=(event.target as Element)?.closest('button,a,input,textarea,select,summary,[contenteditable="true"]');
    if((!interactive||paging)&&!isolated(event.target)){
      const down=['PageDown','ArrowDown','Space','End'].includes(event.code),up=['PageUp','ArrowUp','Home'].includes(event.code);
      if(down||up){
        const direction=up||event.code==='Space'&&event.shiftKey?-1:1;
        scrollIntent(direction,'keyboard',true);
        if(!useJourney.getState().reducedMotion){
          event.preventDefault();
          syncLayout();
          const distance=event.code==='Home'||event.code==='End'?layout.shellMax+layout.shellClient+TIMING.scrollBudget:event.code.startsWith('Arrow')?64:Math.max(240,layout.shellClient*.85);
          pendingScroll+=direction*distance;
        }
      }
    }
    if(useJourney.getState().scene==='DOJO'&&['KeyW','KeyA','KeyS','KeyD'].includes(event.code))event.preventDefault();
  };
  const onKeyUp=(event:KeyboardEvent)=>input.keys.delete(event.code);
  const onFocus=(event:FocusEvent)=>{
    const reader=root.querySelector<HTMLElement>('.current-shell');
    if(reader?.contains(event.target as Node))readerFocus.set(useJourney.getState().scene,Array.from(reader.querySelectorAll<HTMLElement>(focusSelector)).indexOf(event.target as HTMLElement));
    if((event.target as Element)?.closest('button,a,input,summary,.dojo7-move-pad')){input.scrollDirection=0;pendingScroll=0;}
  };
  const onResize=()=>{resizePending=true;layoutDirty=true;geometryDirty=true;};
  const onBlur=()=>{clearInput();stopDojoInput();pendingScroll=0;if(document.pointerLockElement?.closest('.dojo7-move-pad'))document.exitPointerLock();};
  const onPointerLock=()=>{if(!document.pointerLockElement){clearInput();stopDojoInput();pendingScroll=0;}};
  const onVisibility=()=>{if(document.hidden)rememberCurrent();pauseNextFrame=true;renderDeadline=NaN;updatePerformanceMode();touchY=null;touchBlocked=false;onBlur();if(document.hidden&&document.pointerLockElement?.closest('.dojo7-move-pad'))document.exitPointerLock();};
  const onPopState=()=>{clearInput();pendingScroll=0;restoreLocation();};
  const onMotion=()=>{
    renderDeadline=NaN;
    clearInput();stopDojoInput();pendingScroll=0;
    useJourney.setState({reducedMotion:reduced.matches});
    updatePerformanceMode();
    if(reduced.matches)settleDrainForReducedMotion();
    if(reduced.matches)settleGatesForReducedMotion();
    if(reduced.matches)settleForkForReducedMotion();
    if(reduced.matches)settleDojoForReducedMotion();
    if(reduced.matches&&useJourney.getState().scene==='THRESHOLD'&&useJourney.getState().thresholdPhase!=='pointing'){
      useJourney.setState({thresholdPhase:'receiving'});receiveSummon();
    }
    settleSmithyForMotion();
    spine.kill();spine=makeSpine();
    readyBurst=input.scrollBurst-1;consumedSerial=input.scrollSerial;input.scrollDirection=0;enteredAt=logicalTime;
    readingSpine=0;pendingEntry={scene:useJourney.getState().scene,side:'start'};resizePending=true;
  };
  window.addEventListener('pointermove',onPointer,{passive:true});window.addEventListener('pointerdown',onPointer,{passive:true});window.addEventListener('keydown',onKey);
  window.addEventListener('keyup',onKeyUp);window.addEventListener('blur',onBlur);document.addEventListener('pointerlockchange',onPointerLock);
  document.addEventListener('focusin',onFocus);
  document.addEventListener('scroll',invalidateLayout,{capture:true,passive:true});
  window.addEventListener('resize',onResize);reduced.addEventListener('change',onMotion);
  document.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('popstate',onPopState);
  window.addEventListener('wheel',onWheel,{passive:false});window.addEventListener('touchstart',onTouchStart,{passive:true});
  window.addEventListener('touchmove',onTouchMove,{passive:false});window.addEventListener('touchend',onTouchEnd,{passive:true});window.addEventListener('touchcancel',onTouchCancel,{passive:true});
  function consumeReading(){
    if(pendingEntry){pendingScroll=0;return;}
    if(pendingScroll===0||useJourney.getState().reducedMotion)return;
    const delta=pendingScroll;pendingScroll=0;
    const state=useJourney.getState();
    if(!shell)return;
    const max=layout.shellMax,budget=SCENES[state.scene].budget;
    const next=splitScrollDelta(delta,shell.scrollTop,max);
    shell.scrollTop=next.position;
    // Reading itself earns the camera's progress. No invisible extra scroll quota.
    readingSpine=max>0?budget*next.position/max:Math.max(0,Math.min(budget,readingSpine+next.remainder));
    if(budget>0)lenis.scrollTo(readingSpine,{immediate:true,force:true});
  }
  function consumeTravel(){
    const state=useJourney.getState();
    if(pendingEntry||input.scrollDirection===0||input.scrollSerial<=consumedSerial||logicalTime-lastScrollAt>TIMING.travel.intentLife||section?.getAttribute('data-scene')!==state.scene)return;
    const intent={progress:state.params.progress,burst:input.scrollBurst,readyBurst,serial:input.scrollSerial,consumedSerial,
      direction:input.scrollDirection,elapsedSinceEntry:logicalTime-enteredAt,elapsedSinceInput:logicalTime-lastScrollAt};
    const atContentEnd=state.reducedMotion?layout.stageBottom<=innerHeight+4:!shell||layout.shellMax-shell.scrollTop<=4;
    const atContentStart=state.reducedMotion?layout.stageTop>=-4:!shell||shell.scrollTop<=4;
    const forward=freshTravel({...intent,ready:travelReady(state),atContentEnd},TIMING.travel);
    const reverse=freshReverseTravel({...intent,ready:backwardDestination(state)!==null,atContentStart},TIMING.travel);
    if(!forward&&!reverse)return;
    const from=state.scene,source=input.scrollSource,burst=input.scrollBurst;consumedSerial=input.scrollSerial;
    if(forward)advanceJourney();else retreatJourney();
    const to=useJourney.getState().scene;
    if(to!==from)runtime.travelEvents.push({from,to,input:source,at:performance.now(),burst});
  }
  function domAdapter(){
    const state=useJourney.getState(),p=state.params;
    const scroll=shell?.scrollTop??0;
    const reading=state.reducedMotion?Math.max(0,Math.min(1,-layout.shellTop/Math.max(1,layout.shellHeight-innerHeight))):scroll/Math.max(1,layout.shellMax);
    const center=state.reducedMotion?innerHeight*.48:layout.shellTop+layout.shellClient*.48;
    const screenTop=(top:number)=>layout.shellTop+top-scroll;
    if(state.scene==='COMMISSION'||state.scene==='OATH'){
      if(state.scene==='OATH')p.oathScroll=reading;
      else{
        p.smithyScroll=reading;
        if(smithyStops.length&&center>=screenTop(smithyStops[0].top)&&center<=screenTop(smithyStops[smithyStops.length-1].top)+smithyStops[smithyStops.length-1].height){
          const closest=smithyStops.reduce((best,stop)=>Math.abs(screenTop(stop.top)+stop.height/2-center)<Math.abs(screenTop(best.top)+best.height/2-center)?stop:best);
          selectCommissionRelic(closest.index,'scroll');
        }
      }
    }
    if(state.scene==='DOJO'){
      p.dojoScroll=reading;
      selectDojoBuild(nearestDojoStop(dojoStops.map(stop=>({index:stop.index,center:screenTop(stop.top)+stop.height*.5})),center,state.selectedMember),'scroll');
    }
    const vars={hand:p.hand,sword:p.sword,flash:p.flash,cut:p.cutProgress,ceremony:p.ceremonyTime,pursuit:p.pursuit,
      'scene-mix':p.sceneMix,ink:p.inkFlow,depth:p.depth,progress:p.progress,'pointer-x':p.pointerX,
      'summon-x':p.summonX,'summon-y':p.summonY,'summon-target-x':p.summonTargetX,'summon-target-y':p.summonTargetY,'summon-leave':p.summonLeave,
      'drain-tension':p.drainTension,'drain-snap':p.drainSnap,'drain-dawn':p.drainDawn,'drain-gesture':p.drainGesture,released:p.released};
    Object.assign(vars,{'forge-0':p.forge0,'forge-1':p.forge1,'forge-2':p.forge2,'gate-active':p.gateActive,
      'gate-drag-x':p.gateDragX,'gate-drag-y':p.gateDragY,'train-reveal':p.trainReveal,'train-compile':p.trainCompile,
      'own-x':p.ownX,'own-y':p.ownY,'own-lock':p.ownLock,'fleet-0':p.fleet0,'fleet-1':p.fleet1,'fleet-2':p.fleet2,'gate-pulse':p.gatePulse});
    Object.assign(vars,{'fork-lean':p.forkLean,'fork-choice':p.forkChoice,'fork-collapse':p.forkCollapse,'fork-stroke':p.forkStroke,'fork-reveal':p.forkReveal});
    Object.assign(vars,{'dojo-yaw':p.dojoYaw,'dojo-pitch':p.dojoPitch,'dojo-walk':p.dojoWalk,'dojo-scroll':p.dojoScroll,'dojo-focus':p.dojoFocus,'dojo-guide':p.dojoGuide,
      'hanko-press':p.hankoPress,'hanko-impact':p.hankoImpact,'hanko-bloom':p.hankoBloom,'hanko-stroke':p.hankoStroke});
    Object.assign(vars,{'smithy-scroll':p.smithyScroll,'smithy-unroll':p.smithyUnroll,'smithy-offer':p.smithyOffer,'smithy-focus':p.smithyFocus,
      'commission-stroke':p.commissionStroke,'commission-press':p.commissionPress,'commission-impact':p.commissionImpact,'commission-bloom':p.commissionBloom,
      'oath-time':p.oathTime,'oath-rest':p.oathRest,'oath-gather':p.oathGather,'oath-scroll':p.oathScroll});
    const presentation:Record<string,number|string>=vars;
    if(state.scene==='MERGE'&&!state.reducedMotion){
      const slice=mergeSlicePose(p.ceremonyTime,layout.viewWidth/Math.max(1,layout.viewHeight),TIMING.merge);
      Object.assign(presentation,{'slice-strike':slice.strike,'slice-opening':slice.opening,
        'slice-left-y':`${slice.leftY*100}%`,'slice-right-y':`${slice.rightY*100}%`,
        'slice-gap-upper-left-y':`${(slice.leftY+slice.upper[1]-slice.slope*slice.upper[0])*100}%`,
        'slice-gap-upper-right-y':`${(slice.rightY+slice.upper[1]-slice.slope*slice.upper[0])*100}%`,
        'slice-gap-lower-left-y':`${(slice.leftY+slice.lower[1]-slice.slope*slice.lower[0])*100}%`,
        'slice-gap-lower-right-y':`${(slice.rightY+slice.lower[1]-slice.slope*slice.lower[0])*100}%`,
        'slice-upper-x':`${slice.upper[0]*layout.viewWidth}px`,'slice-upper-y':`${slice.upper[1]*layout.viewHeight}px`,
        'slice-lower-x':`${slice.lower[0]*layout.viewWidth}px`,'slice-lower-y':`${slice.lower[1]*layout.viewHeight}px`});
    }
    for(const [name,value] of Object.entries(presentation)){
      const next=String(value);if(cssValues.get(name)===next)continue;
      cssValues.set(name,next);root.style.setProperty(`--${name}`,next);
    }
    if(cursor){
      const transform=`translate3d(${p.cursorX}px,${p.cursorY}px,0)`,hover=String(p.cursorHover>0.5);
      if(transform!==cursorTransform){cursor.style.transform=transform;cursorTransform=transform;}
      if(hover!==cursorHover){cursor.dataset.hover=hover;cursorHover=hover;}
    }
  }
  function heartbeat(_time:number,deltaMs:number){
    if(destroyed||document.hidden)return;
    const elapsedDelta=pauseNextFrame?0:deltaMs/1000;pauseNextFrame=false;
    const dt=Math.min(elapsedDelta,0.05);
    logicalTime+=elapsedDelta;
    const s=useJourney.getState(),p=s.params;
    runtime.clockPhases=['input'];
    stepForkMotion(dt);
    stepDojo(dt);
    stepSmithy(elapsedDelta);
    p.pointerPixelX=input.cursorX;p.pointerPixelY=input.cursorY;p.pointerSerial=input.serial;
    if(!s.reducedMotion){
      p.pointerX+= (input.x-p.pointerX)*0.08;p.pointerY+=(input.y-p.pointerY)*0.08;
      p.cursorX+=(input.cursorX-p.cursorX)*0.3;p.cursorY+=(input.cursorY-p.cursorY)*0.3;p.cursorHover=input.hover?1:0;
      if(s.scene==='THRESHOLD'&&s.thresholdPhase==='pointing'){
        const point=advanceSummonPointer([p.summonX,p.summonY],summonAim,dt);p.summonX=point[0];p.summonY=point[1];
      }
    }
    input.dx=0;input.dy=0;
    if(resizePending)resizeSpine();syncLayout();placeReaderEntry();
    runtime.clockPhases.push('Lenis');consumeReading();lenis.raf(logicalTime*1000);ScrollTrigger.update();
    if(!pendingEntry){
      const progress=s.reducedMotion?nativeReadingProgress(layout.stageTop,layout.stageHeight,innerHeight):spine.progress;
      // A short still chapter has both boundaries in view: upward intent owns its start.
      updateProgress(s.reducedMotion&&input.scrollDirection<0&&layout.stageTop>=-4?0:progress);
    }
    runtime.clockPhases.push('GSAP timelines');gsap.updateRoot(logicalTime);p.time=logicalTime;
    if(soundDirector.isSilent&&soundDirector.snapshot().connected)runtime.silenceViolations++;
    consumeTravel();
    runtime.clockPhases.push('DOM / uniform adapters');domAdapter();
    runtime.clockPhases.push('R3F uniform upload / composer render');
    updatePerformanceMode();
    const planned=nextRenderDeadline(logicalTime,renderDeadline,useJourney.getState().reducedMotion);renderDeadline=planned.nextDeadline;
    if(planned.render)advanceWorld(logicalTime);
    samplePerformance();
    runtime.frames++;sampleFrames++;
    const elapsed=(performance.now()-sampleStart)/1000;
    if(elapsed>=2){runtime.fps=sampleFrames/elapsed;runtime.sampleSeconds=elapsed;sampleStart=performance.now();sampleFrames=0;}
    if(logicalTime-lastNotify>0.1){notifyParams();lastNotify=logicalTime;}
  }
  const removeNavigation=installNavigation(handleNavigation);
  restoreLocation(true);
  runtime.heartbeatOwners++;gsap.ticker.add(heartbeat);
  if(!pendingEntry)sceneEntry();
  const setFog=(value:number)=>gsap.to(useJourney.getState().params,{fogDensity:value,duration:TIMING.fogTween,ease:'power2.out'});
  const setInk=(value:{bleed?:number;pressure?:number})=>{
    const target:Record<string,number>={};
    if(value.bleed!==undefined)target.inkBleed=Math.max(0,Math.min(1.5,value.bleed));
    if(value.pressure!==undefined)target.inkPressure=Math.max(0.5,Math.min(1.5,value.pressure));
    gsap.to(useJourney.getState().params,{...target,duration:TIMING.fogTween,ease:'power2.out'});
  };
  window.__GH_DEBUG={setFog,setInk,snapshot:()=>{
    const s=useJourney.getState();return {scene:s.scene,navUnlocked:s.navUnlocked,thresholdReady:s.thresholdReady,thresholdPhase:s.thresholdPhase,
      drainReleased:s.drainReleased,drainSettled:s.drainSettled,drainAuditIndex:s.drainAuditIndex,drainAuditSource:s.drainAuditSource,completedGates:s.completedGates,swordMoments:s.swordMoments,
      swordCount:s.swordMoments.length,shingCount:s.shingCount,soundEnabled:s.soundEnabled,
      reducedMotion:s.reducedMotion,dojoSeal:s.dojoSeal,dojoExploring:s.dojoExploring,dojoPhase:s.dojoPhase,selectedMember:s.selectedMember,commissionSeal:s.commissionSeal,commissionExploring:s.commissionExploring,
      commissionPhase:s.commissionPhase,commissionSealedRelic:s.commissionSealedRelic,selectedRelic:s.selectedRelic,
      visitedScenes:s.visitedScenes,journey:s.journeyNumber,readerEntry:s.readerEntry,practiceExploring:s.practiceExploring,navigationStack:s.navigationStack,
      gates:{forgeSeated:s.forgeSeated,forgeSettled:s.forgeSettled,trainSeed:s.trainSeed,trainPhase:s.trainPhase,
        ownPhase:s.ownPhase,fleetSent:s.fleetSent,fleetSettled:s.fleetSettled},
      forkChoice:s.forkChoice,travel:{ready:travelReady(s),readyBurst,burst:input.scrollBurst,serial:input.scrollSerial,consumedSerial,inputAge:logicalTime-lastScrollAt,
        readingSpine,pendingScroll,entryPending:pendingEntry?.side??null,guidance:journeyGuidance(s)},
      params:Object.fromEntries(Object.entries(s.params).filter(([,value])=>typeof value==='number')),audio:soundDirector.snapshot(),performance:getPerformanceSnapshot(),runtime:{...runtime}};
  }};
  console.info('BUILT BY GHOST HANDS — v10 Performance and the receipt. One scrolling journey; local studies. Runtime receipt: window.__GH_DEBUG.snapshot()');
  return {setAdvance(fn){advanceWorld=fn;},destroy(){
    rememberCurrent();removeNavigation();destroyed=true;timeline?.kill();stopDrainRite();stopGateRites();stopForkRite();stopDojo();stopSmithy();unsubscribe();lenis.destroy();spine.kill();ScrollTrigger.disable(false,true);
    gsap.ticker.remove(heartbeat);runtime.heartbeatOwners--;gsap.ticker.add(gsap.updateRoot);
    window.removeEventListener('pointermove',onPointer);window.removeEventListener('pointerdown',onPointer);window.removeEventListener('keydown',onKey);
    window.removeEventListener('keyup',onKeyUp);window.removeEventListener('blur',onBlur);document.removeEventListener('pointerlockchange',onPointerLock);
    document.removeEventListener('focusin',onFocus);document.removeEventListener('scroll',invalidateLayout,true);observer?.disconnect();
    window.removeEventListener('resize',onResize);reduced.removeEventListener('change',onMotion);
    document.removeEventListener('visibilitychange',onVisibility);window.history.scrollRestoration=oldRestoration;
    window.removeEventListener('popstate',onPopState);
    window.removeEventListener('wheel',onWheel);window.removeEventListener('touchstart',onTouchStart);window.removeEventListener('touchmove',onTouchMove);
    window.removeEventListener('touchend',onTouchEnd);window.removeEventListener('touchcancel',onTouchCancel);
    delete window.__GH_DEBUG;
  }};
}
