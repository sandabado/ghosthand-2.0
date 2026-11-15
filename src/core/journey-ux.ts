import type { SceneId } from './config';

/** Consume reading distance before the scene spine, in either direction. */
export function splitScrollDelta(delta:number,position:number,max:number){
  const distance=Number.isFinite(delta)?delta:0;
  const limit=Number.isFinite(max)?Math.max(0,max):0;
  const start=Number.isFinite(position)?Math.max(0,Math.min(limit,position)):0;
  const next=Math.max(0,Math.min(limit,start+distance));
  return {position:next,consumed:next-start,remainder:distance-(next-start)};
}

/** Native still-path reading is bounded by visible content, never a hidden pixel quota. */
export function nativeReadingProgress(top:number,height:number,viewport:number){
  if(![top,height,viewport].every(Number.isFinite)||height<0||viewport<=0)return 0;
  const span=Math.max(0,height-viewport);
  return span<=4?1:Math.max(0,Math.min(1,-top/span));
}

export interface GuidanceState {
  scene:SceneId; thresholdReady:boolean;thresholdPhase?:'pointing'|'receiving'|'departing';drainReleased:boolean;drainSettled:boolean;completedGates:number[];
  forgeSeated:number[];forgeSettled:number[];trainPhase:string;ownPhase:string;fleetSent:number[];fleetSettled:number[];
  forkChoice?:string|null;
}
export type Guidance={mode:'scroll'|'required'|'settling'|'ceremony'|'end';label:string;selector?:string};
export function journeyGuidance(s:GuidanceState):Guidance {
  if(s.scene==='THRESHOLD'){
    if(s.thresholdPhase==='pointing')return {mode:'required',label:'Move the hand. Click to summon.',selector:'.summon-trigger'};
    if(s.thresholdPhase==='receiving')return {mode:'ceremony',label:'Receive the blade'};
    if(s.thresholdPhase==='departing')return {mode:'ceremony',label:'Enter the gates'};
    return s.thresholdReady?{mode:'scroll',label:'Scroll to begin'}:{mode:'ceremony',label:'The hand is arriving'};
  }
  if(s.scene==='PURSUIT')return {mode:'ceremony',label:'Follow the blade'};
  if(s.scene==='MERGE')return {mode:'ceremony',label:'Let the moment unfold'};
  if(s.scene==='OATH')return {mode:'end',label:'Stay a while. Explore or begin again.'};
  if(s.scene==='FORK')return s.forkChoice?{mode:'ceremony',label:'The choice unfolds'}:{mode:'scroll',label:'Scroll on, or explore a choice'};
  if(s.scene==='DRAIN'||s.scene.startsWith('CRAFT_F'))return {mode:'scroll',label:'Keep scrolling. The studies are optional.'};
  if(s.scene==='DOJO')return {mode:'scroll',label:'Scroll through the work'};
  if(s.scene==='COMMISSION')return {mode:'scroll',label:'Scroll to start a conversation'};
  if(s.scene==='CHAINS_HOLD')return {mode:'scroll',label:'Scroll back into the light'};
  return {mode:'scroll',label:'Keep scrolling'};
}
