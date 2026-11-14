/** Board-space contracts shared by pointer input, static companions, and World art. */
export interface Point { x:number; y:number }
export interface Size { width:number; height:number }
export const FORGE_HOME:readonly Point[]=[{x:.12,y:.24},{x:.12,y:.5},{x:.12,y:.76}];
export const FORGE_TARGETS:readonly Point[]=[{x:.66,y:.24},{x:.82,y:.5},{x:.66,y:.76}];
export const OWN_HOME:Point={x:.18,y:.74};
export const OWN_TARGET:Point={x:.66,y:.42};
export const OWN_RADIUS=.22;
const validPoint=(p:Point)=>Number.isFinite(p.x)&&Number.isFinite(p.y);
const validSize=(s:Size)=>Number.isFinite(s.width)&&Number.isFinite(s.height)&&s.width>0&&s.height>0;
export function pointFromClient(point:Point,rect:Size&{left:number;top:number}):Point {
  if(!validPoint(point)||!validSize(rect)||!Number.isFinite(rect.left)||!Number.isFinite(rect.top))return {x:NaN,y:NaN};
  return {x:(point.x-rect.left)/rect.width,y:(point.y-rect.top)/rect.height};
}
export function forgeHit(index:number,point:Point,size:Size){
  if(!Number.isInteger(index)||!FORGE_TARGETS[index]||!validPoint(point)||!validSize(size))return false;
  const target=FORGE_TARGETS[index],radius=Math.max(20,Math.min(size.width,size.height)*.095);
  return Math.hypot((point.x-target.x)*size.width,(point.y-target.y)*size.height)<=radius;
}
export function ownHit(point:Point,size:Size){
  if(!validPoint(point)||!validSize(size))return false;
  return Math.hypot((point.x-OWN_TARGET.x)*size.width,(point.y-OWN_TARGET.y)*size.height)<=OWN_RADIUS*Math.min(size.width,size.height);
}
export function fleetIntent({dx,dy,elapsed}:{dx:number;dy:number;elapsed:number}){
  if(![dx,dy,elapsed].every(Number.isFinite)||elapsed<=0)return false;
  const up=-dy;
  return up>=48&&up>Math.abs(dx)*1.15&&(elapsed<=750||up>=96);
}
export function normalizeTrainingSeed(value:string):string|null {
  const chars=Array.from(value.replace(/[\u0000-\u001f\u007f]/g,'').trim());
  return chars.length>=3?chars.slice(0,3).join(''):null;
}
