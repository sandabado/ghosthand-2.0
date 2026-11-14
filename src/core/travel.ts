import type { SceneId } from './config';
export interface TravelState { scene:SceneId;thresholdReady:boolean;drainSettled:boolean;completedGates:number[] }
export function travelReady(state:TravelState){
  if(state.scene==='THRESHOLD')return state.thresholdReady;
  if(state.scene==='LEGEND'||state.scene==='DOJO'||state.scene==='COMMISSION'||state.scene==='CHAINS_HOLD')return true;
  if(state.scene==='DRAIN')return state.drainSettled;
  if(state.scene.startsWith('CRAFT_F'))return state.completedGates.includes(Number(state.scene.at(-1)));
  return false;
}
export function travelDestination(state:TravelState):SceneId|null {
  if(!travelReady(state))return null;
  if(state.scene==='THRESHOLD')return 'LEGEND';
  if(state.scene==='LEGEND')return 'DRAIN';
  if(state.scene==='DRAIN')return 'CRAFT_F1';
  if(state.scene==='DOJO'||state.scene==='COMMISSION')return 'OATH';
  if(state.scene==='CHAINS_HOLD')return 'FORK';
  if(state.scene.startsWith('CRAFT_F')){const gate=Number(state.scene.at(-1));return gate===4?'PURSUIT':`CRAFT_F${gate+1}` as SceneId;}
  return null;
}
export interface TravelIntent { ready:boolean;progress:number;atContentEnd:boolean;burst:number;readyBurst:number;serial:number;consumedSerial:number;direction:number;elapsedSinceEntry:number }
export function freshTravel(intent:TravelIntent){
  const {ready,progress,atContentEnd,burst,readyBurst,serial,consumedSerial,direction,elapsedSinceEntry}=intent;
  return [progress,burst,readyBurst,serial,consumedSerial,direction,elapsedSinceEntry].every(Number.isFinite)&&
    ready&&atContentEnd&&progress>=.995&&burst>readyBurst&&serial>consumedSerial&&direction>0&&elapsedSinceEntry>=.6;
}
