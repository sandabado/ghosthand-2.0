'use client';
import gsap from 'gsap';
import { TIMING } from './config';
import { useJourney,runtime } from './world';
import { soundDirector } from './sound';
import { FORGE_HOME,FORGE_TARGETS,OWN_HOME,OWN_TARGET,fleetIntent,forgeHit,ownHit,normalizeTrainingSeed,type Point,type Size } from './gates';

const rites=new Map<string,gsap.core.Animation>();
let dragTween:gsap.core.Tween|null=null,dragCommitted=false;
const forgeKey=(i:number)=>`forge${i}` as 'forge0'|'forge1'|'forge2';
const fleetKey=(i:number)=>`fleet${i}` as 'fleet0'|'fleet1'|'fleet2';
const gateNumber=()=>Number(useJourney.getState().scene.match(/^CRAFT_F([1-4])$/)?.[1]??0);
const validIndex=(i:number)=>Number.isInteger(i)&&i>=0&&i<3;
const finitePoint=(point:Point)=>Number.isFinite(point.x)&&Number.isFinite(point.y);
function mark(event:string,gate:number,input:string){runtime.gateEvents.push({event,gate,at:performance.now(),input});}
function pulse(){
  const s=useJourney.getState();rites.get('pulse')?.kill();
  if(s.reducedMotion){s.params.gatePulse=0;return;}
  rites.set('pulse',gsap.fromTo(s.params,{gatePulse:1},{gatePulse:0,duration:TIMING.gates.pulse,ease:'power2.out'}));
}
function finishGate(gate:number,input:string){
  const s=useJourney.getState();if(gateNumber()!==gate||s.completedGates.includes(gate))return;
  const ready=gate===1?s.forgeSettled.length===3:gate===2?s.trainPhase==='compiled':gate===3?s.ownPhase==='locked':s.fleetSettled.length===3;
  if(!ready)return;
  useJourney.setState({completedGates:[...s.completedGates,gate]});
  s.params.inkFlow=1;mark('gate-complete',gate,input);pulse();
}
export function stopGateRites(){
  rites.forEach(t=>t.kill());rites.clear();dragTween?.kill();dragTween=null;dragCommitted=false;
  useJourney.getState().params.gateActive=-1;
}
export function prepareGate(){
  stopGateRites();const s=useJourney.getState();s.params.gatePulse=0;
  if(s.ownPhase==='idle'){s.params.ownX=OWN_HOME.x;s.params.ownY=OWN_HOME.y;}
}
export function beginGateDrag(index:number,point:Point){
  const s=useJourney.getState(),gate=gateNumber();
  if(![1,3,4].includes(gate)||!validIndex(index)||!finitePoint(point)||s.completedGates.includes(gate)||dragCommitted)return false;
  if((gate===1&&s.forgeSeated.includes(index))||(gate===3&&(index!==0||s.ownPhase!=='idle'))||(gate===4&&s.fleetSent.includes(index)))return false;
  dragTween?.kill();s.params.gateActive=index;
  s.params.gateDragX=point.x;s.params.gateDragY=point.y;
  return true;
}
export function moveGateDrag(index:number,point:Point){
  const s=useJourney.getState();if(s.params.gateActive!==index||dragCommitted||!finitePoint(point)||!gateNumber())return;
  const x=Math.max(-.5,Math.min(1.5,point.x)),y=Math.max(-.5,Math.min(1.5,point.y));
  const target=gateNumber()===3?{gateDragX:x,gateDragY:y,ownX:x,ownY:y}:{gateDragX:x,gateDragY:y};
  dragTween?.kill();dragTween=gsap.to(s.params,{...target,duration:s.reducedMotion?0:TIMING.gates.drag,ease:'power2.out'});
}
export function cancelGateDrag(){
  const s=useJourney.getState(),gate=gateNumber(),index=s.params.gateActive;
  if(index<0||dragCommitted)return;
  const home=gate===1?FORGE_HOME[index]:gate===3?OWN_HOME:{x:.2+index*.3,y:.77};
  if(!home)return;
  dragTween?.kill();const target=gate===3?{gateDragX:home.x,gateDragY:home.y,ownX:home.x,ownY:home.y}:{gateDragX:home.x,gateDragY:home.y};
  dragTween=gsap.to(s.params,{...target,duration:s.reducedMotion?0:TIMING.gates.return,ease:'power3.out',onComplete:()=>{s.params.gateActive=-1;}});
}
function acceptForge(index:number,input:string,pointer=false){
  const s=useJourney.getState();if(gateNumber()!==1||!validIndex(index)||s.forgeSeated.includes(index)||dragCommitted)return;
  dragTween?.kill();if(!pointer)s.params.gateActive=-1;
  useJourney.setState({forgeSeated:[...s.forgeSeated,index]});mark('strand-seat',1,input);soundDirector.emit('ember');pulse();
  const p=s.params,settle=()=>{
    const now=useJourney.getState();if(gateNumber()!==1||now.forgeSettled.includes(index))return;
    p[forgeKey(index)]=1;if(pointer){p.gateActive=-1;dragCommitted=false;}
    useJourney.setState({forgeSettled:[...now.forgeSettled,index]});finishGate(1,input);
  };
  if(s.reducedMotion){settle();return;}
  if(pointer)dragCommitted=true;
  const target=FORGE_TARGETS[index];
  rites.set(`forge-${index}`,gsap.to(p,{[forgeKey(index)]:1,...(pointer?{gateDragX:target.x,gateDragY:target.y}:{}),duration:TIMING.gates.forgeSnap,ease:'back.out(1.3)',onComplete:settle}));
}
export function releaseForge(index:number,point:Point,size:Size){
  const s=useJourney.getState();if(gateNumber()!==1||s.params.gateActive!==index||dragCommitted)return false;
  if(!forgeHit(index,point,size)){mark('strand-miss',1,'pointer');cancelGateDrag();return false;}
  s.params.gateDragX=point.x;s.params.gateDragY=point.y;acceptForge(index,'pointer',true);return true;
}
export function seatForge(index:number){acceptForge(index,'keyboard');}
export function startTraining(value:string){
  const s=useJourney.getState(),seed=normalizeTrainingSeed(value);
  if(gateNumber()!==2||s.trainPhase!=='idle'||!seed)return false;
  useJourney.setState({trainSeed:seed,trainPhase:'writing'});mark('ghost-start',2,'text');
  const p=s.params,settle=()=>{useJourney.setState({trainPhase:'compiled'});mark('compile',2,'text');soundDirector.emit('ink_bloom');pulse();finishGate(2,'text');};
  if(s.reducedMotion){p.trainReveal=1;p.trainCompile=1;settle();return true;}
  rites.set('train',gsap.timeline().to(p,{trainReveal:1,duration:TIMING.gates.trainType,ease:'none'})
    .to(p,{trainCompile:1,duration:TIMING.gates.trainCompile,ease:'expo.out',onStart:()=>soundDirector.emit('ember'),onComplete:settle}));
  return true;
}
function acceptOwn(input:string){
  const s=useJourney.getState();if(gateNumber()!==3||s.ownPhase!=='idle')return;
  dragTween?.kill();s.params.gateActive=-1;useJourney.setState({ownPhase:'locking'});mark('ownership-lock',3,input);soundDirector.emit('creak');
  const p=s.params,settle=()=>{p.ownX=OWN_TARGET.x;p.ownY=OWN_TARGET.y;p.ownLock=1;useJourney.setState({ownPhase:'locked'});mark('ownership-ignition',3,input);soundDirector.emit('ink_bloom');pulse();finishGate(3,input);};
  if(s.reducedMotion){settle();return;}
  rites.set('own',gsap.timeline().to(p,{ownX:OWN_TARGET.x,ownY:OWN_TARGET.y,duration:TIMING.gates.ownLock*.35,ease:'power3.out'},0)
    .to(p,{ownLock:1,duration:TIMING.gates.ownLock,ease:'power3.inOut',onComplete:settle},0));
}
export function releaseOwn(point:Point,size:Size,travel:number){
  const s=useJourney.getState();if(gateNumber()!==3||s.params.gateActive!==0||s.ownPhase!=='idle')return false;
  if(!Number.isFinite(travel)||travel<20||!ownHit(point,size)){mark('ownership-miss',3,'pointer');cancelGateDrag();return false;}
  s.params.ownX=point.x;s.params.ownY=point.y;acceptOwn('pointer');return true;
}
export function claimOwn(){acceptOwn('keyboard');}
function acceptFleet(index:number,input:string){
  const s=useJourney.getState();if(gateNumber()!==4||!validIndex(index)||s.fleetSent.includes(index))return;
  dragTween?.kill();s.params.gateActive=-1;useJourney.setState({fleetSent:[...s.fleetSent,index]});mark('hand-dispatch',4,input);soundDirector.emit('ember');pulse();
  const p=s.params,settle=()=>{const now=useJourney.getState();if(gateNumber()!==4||now.fleetSettled.includes(index))return;p[fleetKey(index)]=1;useJourney.setState({fleetSettled:[...now.fleetSettled,index]});mark('hand-arrived',4,input);finishGate(4,input);};
  if(s.reducedMotion){settle();return;}
  rites.set(`fleet-${index}`,gsap.to(p,{[fleetKey(index)]:1,duration:TIMING.gates.fleetFlight,ease:'power2.out',onComplete:settle}));
}
export function releaseFleet(index:number,gesture:{dx:number;dy:number;elapsed:number}){
  const s=useJourney.getState();if(gateNumber()!==4||s.params.gateActive!==index||s.fleetSent.includes(index))return false;
  if(!fleetIntent(gesture)){mark('dispatch-miss',4,'pointer');cancelGateDrag();return false;}
  acceptFleet(index,'pointer');return true;
}
export function dispatchFleet(index:number){acceptFleet(index,'keyboard');}
export function settleGatesForReducedMotion(){
  const s=useJourney.getState(),gate=gateNumber();if(!gate)return;
  const active=s.params.gateActive;
  stopGateRites();const p=s.params;p.gatePulse=0;
  const home=gate===1?FORGE_HOME[active]??FORGE_HOME[0]:gate===4?{x:.2+Math.max(0,active)*.3,y:.77}:OWN_HOME;
  p.gateDragX=home.x;p.gateDragY=home.y;
  if(gate===1){s.forgeSeated.forEach(i=>p[forgeKey(i)]=1);useJourney.setState({forgeSettled:[...s.forgeSeated]});}
  if(gate===2&&s.trainPhase==='writing'){p.trainReveal=1;p.trainCompile=1;useJourney.setState({trainPhase:'compiled'});}
  if(gate===3){p.ownX=s.ownPhase==='idle'?OWN_HOME.x:OWN_TARGET.x;p.ownY=s.ownPhase==='idle'?OWN_HOME.y:OWN_TARGET.y;if(s.ownPhase==='locking'){p.ownLock=1;useJourney.setState({ownPhase:'locked'});}}
  if(gate===4){s.fleetSent.forEach(i=>p[fleetKey(i)]=1);useJourney.setState({fleetSettled:[...s.fleetSent]});}
  mark('motion-static',gate,'reduced-motion');finishGate(gate,'reduced-motion');
}
