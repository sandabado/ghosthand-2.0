'use client';
import { create } from 'zustand';
import type { SceneId, SwordMoment } from './config';
import { SUMMON_HOME,type ThresholdPhase } from './summon';
import type {ReaderSnapshot} from './navigation';

export interface WorldParams {
  progress:number; depth:number; fogDensity:number; inkFlow:number; lightIntensity:number;
  chromaOffset:number; cutProgress:number; pursuit:number; time:number; sceneMix:number;
  ceremonyTime:number; hand:number; inkTipDecay:number; sword:number; flash:number; pointerX:number; pointerY:number;
  summonX:number;summonY:number;summonTargetX:number;summonTargetY:number;summonLeave:number;
  cameraX:number; cameraZ:number; released:number; cursorX:number; cursorY:number; cursorHover:number; pass:number; fall:number;
  inkBleed:number; inkPressure:number;
  drainTension:number;drainSnap:number;drainDawn:number;drainFocus:number;drainGesture:number;drainClock:number;
  pointerPixelX:number;pointerPixelY:number;pointerSerial:number;
  forge0:number;forge1:number;forge2:number;gateActive:number;gateDragX:number;gateDragY:number;
  trainReveal:number;trainCompile:number;ownX:number;ownY:number;ownLock:number;
  fleet0:number;fleet1:number;fleet2:number;gatePulse:number;
  forkLean:number;forkVelocity:number;forkChoice:number;forkCollapse:number;forkStroke:number;forkReveal:number;
  holdDoorX:number;holdDoorY:number;holdDoorWidth:number;holdDoorHeight:number;
  dojoYaw:number;dojoPitch:number;dojoWalk:number;dojoScroll:number;dojoFocus:number;dojoGuide:number;
  hankoPress:number;hankoImpact:number;hankoBloom:number;hankoStroke:number;
  smithyScroll:number;smithyUnroll:number;smithyOffer:number;smithyFocus:number;
  commissionStroke:number;commissionPress:number;commissionImpact:number;commissionBloom:number;
  oathTime:number;oathRest:number;oathGather:number;oathScroll:number;
}
export const initialParams = ():WorldParams => ({progress:0,depth:0,fogDensity:0.36,inkFlow:0,
  lightIntensity:1,chromaOffset:0.0003,cutProgress:0,pursuit:0,time:0,sceneMix:1,ceremonyTime:0,
  hand:0,inkTipDecay:0,sword:0,flash:0,pointerX:0,pointerY:0,cameraX:0,cameraZ:0,released:0,
  summonX:SUMMON_HOME[0],summonY:SUMMON_HOME[1],summonTargetX:SUMMON_HOME[0],summonTargetY:SUMMON_HOME[1],summonLeave:0,
  cursorX:-100,cursorY:-100,cursorHover:0,pass:0,fall:0,inkBleed:1,inkPressure:1,
  drainTension:0,drainSnap:0,drainDawn:0,drainFocus:0,drainGesture:0,drainClock:0,
  pointerPixelX:-100,pointerPixelY:-100,pointerSerial:0,
  forge0:0,forge1:0,forge2:0,gateActive:-1,gateDragX:0,gateDragY:0,
  trainReveal:0,trainCompile:0,ownX:.18,ownY:.74,ownLock:0,fleet0:0,fleet1:0,fleet2:0,gatePulse:0,
  forkLean:0,forkVelocity:0,forkChoice:0,forkCollapse:0,forkStroke:0,forkReveal:1,
  holdDoorX:.45,holdDoorY:0,holdDoorWidth:.25,holdDoorHeight:.6,
  dojoYaw:0,dojoPitch:0,dojoWalk:0,dojoScroll:0,dojoFocus:0,dojoGuide:0,hankoPress:0,hankoImpact:0,hankoBloom:0,hankoStroke:0,
  smithyScroll:0,smithyUnroll:0,smithyOffer:0,smithyFocus:0,commissionStroke:0,commissionPress:0,commissionImpact:0,commissionBloom:0,
  oathTime:0,oathRest:0,oathGather:1,oathScroll:0});
