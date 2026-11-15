/** Bounded ENTER motion. Scroll travel remains a separate chapter input. */
export interface DojoMotion { x:number;z:number;vx:number;vz:number }
export const DOJO_BOUNDS={x:3,z:1.4,yaw:.36,pitch:.22,speed:2.1,response:10} as const;
export const validDojoBuild=(index:number)=>Number.isInteger(index)&&index>=0&&index<6;
export function clampDojoLook(yaw:number,pitch:number){
  return {yaw:Number.isFinite(yaw)?Math.max(-DOJO_BOUNDS.yaw,Math.min(DOJO_BOUNDS.yaw,yaw)):0,
    pitch:Number.isFinite(pitch)?Math.max(-DOJO_BOUNDS.pitch,Math.min(DOJO_BOUNDS.pitch,pitch)):0};
}
export function stepDojoMotion(state:DojoMotion,move:{x:number;z:number},yaw:number,dt:number):DojoMotion {
  if(![state.x,state.z,state.vx,state.vz,move.x,move.z,yaw,dt].every(Number.isFinite))return {x:0,z:0,vx:0,vz:0};
  const step=Math.max(0,Math.min(.05,dt)),length=Math.max(1,Math.hypot(move.x,move.z));
  const x=move.x/length,z=move.z/length,angle=clampDojoLook(yaw,0).yaw;
  const tx=(x*Math.cos(angle)+z*Math.sin(angle))*DOJO_BOUNDS.speed;
  const tz=(z*Math.cos(angle)-x*Math.sin(angle))*DOJO_BOUNDS.speed;
  const decay=Math.exp(-DOJO_BOUNDS.response*step),integration=(1-decay)/DOJO_BOUNDS.response;
  const rawX=state.x+tx*step+(state.vx-tx)*integration,rawZ=state.z+tz*step+(state.vz-tz)*integration;
  const nextX=Math.max(-DOJO_BOUNDS.x,Math.min(DOJO_BOUNDS.x,rawX));
  const nextZ=Math.max(-DOJO_BOUNDS.z,Math.min(DOJO_BOUNDS.z,rawZ));
  return {x:nextX,z:nextZ,vx:rawX===nextX?tx+(state.vx-tx)*decay:0,vz:rawZ===nextZ?tz+(state.vz-tz)*decay:0};
}
/** Nearest readable stop; invalid or absent measurements keep the prior focus. */
export function nearestDojoStop(stops:{index:number;center:number}[],center:number,fallback=0){
  if(!Number.isFinite(center))return validDojoBuild(fallback)?fallback:0;
  const finite=stops.filter(stop=>validDojoBuild(stop.index)&&Number.isFinite(stop.center));
  return finite.reduce((best,stop)=>Math.abs(stop.center-center)<Math.abs(best.center-center)?stop:best,
    finite[0]??{index:validDojoBuild(fallback)?fallback:0,center}).index;
}
