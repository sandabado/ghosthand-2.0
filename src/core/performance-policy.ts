export type PerformanceTier='cinematic'|'balanced'|'lean';
export interface GovernorState {tier:PerformanceTier;badWindows:number;goodWindows:number;lastChangeAt:number;warmUntil:number}
export interface GovernorSample {now:number;windowMs:number;fps:number|null;p95Ms:number|null;samples:number;critical:boolean;active:boolean;reduced:boolean}
export const PERFORMANCE_POLICY={warmupMs:2500,cooldownMs:3000,badWindows:2,goodWindows:8,dropFps:52,dropP95Ms:26,raiseFps:58,raiseP95Ms:24} as const;
export function createGovernor(tier:PerformanceTier='cinematic',now=0):GovernorState{
  const time=Number.isFinite(now)?now:0;
  return {tier,badWindows:0,goodWindows:0,lastChangeAt:time,warmUntil:time+PERFORMANCE_POLICY.warmupMs};
}
export function observeGovernor(state:GovernorState,sample:GovernorSample){
  const p=PERFORMANCE_POLICY,valid=Number.isFinite(sample.now)&&Number.isFinite(sample.windowMs)&&sample.windowMs>=750&&Number.isFinite(sample.fps)&&Number.isFinite(sample.p95Ms)&&sample.fps! > 0&&sample.p95Ms! > 0&&Number.isInteger(sample.samples)&&sample.samples>=1;
  if(!sample.active||sample.reduced||sample.critical||!valid||sample.now<state.warmUntil)return {state:{...state,badWindows:0,goodWindows:0},changed:false,reason:sample.critical?'Ceremony protected':!sample.active?'Paused while hidden':sample.reduced?'Still path':'Warming up'};
  const bad=sample.fps!<p.dropFps||sample.p95Ms!>p.dropP95Ms,good=sample.fps!>=p.raiseFps&&sample.p95Ms!<=p.raiseP95Ms;
  const next={...state,badWindows:bad?state.badWindows+1:0,goodWindows:good?state.goodWindows+1:0};
  const tiers:PerformanceTier[]=['cinematic','balanced','lean'],index=tiers.indexOf(state.tier),cooled=sample.now-state.lastChangeAt>=p.cooldownMs;
  if(cooled&&next.badWindows>=p.badWindows&&index<2){next.tier=tiers[index+1];next.lastChangeAt=sample.now;next.badWindows=0;next.goodWindows=0;return {state:next,changed:true,reason:'Reduced background load after sustained slow frames'};}
  if(cooled&&next.goodWindows>=p.goodWindows&&index>0){next.tier=tiers[index-1];next.lastChangeAt=sample.now;next.badWindows=0;next.goodWindows=0;return {state:next,changed:true,reason:'Restored detail after sustained headroom'};}
  return {state:next,changed:false,reason:bad?'Watching frame pressure':good?'Stable rendering':'Holding quality'};
}
export function percentile(values:readonly number[],fraction:number){
  const sorted=values.filter(v=>Number.isFinite(v)&&v>=0).sort((a,b)=>a-b);
  if(!sorted.length)return null;
  const q=Number.isFinite(fraction)?Math.max(0,Math.min(1,fraction)):.5;
  return sorted[Math.min(sorted.length-1,Math.ceil(q*sorted.length)-1<0?0:Math.ceil(q*sorted.length)-1)];
}
export function shouldRenderFrame(now:number,last:number,reduced=false){
  return Number.isFinite(now)&&(!Number.isFinite(last)||now<last||now-last>=(reduced?.1:1/60)-.0005);
}
/** Keep the scheduled phase at non-divisible display rates; never catch up in a burst. */
export function nextRenderDeadline(now:number,deadline:number,reduced=false){
  if(!Number.isFinite(now))return {render:false,nextDeadline:deadline};
  const period=reduced?.1:1/60;
  if(!Number.isFinite(deadline)||now<deadline-period*2||now-deadline>period*4)return {render:true,nextDeadline:now+period};
  if(now+.0005<deadline)return {render:false,nextDeadline:deadline};
  const steps=Math.max(1,Math.floor((now+.0005-deadline)/period)+1);
  return {render:true,nextDeadline:deadline+steps*period};
}
