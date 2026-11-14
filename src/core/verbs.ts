import gsap from 'gsap';
import { TIMING, type MotionVerb } from './config';
import type { WorldParams } from './world';
export type { MotionVerb } from './config';
export const easing={draw:'power3.out',stroke:'expo.out',breath:'sine.inOut'} as const;
export function tlFall(params:WorldParams,depth:number) {
  return gsap.timeline().fromTo(params,{fall:0},{fall:depth,duration:TIMING.pass,ease:easing.breath});
}
export function tlPass(params:WorldParams) {
  return gsap.timeline().fromTo(params,{pass:0},{pass:1,duration:TIMING.pass,ease:easing.stroke});
}
export function tlPursue(params:WorldParams,onComplete:()=>void) {
  return gsap.timeline({onComplete}).fromTo(params,{pursuit:0},{pursuit:1,duration:TIMING.pursuit,ease:'power2.inOut'});
}
export function assertVerb(verb:MotionVerb){return verb;}