export interface RuntimeReceipt {
  frames:number; heartbeatOwners:number; canvasMounts:number; composerMounts:number;
  uniformUploads:number; fogUniform:number; fps:number; sampleSeconds:number;
  silenceViolations:number; clockPhases:string[]; webgl:boolean; soundEvents:string[];
  ceremonyEvents:{event:string;scheduled:number;observed:number;wallSeconds:number}[];
  summonEvents:{event:string;input:string;at:number}[];
  ink:{instances:number;ribbonVertices:number;tipParticles:number;bleedUniform:number;pressureUniform:number};
  inkSources:Record<string,{paths:number;revealStart:number;revealEnd:number;bounds:number[];widthRange:number[]}>;
  drain:{instances:number;filaments:number;segments:number;particles:number;pickHits:number;lastPicked:number;
    releaseSamples:number;attached:number;dissolved:number;projectedTargets:{strand:number;audit:number;x:number;y:number}[]};
  drainEvents:{event:string;at:number;input:string}[];
  cameraRotation:number[];
  gates:{meshes:number;particles:number;activeGate:number;uniformUploads:number};
  gateEvents:{event:string;gate:number;at:number;input:string}[];
  cut:{meshes:number;particles:number;uniformUploads:number;scene:string;spill:number};
  forkEvents:{event:string;branch:string;at:number;input:string}[];
  travelEvents:{from:string;to:string;input:string;at:number;burst:number}[];
  grade:{bloom:number;chroma:number};
  dojo:{meshes:number;scrolls:number;particles:number;uniformUploads:number;selected:number;guide:number};
  dojoEvents:{event:string;input:string;at:number;selected:number}[];
  smithy:{meshes:number;paperSheets:number;particles:number;uniformUploads:number;scene:string;selected:number;plateLoaded:boolean;floatingObjects:number};
  smithyEvents:{event:string;input:string;at:number;selected:number}[];
  referenceHand:{loaded:boolean;meshes:number;uniformUploads:number};
  smoke:{wisps:number;uniformUploads:number};
}
export const runtime:RuntimeReceipt = {frames:0,heartbeatOwners:0,canvasMounts:0,composerMounts:0,
  uniformUploads:0,fogUniform:0,fps:0,sampleSeconds:0,silenceViolations:0,clockPhases:[],webgl:false,
  soundEvents:[],ceremonyEvents:[],summonEvents:[],ink:{instances:0,ribbonVertices:0,tipParticles:0,bleedUniform:1,pressureUniform:1},inkSources:{},
  drain:{instances:0,filaments:0,segments:0,particles:0,pickHits:0,lastPicked:-1,releaseSamples:0,attached:0,dissolved:0,projectedTargets:[]},
  drainEvents:[],cameraRotation:[0,0,0],gates:{meshes:0,particles:0,activeGate:0,uniformUploads:0},gateEvents:[],
  cut:{meshes:0,particles:0,uniformUploads:0,scene:'',spill:0},forkEvents:[],travelEvents:[],grade:{bloom:.75,chroma:.0003},
  dojo:{meshes:0,scrolls:0,particles:0,uniformUploads:0,selected:0,guide:0},dojoEvents:[],
  smithy:{meshes:0,paperSheets:0,particles:0,uniformUploads:0,scene:'',selected:0,plateLoaded:false,floatingObjects:0},smithyEvents:[],
  referenceHand:{loaded:false,meshes:0,uniformUploads:0},smoke:{wisps:0,uniformUploads:0}};
interface JourneyState {
  scene:SceneId; previousScene:SceneId|null; params:WorldParams; navUnlocked:boolean;readerEntry:'start'|'end'|null;navigationStack:ReaderSnapshot[];
  thresholdReady:boolean;thresholdPhase:ThresholdPhase; drainReleased:boolean; completedGates:number[]; swordMoments:SwordMoment[];
  pursuitUsed:boolean; shingCount:number; soundEnabled:boolean; reducedMotion:boolean;
  ready:boolean; dojoSeal:boolean; dojoExploring:boolean; commissionExploring:boolean;practiceExploring:boolean; commissionSeal:boolean; selectedMember:number;
  drainSettled:boolean;drainAuditIndex:number;drainAuditSource:'keyboard'|'pointer'|'filament';
  selectedRelic:number; journeyNumber:number; resetVersion:number; visitedScenes:SceneId[];
  forgeSeated:number[];forgeSettled:number[];trainSeed:string;trainPhase:'idle'|'writing'|'compiled';
  ownPhase:'idle'|'locking'|'locked';fleetSent:number[];fleetSettled:number[];
  forkChoice:'DOJO'|'CHAINS_HOLD'|null;
  dojoPhase:'idle'|'pressing'|'sealed';
  commissionPhase:'idle'|'pressing'|'sealed';commissionSealedRelic:number|null;
}
export const useJourney = create<JourneyState>(()=>({scene:'THRESHOLD',previousScene:null,readerEntry:null,navigationStack:[],
  params:initialParams(),navUnlocked:false,thresholdReady:false,thresholdPhase:'pointing',drainReleased:false,completedGates:[],
  swordMoments:[],pursuitUsed:false,shingCount:0,soundEnabled:false,reducedMotion:false,ready:false,
  dojoSeal:false,dojoExploring:false,commissionExploring:false,practiceExploring:false,commissionSeal:false,selectedMember:0,selectedRelic:0,journeyNumber:1,resetVersion:0,
  drainSettled:false,drainAuditIndex:0,drainAuditSource:'keyboard',
  visitedScenes:['THRESHOLD'],forgeSeated:[],forgeSettled:[],trainSeed:'',trainPhase:'idle',ownPhase:'idle',fleetSent:[],fleetSettled:[],forkChoice:null,dojoPhase:'idle',commissionPhase:'idle',commissionSealedRelic:null}));
export const useWorld = useJourney;

// Continuous params stay stable by identity. React consumers subscribe to explicit frame snapshots.
const paramListeners=new Set<()=>void>();
export function notifyParams(){paramListeners.forEach(fn=>fn());}
export function subscribeParams(fn:()=>void){paramListeners.add(fn);return()=>{paramListeners.delete(fn);};}
