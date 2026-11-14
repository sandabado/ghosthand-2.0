'use client';
import gsap from 'gsap';
import { TIMING,type SceneId,type SwordMoment } from './config';
import { initialParams,runtime,useJourney } from './world';
import { soundDirector } from './sound';
import { clearInput } from './input';
import { drainAudit } from './fixtures';
import { stopGateRites } from './gate-director';
import { stepForkSpring } from './cut';
import { travelDestination } from './travel';
let overlap:gsap.core.Timeline|null=null;
let drainRite:gsap.core.Timeline|null=null;
let forkRite:gsap.core.Timeline|null=null,forkAim=0;
export function stopForkRite(){forkRite?.kill();forkRite=null;gsap.killTweensOf(useJourney.getState().params,'forkStroke');forkAim=0;}
export function prepareFork(){
  stopForkRite();const s=useJourney.getState(),p=s.params;
  Object.assign(p,{forkLean:0,forkVelocity:0,forkChoice:0,forkCollapse:0,forkStroke:0,forkReveal:s.reducedMotion?1:.85});
  useJourney.setState({forkChoice:null});
  if(!s.reducedMotion)forkRite=gsap.timeline().to(p,{forkReveal:1,duration:TIMING.cut.reveal,ease:'power3.out'});
}
export function aimFork(value:number){
  const s=useJourney.getState();if(s.scene!=='FORK'||s.forkChoice||!Number.isFinite(value))return;
  forkAim=s.reducedMotion?0:Math.max(-1,Math.min(1,value));
}
export function stepForkMotion(dt:number){
  const s=useJourney.getState();if(s.scene!=='FORK')return;
  const p=s.params;if(s.reducedMotion){p.forkLean=0;p.forkVelocity=0;return;}
  const target=s.forkChoice?(s.forkChoice==='DOJO'?-.8:.8):forkAim;
  const step=stepForkSpring(p.forkLean,p.forkVelocity,target,dt);p.forkLean=step.position;p.forkVelocity=step.velocity;
}
export function previewForkStroke(progress:number){
  const s=useJourney.getState();if(s.scene!=='FORK'||s.forkChoice||!Number.isFinite(progress))return;
  gsap.to(s.params,{forkStroke:Math.max(0,Math.min(1,progress)),duration:s.reducedMotion?0:TIMING.cut.stroke,ease:'power2.out',overwrite:'auto'});
}
export function cancelForkStroke(){previewForkStroke(0);}
export function settleForkForReducedMotion(){
  const s=useJourney.getState();if(s.scene!=='FORK')return;
  const choice=s.forkChoice;stopForkRite();s.params.forkLean=0;s.params.forkVelocity=0;s.params.forkReveal=1;s.params.forkStroke=0;
  if(choice){s.params.forkCollapse=1;runtime.forkEvents.push({event:'commit-static',branch:choice,at:performance.now(),input:'reduced-motion'});transitionTo(choice);}
}
export function stopDrainRite(){drainRite?.kill();drainRite=null;}
export function prepareDrain(){
  stopDrainRite();
  const s=useJourney.getState(),p=s.params;
  p.drainClock=0;p.drainGesture=0;p.drainFocus=s.drainAuditIndex;
  p.drainSnap=s.drainSettled?1:0;p.drainDawn=s.drainSettled?1:0;p.released=s.drainSettled?1:0;
  p.drainTension=s.drainSettled?0:s.reducedMotion?1:0.15;
  if(!s.drainSettled&&!s.reducedMotion)drainRite=gsap.timeline().to(p,{drainTension:1,duration:TIMING.drain.entrance,ease:'sine.out'});
}
export function settleDrainForReducedMotion(){
  const s=useJourney.getState();if(s.scene!=='DRAIN')return;
  stopDrainRite();gsap.killTweensOf(s.params,'drainTension,drainGesture');
  const p=s.params;p.drainGesture=0;
  if(!s.drainReleased){p.drainTension=1;return;}
  if(s.drainSettled)return;
  Object.assign(p,{drainTension:0,drainSnap:1,drainDawn:1,released:1,drainClock:TIMING.drain.settle});
  useJourney.setState({drainSettled:true});
  runtime.drainEvents.push({event:'free-static',at:performance.now(),input:'reduced-motion'});
}
export function updateDrainGesture(progress:number){
  const s=useJourney.getState();if(s.scene!=='DRAIN'||s.drainReleased||!Number.isFinite(progress))return;
  gsap.to(s.params,{drainGesture:Math.max(0,Math.min(1,progress)),duration:s.reducedMotion?0:TIMING.drain.gesture,ease:'power2.out',overwrite:'auto'});
}
export function selectDrainAudit(index:number,source:'keyboard'|'pointer'|'filament'){
  const s=useJourney.getState();if(s.scene!=='DRAIN'||s.drainReleased||!Number.isFinite(index))return;
  const next=Math.max(0,Math.min(drainAudit.length-1,Math.floor(index)));
  if(s.drainAuditIndex===next&&s.drainAuditSource===source)return;
  s.params.drainFocus=next;useJourney.setState({drainAuditIndex:next,drainAuditSource:source});
}
export function recordSword(moment:SwordMoment){
  const state=useJourney.getState();
  if(!state.swordMoments.includes(moment)) useJourney.setState({swordMoments:[...state.swordMoments,moment]});
}
export function transitionTo(scene:SceneId,ceremonial=false){
  const state=useJourney.getState();
  if(state.scene===scene)return;
  overlap?.kill();clearInput();
  const prev=state.scene;
  state.params.progress=0;state.params.sword=0;state.params.flash=0;
  state.params.sceneMix=ceremonial||state.reducedMotion?1:0;
  state.params.cutProgress=0;
  useJourney.setState({scene,previousScene:ceremonial||state.reducedMotion?null:prev,
    visitedScenes:state.visitedScenes.includes(scene)?state.visitedScenes:[...state.visitedScenes,scene]});
  if(!ceremonial&&!state.reducedMotion){
    overlap=gsap.timeline({onComplete:()=>useJourney.setState({previousScene:null})})
      .to(state.params,{sceneMix:1,duration:TIMING.overlap,ease:'sine.inOut'},0);
  }
}
export function advanceJourney(){
  const s=useJourney.getState();
  const target=travelDestination(s);if(!target)return;
  if(target==='PURSUIT'){if(s.pursuitUsed)return;useJourney.setState({pursuitUsed:true});}
  transitionTo(target);
}
export function releaseDrain(input:'pointer'|'keyboard'='keyboard'){
  const s=useJourney.getState();if(s.scene!=='DRAIN'||s.drainReleased)return;
  stopDrainRite();gsap.killTweensOf(s.params,'drainTension,drainGesture');
  useJourney.setState({drainReleased:true});
  const p=s.params,t=TIMING.drain;
  const mark=(event:string)=>runtime.drainEvents.push({event,at:performance.now(),input});
  mark('release');
  if(s.reducedMotion){
    Object.assign(p,{drainGesture:0,drainTension:0,drainSnap:1,drainDawn:1,released:1,drainClock:t.settle});
    useJourney.setState({drainSettled:true});mark('free-static');return;
  }
  soundDirector.emit('creak');
  drainRite=gsap.timeline();
  drainRite.to(p,{drainClock:t.settle,duration:t.settle,ease:'none'},0)
    .to(p,{drainTension:1.28,drainGesture:0,duration:t.tensionLead,ease:'power2.in'},0)
    .call(()=>mark('snap'),[],t.snapStart)
    .to(p,{drainSnap:1,released:1,drainTension:0,duration:t.snapDuration,ease:'power2.inOut'},t.snapStart)
    .call(()=>{mark('dawn');soundDirector.emit('ink_bloom');},[],t.dawnStart)
    .to(p,{drainDawn:1,duration:t.dawnDuration,ease:'sine.inOut'},t.dawnStart)
    .call(()=>{useJourney.setState({drainSettled:true});mark('free');},[],t.settle);
}
export function commitFork(branch:'DOJO'|'CHAINS_HOLD',input:'pointer'|'keyboard'='pointer'){
  const s=useJourney.getState();if(s.scene!=='FORK'||!s.navUnlocked||s.forkChoice)return false;
  stopForkRite();s.params.forkChoice=branch==='DOJO'?-1:1;s.params.forkStroke=1;s.params.forkReveal=1;
  useJourney.setState({forkChoice:branch});runtime.forkEvents.push({event:'commit',branch,at:performance.now(),input});soundDirector.emit('ink_bloom');
  const finish=()=>{runtime.forkEvents.push({event:'route',branch,at:performance.now(),input});transitionTo(branch);};
  if(s.reducedMotion){s.params.forkCollapse=1;finish();return true;}
  forkRite=gsap.timeline().to(s.params,{forkCollapse:1,duration:TIMING.cut.collapse,ease:'power2.in',onComplete:finish});
  return true;
}
export function navigate(scene:'DOJO'|'COMMISSION'|'FORK'|'OATH'){
  const s=useJourney.getState();if(!s.navUnlocked)return;
  if(scene==='FORK'&&s.scene!=='CHAINS_HOLD')return;
  if(scene==='OATH'&&!['DOJO','COMMISSION'].includes(s.scene))return;
  transitionTo(scene);
}
export function sealRitual(kind:'dojo'|'commission'){
  const s=useJourney.getState();
  if(kind==='dojo'&&s.scene==='DOJO')useJourney.setState({dojoSeal:true});
  if(kind==='commission'&&s.scene==='COMMISSION')useJourney.setState({commissionSeal:true});
  soundDirector.emit('ink_bloom');
}
export function setSelectedMember(selectedMember:number){useJourney.setState({selectedMember});}
export function setSelectedRelic(selectedRelic:number){useJourney.setState({selectedRelic});}
export function resetJourney(){
  const s=useJourney.getState();overlap?.kill();stopDrainRite();stopGateRites();stopForkRite();gsap.killTweensOf(s.params);soundDirector.reset();clearInput();
  Object.assign(s.params,initialParams());
  runtime.ceremonyEvents=[];runtime.soundEvents=[];runtime.silenceViolations=0;runtime.drainEvents=[];
  runtime.drain.pickHits=0;runtime.drain.releaseSamples=0;runtime.drain.lastPicked=-1;
  runtime.gateEvents=[];runtime.gates.uniformUploads=0;
  runtime.forkEvents=[];runtime.travelEvents=[];runtime.cut.uniformUploads=0;
  useJourney.setState({scene:'THRESHOLD',previousScene:null,navUnlocked:false,thresholdReady:false,
    drainReleased:false,drainSettled:false,drainAuditIndex:0,drainAuditSource:'keyboard',completedGates:[],swordMoments:[],pursuitUsed:false,shingCount:0,dojoSeal:false,
    commissionSeal:false,selectedMember:0,selectedRelic:0,journeyNumber:s.journeyNumber+1,
    resetVersion:s.resetVersion+1,visitedScenes:['THRESHOLD'],forgeSeated:[],forgeSettled:[],trainSeed:'',trainPhase:'idle',ownPhase:'idle',fleetSent:[],fleetSettled:[],forkChoice:null});
}
