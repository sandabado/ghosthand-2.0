'use client';
import { create } from 'zustand';
import type { SceneId, SwordMoment } from './config';

export interface WorldParams {
  progress:number; depth:number; fogDensity:number; inkFlow:number; lightIntensity:number;
  chromaOffset:number; cutProgress:number; pursuit:number; time:number; sceneMix:number;
  ceremonyTime:number; hand:number; inkTipDecay:number; sword:number; flash:number; pointerX:number; pointerY:number;
  cameraX:number; cameraZ:number; released:number; cursorX:number; cursorY:number; cursorHover:number; pass:number; fall:number;
  inkBleed:number; inkPressure:number;
}
export const initialParams = ():WorldParams => ({progress:0,depth:0,fogDensity:0.36,inkFlow:0,
  lightIntensity:1,chromaOffset:0.0003,cutProgress:0,pursuit:0,time:0,sceneMix:1,ceremonyTime:0,
  hand:0,inkTipDecay:0,sword:0,flash:0,pointerX:0,pointerY:0,cameraX:0,cameraZ:0,released:0,
  cursorX:-100,cursorY:-100,cursorHover:0,pass:0,fall:0,inkBleed:1,inkPressure:1});
export interface RuntimeReceipt {
  frames:number; heartbeatOwners:number; canvasMounts:number; composerMounts:number;
  uniformUploads:number; fogUniform:number; fps:number; sampleSeconds:number;
  silenceViolations:number; clockPhases:string[]; webgl:boolean; soundEvents:string[];
  ceremonyEvents:{event:string;scheduled:number;observed:number;wallSeconds:number}[];
  ink:{instances:number;ribbonVertices:number;tipParticles:number;bleedUniform:number;pressureUniform:number};
  inkSources:Record<string,{paths:number;revealStart:number;revealEnd:number;bounds:number[];widthRange:number[]}>;
}
export const runtime:RuntimeReceipt = {frames:0,heartbeatOwners:0,canvasMounts:0,composerMounts:0,
  uniformUploads:0,fogUniform:0,fps:0,sampleSeconds:0,silenceViolations:0,clockPhases:[],webgl:false,
  soundEvents:[],ceremonyEvents:[],ink:{instances:0,ribbonVertices:0,tipParticles:0,bleedUniform:1,pressureUniform:1},inkSources:{}};
interface JourneyState {
  scene:SceneId; previousScene:SceneId|null; params:WorldParams; navUnlocked:boolean;
  thresholdReady:boolean; drainReleased:boolean; completedGates:number[]; swordMoments:SwordMoment[];
  pursuitUsed:boolean; shingCount:number; soundEnabled:boolean; reducedMotion:boolean;
  ready:boolean; dojoSeal:boolean; commissionSeal:boolean; selectedMember:number;
  selectedRelic:number; journeyNumber:number; resetVersion:number; visitedScenes:SceneId[];
}
export const useJourney = create<JourneyState>(()=>({scene:'THRESHOLD',previousScene:null,
  params:initialParams(),navUnlocked:false,thresholdReady:false,drainReleased:false,completedGates:[],
  swordMoments:[],pursuitUsed:false,shingCount:0,soundEnabled:false,reducedMotion:false,ready:false,
  dojoSeal:false,commissionSeal:false,selectedMember:0,selectedRelic:0,journeyNumber:1,resetVersion:0,
  visitedScenes:['THRESHOLD']}));
export const useWorld = useJourney;

// Continuous params stay stable by identity. React consumers subscribe to explicit frame snapshots.
const paramListeners=new Set<()=>void>();
export function notifyParams(){paramListeners.forEach(fn=>fn());}
export function subscribeParams(fn:()=>void){paramListeners.add(fn);return()=>{paramListeners.delete(fn);};}
