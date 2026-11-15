/** Normalized image pivots: x from left, y from bottom. All images contain anatomy only. */
export const SUMMON_HAND_ASSETS={
  pointing:{src:'/summon-entry/pointing-hand.webp',pivot:[.19,.86] as const,axis:2.15},
  receiving:{src:'/summon-entry/receiving-hand.webp',pivot:[.29,.58] as const,axis:1.72},
  gripping:{src:'/summon-entry/gripping-hand.webp',pivot:[.31,.62] as const,axis:1.72},
} as const;

/** The closed fist occupies roughly half the two-hand grip, leaving the blade dominant. */
export const SUMMON_HAND_SCALE={pointing:4,receiving:3,gripping:3} as const;

/** Counter perspective at the hand's tiny foreground offset so the palm never slips off the hilt. */
export function handPlaneTransform(anchorX:number,anchorY:number,width:number,aspect:number,angle:number,pivot:readonly [number,number],cameraZ:number,rigZ=0,foregroundOffset=.01){
  const z=rigZ+foregroundOffset,ratio=(cameraZ-z)/Math.max(.01,cameraZ-rigZ),w=width*ratio,h=w/Math.max(.01,aspect);
  const ox=(.5-pivot[0])*w,oy=(.5-pivot[1])*h;
  return {position:[anchorX*ratio+ox*Math.cos(angle)-oy*Math.sin(angle),anchorY*ratio+ox*Math.sin(angle)+oy*Math.cos(angle),z] as [number,number,number],scale:[w,h,1] as [number,number,number],rotation:angle};
}
