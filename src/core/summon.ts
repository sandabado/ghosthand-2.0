export type ThresholdPhase='pointing'|'receiving'|'departing';
export type SummonPoint=readonly [number,number];
export const SUMMON_HOME:SummonPoint=[.30,-.12];

/** Keep the fingertip and its receiving blade inside the composition. NDC, Y up. */
export function summonPointer(x:number,y:number):[number,number]{
  return [Number.isFinite(x)?Math.max(-.55,Math.min(.55,x)):SUMMON_HOME[0],
    Number.isFinite(y)?Math.max(-.48,Math.min(.08,y)):SUMMON_HOME[1]];
}

/** The engine's existing heartbeat owns pointer easing, independent of refresh rate. */
export function advanceSummonPointer(current:SummonPoint,target:SummonPoint,dt:number):[number,number]{
  const from=summonPointer(current[0],current[1]),to=summonPointer(target[0],target[1]);
  const elapsed=Number.isFinite(dt)?Math.max(0,Math.min(.05,dt)):0,blend=1-Math.exp(-elapsed/0.11);
  return [from[0]+(to[0]-from[0])*blend,from[1]+(to[1]-from[1])*blend];
}

export function canCommitSummon(scene:string,phase:string){return scene==='THRESHOLD'&&phase==='pointing';}
