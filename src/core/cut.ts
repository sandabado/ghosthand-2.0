/** Deliberate net travel, not the longest excursion before returning to the start. */
export function strokeComplete(distance:number){return Number.isFinite(distance)&&distance>=40;}
/** Analytic underdamped hinge spring; one shared-heartbeat step, no scene clock. */
export function stepForkSpring(position:number,velocity:number,target:number,dt:number){
  if(![position,velocity,target,dt].every(Number.isFinite))return {position:0,velocity:0};
  const step=Math.max(0,Math.min(.05,dt)),aim=Math.max(-1,Math.min(1,target));
  const omega=14,damping=.72,frequency=omega*Math.sqrt(1-damping*damping);
  const offset=position-aim,a=offset,b=(velocity+damping*omega*offset)/frequency;
  const decay=Math.exp(-damping*omega*step),cos=Math.cos(frequency*step),sin=Math.sin(frequency*step);
  const wave=a*cos+b*sin;
  return {position:aim+decay*wave,velocity:decay*(-damping*omega*wave+frequency*(-a*sin+b*cos))};
}
