'use client';
import gsap from 'gsap';
import { TIMING } from './config';
import { useJourney,runtime } from './world';
import { input } from './input';
import { soundDirector } from './sound';
import { clampDojoLook,stepDojoMotion,validDojoBuild,type DojoMotion } from './dojo';

let rite:gsap.core.Timeline|null=null;
let motion:DojoMotion={x:0,z:0,vx:0,vz:0},move={x:0,z:0},look={x:0,y:0};
const mark=(event:string,source:string)=>runtime.dojoEvents.push({event,input:source,at:performance.now(),selected:useJourney.getState().selectedMember});
export function stopDojoInput(){move={x:0,z:0};look={x:0,y:0};motion.vx=0;motion.vz=0;}
export function stopDojo(){
  rite?.kill();rite=null;stopDojoInput();
  const s=useJourney.getState();gsap.killTweensOf(s.params,'hankoStroke');
  if(s.dojoPhase==='pressing')useJourney.setState({dojoPhase:s.dojoSeal?'sealed':'idle'});
  if(typeof document!=='undefined'&&document.pointerLockElement?.closest('.dojo7-move-pad'))document.exitPointerLock();
}
export function prepareDojo(){
  stopDojo();motion={x:0,z:0,vx:0,vz:0};const s=useJourney.getState();
  Object.assign(s.params,{dojoYaw:0,dojoPitch:0,dojoWalk:0,dojoScroll:0,dojoFocus:s.selectedMember,dojoGuide:0,
    hankoPress:0,hankoImpact:0,hankoBloom:s.dojoSeal?1:0,hankoStroke:0});
  useJourney.setState({dojoPhase:s.dojoSeal?'sealed':'idle'});mark('enter','journey');
}
export function queueDojoLook(dx:number,dy:number){
  const s=useJourney.getState();if(s.scene!=='DOJO'||s.reducedMotion||![dx,dy].every(Number.isFinite))return;
  look.x+=Math.max(-160,Math.min(160,dx));look.y+=Math.max(-160,Math.min(160,dy));
}
export function setDojoMove(x:number,z:number){
  const s=useJourney.getState();if(s.scene!=='DOJO'||s.reducedMotion||![x,z].every(Number.isFinite)){move={x:0,z:0};return;}
  move={x:Math.max(-1,Math.min(1,x)),z:Math.max(-1,Math.min(1,z))};
}
export function selectDojoBuild(index:number,source='button'){
  const s=useJourney.getState();if(s.scene!=='DOJO'||!validDojoBuild(index)||s.selectedMember===index)return false;
  useJourney.setState({selectedMember:index});mark('focus',source);return true;
}
export function stepDojo(dt:number){
  const s=useJourney.getState();if(s.scene!=='DOJO')return;const p=s.params;
  const easing=1-Math.exp(-8*Math.max(0,Math.min(.05,dt)));
  p.dojoFocus=s.reducedMotion?s.selectedMember:p.dojoFocus+(s.selectedMember-p.dojoFocus)*easing;
  p.dojoGuide=p.dojoScroll;
  if(s.reducedMotion){stopDojoInput();p.cameraX=0;p.cameraZ=0;p.dojoYaw=0;p.dojoPitch=0;p.dojoWalk=0;return;}
  const nextLook=clampDojoLook(p.dojoYaw-look.x*.002,p.dojoPitch-look.y*.0015);look={x:0,y:0};
  p.dojoYaw=nextLook.yaw;p.dojoPitch=nextLook.pitch;
  const keys=input.keys;
  motion=stepDojoMotion(motion,{x:move.x+Number(keys.has('KeyD'))-Number(keys.has('KeyA')),
    z:move.z+Number(keys.has('KeyS'))-Number(keys.has('KeyW'))},p.dojoYaw,dt);
  p.cameraX=motion.x;p.cameraZ=Math.max(-8,Math.min(1.6,motion.z-p.dojoScroll*5));
  p.dojoWalk=Math.min(1,Math.hypot(motion.vx,motion.vz)/2.1);
}
export function previewHankoStroke(progress:number){
  const s=useJourney.getState();if(s.scene!=='DOJO'||s.dojoSeal||!Number.isFinite(progress))return;
  gsap.to(s.params,{hankoStroke:Math.max(0,Math.min(1,progress)),duration:s.reducedMotion?0:TIMING.dojo.stroke,ease:'power2.out',overwrite:'auto'});
}
export function cancelHankoStroke(){previewHankoStroke(0);}
export function settleDojoForReducedMotion(){
  const s=useJourney.getState();if(s.scene!=='DOJO')return;
  rite?.kill();rite=null;stopDojoInput();
  if(document.pointerLockElement?.closest('.dojo7-move-pad'))document.exitPointerLock();
  Object.assign(s.params,{hankoPress:0,hankoImpact:0,hankoBloom:s.dojoSeal?1:0,hankoStroke:0,dojoYaw:0,dojoPitch:0,dojoWalk:0});
  useJourney.setState({dojoPhase:s.dojoSeal?'sealed':'idle'});
}
export function commitHanko(source:'pointer'|'keyboard'='pointer'){
  const s=useJourney.getState();if(s.scene!=='DOJO'||s.dojoSeal||s.dojoPhase!=='idle')return false;
  rite?.kill();gsap.killTweensOf(s.params,'hankoStroke');s.params.hankoStroke=1;
  useJourney.setState({dojoSeal:true,dojoPhase:s.reducedMotion?'sealed':'pressing'});mark('hanko-commit',source);
  if(s.reducedMotion){s.params.hankoBloom=1;s.params.hankoPress=0;soundDirector.emit('ink_bloom');mark('hanko-static',source);return true;}
  rite=gsap.timeline({onComplete:()=>{useJourney.setState({dojoPhase:'sealed'});mark('hanko-settled',source);}})
    .to(s.params,{hankoPress:1,duration:TIMING.dojo.press,ease:'power4.in'},0)
    .call(()=>{s.params.hankoImpact=1;soundDirector.emit('ink_bloom');mark('hanko-impact',source);},[],TIMING.dojo.press)
    .to(s.params,{hankoImpact:0,duration:TIMING.dojo.impact,ease:'power3.out'},TIMING.dojo.press)
    .to(s.params,{hankoBloom:1,duration:TIMING.dojo.bloom,ease:'power2.out'},TIMING.dojo.press)
    .to(s.params,{hankoPress:0,duration:TIMING.dojo.lift,ease:'power3.out'},TIMING.dojo.press+.1);
  return true;
}
