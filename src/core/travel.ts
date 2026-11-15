import type { SceneId } from './config';
export interface TravelState { scene:SceneId;thresholdReady:boolean;drainSettled:boolean;completedGates:number[];pursuitUsed?:boolean;forkChoice?:'DOJO'|'CHAINS_HOLD'|null }
const readableScenes=new Set<SceneId>(['LEGEND','DOJO','DRAIN','COMMISSION','CHAINS_HOLD']);
const previous:Partial<Record<SceneId,SceneId>>={
  OATH:'COMMISSION',COMMISSION:'CRAFT_F4',CRAFT_F4:'CRAFT_F3',CRAFT_F3:'CRAFT_F2',
  CRAFT_F2:'CRAFT_F1',CRAFT_F1:'DRAIN',DRAIN:'DOJO',DOJO:'LEGEND',FORK:'CRAFT_F4',CHAINS_HOLD:'FORK',
};
/** The opening is deliberate. Every subsequent main-story chapter is readable by scrolling. */
export function travelReady(state:TravelState){
  if(state.scene==='THRESHOLD')return state.thresholdReady;
  if(state.scene==='FORK')return state.forkChoice===null;
  if(readableScenes.has(state.scene))return true;
  if(state.scene.startsWith('CRAFT_F'))return true;
  return false;
}
export function travelDestination(state:TravelState):SceneId|null {
  if(!travelReady(state))return null;
  if(state.scene==='THRESHOLD')return 'LEGEND';
  if(state.scene==='LEGEND')return 'DOJO';
  if(state.scene==='DOJO')return 'DRAIN';
  if(state.scene==='DRAIN')return 'CRAFT_F1';
  if(state.scene==='FORK')return 'COMMISSION';
  if(state.scene==='COMMISSION')return 'OATH';
  if(state.scene==='CHAINS_HOLD')return 'FORK';
  if(state.scene.startsWith('CRAFT_F')){
    const gate=Number(state.scene.at(-1));
    // Revisiting work never leaves the visitor at a spent, single-use pursuit.
    return gate===4?state.pursuitUsed?'COMMISSION':'PURSUIT':`CRAFT_F${gate+1}` as SceneId;
  }
  return null;
}
/** Reverse reading skips the single-use cinematic passage and never reopens Summon. */
export function backwardDestination(state:TravelState):SceneId|null {
  if(state.scene==='FORK'&&state.forkChoice!==null)return null;
  return previous[state.scene]??null;
}
export interface TravelIntent { ready:boolean;progress:number;atContentEnd:boolean;burst:number;readyBurst:number;serial:number;consumedSerial:number;direction:number;elapsedSinceEntry:number;elapsedSinceInput?:number }
export function freshTravel(intent:TravelIntent,policy:{settle:number;intentLife:number}={settle:.6,intentLife:.85}){
  const {ready,progress,atContentEnd,burst,readyBurst,serial,consumedSerial,direction,elapsedSinceEntry,elapsedSinceInput=0}=intent;
  return [progress,burst,readyBurst,serial,consumedSerial,direction,elapsedSinceEntry,elapsedSinceInput].every(Number.isFinite)&&
    ready&&atContentEnd&&progress>=.995&&burst>readyBurst&&serial>consumedSerial&&direction>0&&elapsedSinceEntry>=policy.settle&&elapsedSinceInput>=0&&elapsedSinceInput<=policy.intentLife;
}
export type ReverseTravelIntent=Omit<TravelIntent,'atContentEnd'>&{atContentStart:boolean};
export function freshReverseTravel(intent:ReverseTravelIntent,policy:{settle:number;intentLife:number}={settle:.6,intentLife:.85}){
  return freshTravel({...intent,progress:1-intent.progress,atContentEnd:intent.atContentStart,direction:-intent.direction},policy);
}
