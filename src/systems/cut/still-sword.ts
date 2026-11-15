import { TIMING } from '../../core/config';
import { SUMMON_HAND_ASSETS,SUMMON_HAND_SCALE } from '../ink/hand-assets';
import { mergeCeremonyPose,openingCeremonyPose } from './merge-pose';
import { CEREMONY_SWORD,buildCeremonySwordProfile } from './sword-geometry';
import { buildSwordProfile } from '../smithy/geometry';

const degrees=(radians:number)=>radians*180/Math.PI;
export type StillSwordMode='merge'|'opening';

/** A side silhouette sampled from the same closed blade mesh as the live ceremony. */
export function stillSwordBladePath(sheathed=false){
  const profile=buildCeremonySwordProfile(buildSwordProfile(sheathed)),points:[number,number][]=[];
  for(let ring=0;ring<profile.rings;ring++){
    const offset=(ring*profile.sectionSize+2)*3;
    points.push([profile.positions[offset],profile.positions[offset+1]]);
  }
  for(let ring=profile.rings-1;ring>=0;ring--){
    const offset=(ring*profile.sectionSize+6)*3;
    points.push([profile.positions[offset],profile.positions[offset+1]]);
  }
  return points.map(([x,y],index)=>`${index?'L':'M'}${x.toFixed(6)} ${y.toFixed(6)}`).join('')+'Z';
}

/** A whole-weapon side view for inline Commission and Oath alternatives. */
export function stillWeaponLayout(sheathed=false){
  const profile=buildCeremonySwordProfile(buildSwordProfile(sheathed));
  let maxX=-Infinity,maxY:number=CEREMONY_SWORD.guard.halfWidth;
  for(let vertex=0;vertex<profile.positions.length/3;vertex++){
    maxX=Math.max(maxX,profile.positions[vertex*3]);maxY=Math.max(maxY,profile.positions[vertex*3+1]);
  }
  const minX=CEREMONY_SWORD.pommel.center-CEREMONY_SWORD.pommel.thickness/2-.12;
  const top=-maxY-.12,bottom=sheathed?.78:.44,width=maxX+.12-minX,height=bottom-top;
  const supports=sheathed?[1.65,3.75].map(x=>{
    let ring=0;
    while(ring<profile.rings-2&&profile.positions[((ring+1)*profile.sectionSize+6)*3]<x)ring++;
    const a=(ring*profile.sectionSize+6)*3,b=((ring+1)*profile.sectionSize+6)*3;
    const t=Math.max(0,Math.min(1,(x-profile.positions[a])/(profile.positions[b]-profile.positions[a])));
    return {x,y:profile.positions[a+1]+(profile.positions[b+1]-profile.positions[a+1])*t};
  }):[];
  return {viewBox:`${minX} ${top} ${width} ${height}`,minX,maxX:maxX+.12,top,bottom,width,height,supports};
}

/** Pixel projection of the canonical received pose, without a second renderer. */
export function stillSwordProjection(viewWidth:number,viewHeight:number,mode:StillSwordMode='merge',targetX=.30,targetY=-.12){
  const width=Number.isFinite(viewWidth)&&viewWidth>0?viewWidth:1280;
  const height=Number.isFinite(viewHeight)&&viewHeight>0?viewHeight:900;
  const pose=mode==='opening'
    ?openingCeremonyPose(TIMING.threshold.swordStart+TIMING.threshold.swordDuration,width/height,TIMING.threshold,targetX,targetY)
    :mergeCeremonyPose(TIMING.merge.swordStart+TIMING.merge.swordDuration,width/height,TIMING.merge);
  const hilt:[number,number]=[(pose.hilt[0]+1)*width/2,(1-pose.hilt[1])*height/2];
  const tip:[number,number]=[(pose.tip[0]+1)*width/2,(1-pose.tip[1])*height/2];
  const scale=Math.hypot(tip[0]-hilt[0],tip[1]-hilt[1])/Math.hypot(...CEREMONY_SWORD.blade.tip);
  const modelTipAngle=Math.atan2(CEREMONY_SWORD.blade.tip[1],CEREMONY_SWORD.blade.tip[0]);
  const rotation=-pose.angle+modelTipAngle;
  const asset=SUMMON_HAND_ASSETS.gripping,handWidth=SUMMON_HAND_SCALE.gripping*scale;
  return {width,height,hilt,tip,scale,rotation,
    swordTransform:`translate(${hilt[0]} ${hilt[1]}) rotate(${degrees(rotation)}) scale(${scale} ${-scale})`,
    hand:{width:handWidth,height:handWidth/1.5,rotation:rotation+asset.axis,
      transform:`rotate(${rotation+asset.axis}rad) translate(${-asset.pivot[0]*100}%,${-(1-asset.pivot[1])*100}%)`},
  };
}
