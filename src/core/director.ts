'use client';
import gsap from 'gsap';
import { SCENES,TIMING,type SceneId,type SwordMoment } from './config';
import { initialParams,runtime,useJourney } from './world';
import { soundDirector } from './sound';
import { clearInput } from './input';
let overlap:gsap.core.Timeline|null=null;
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
      .to(state.params,{sceneMix:1,duration:TIMING.overlap,ease:'sine.inOut'},0)
      .to(state.params,{cutProgress:1,duration:TIMING.overlap/2,ease:'sine.inOut'},0)
      .to(state.params,{cutProgress:0,duration:TIMING.overlap/2,ease:'sine.inOut'},TIMING.overlap/2);
  }
}
export function advanceJourney(){
  const s=useJourney.getState();
  if(s.scene==='THRESHOLD'&&s.thresholdReady)transitionTo('LEGEND');
  else if(s.scene==='LEGEND')transitionTo('DRAIN');
  else if(s.scene==='DRAIN'&&s.drainReleased)transitionTo('CRAFT_F1');
  else if(s.scene.startsWith('CRAFT_F')){
    const gate=Number(s.scene.slice(-1));
    if(!s.completedGates.includes(gate))return;
    if(gate===4&&!s.pursuitUsed){useJourney.setState({pursuitUsed:true});transitionTo('PURSUIT');}
    else if(gate<4)transitionTo(`CRAFT_F${gate+1}` as SceneId);
  }
}
export function completeGate(gate:number){
  const s=useJourney.getState();
  if(s.scene!==`CRAFT_F${gate}`||s.completedGates.includes(gate))return;
  useJourney.setState({completedGates:[...s.completedGates,gate]});soundDirector.emit(gate===4?'ember':'ink_bloom');
  gsap.fromTo(s.params,{inkFlow:0},{inkFlow:1,duration:TIMING.draw,ease:'power3.out'});
}
export function releaseDrain(){
  if(useJourney.getState().scene!=='DRAIN')return;
  useJourney.setState({drainReleased:true});
  gsap.to(useJourney.getState().params,{released:1,duration:TIMING.draw,ease:'expo.out'});
  soundDirector.emit('ink_bloom');
}
export function commitFork(branch:'DOJO'|'CHAINS_HOLD'){
  if(useJourney.getState().scene!=='FORK'||!useJourney.getState().navUnlocked)return;
  transitionTo(branch);soundDirector.emit('ink_bloom');
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
  const s=useJourney.getState();overlap?.kill();gsap.killTweensOf(s.params);soundDirector.reset();clearInput();
  Object.assign(s.params,initialParams());
  runtime.ceremonyEvents=[];runtime.soundEvents=[];runtime.silenceViolations=0;
  useJourney.setState({scene:'THRESHOLD',previousScene:null,navUnlocked:false,thresholdReady:false,
    drainReleased:false,completedGates:[],swordMoments:[],pursuitUsed:false,shingCount:0,dojoSeal:false,
    commissionSeal:false,selectedMember:0,selectedRelic:0,journeyNumber:s.journeyNumber+1,
    resetVersion:s.resetVersion+1,visitedScenes:['THRESHOLD']});
}
export function canScrollAdvance(){
  const s=useJourney.getState();return SCENES[s.scene].budget>0&&s.params.progress>=0.995;
}
