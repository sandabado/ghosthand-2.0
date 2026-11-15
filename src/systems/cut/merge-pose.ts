export interface MergeCeremonyClock {swordStart:number;swordDuration:number;cutStart:number;cutDuration:number;fork:number}
export type MergeCeremonyPhase='waiting'|'offering'|'accepting'|'held'|'white'|'cut'|'gone';
export interface MergeCeremonyPose {offer:number;grip:number;white:number;sweep:number;opacity:number;angle:number;hilt:[number,number];tip:[number,number];viewportFraction:number;phase:MergeCeremonyPhase}
/** The hand waits for its weapon. Only the later cut carries the grasp through the world. */
export function graspAnchorPose(incoming:MergeCeremonyPose,accepted:MergeCeremonyPose){return incoming.sweep>0?incoming:accepted;}
const defaultClock:MergeCeremonyClock={swordStart:3.8,swordDuration:3,cutStart:7,cutDuration:.35,fork:8};
const clamp=(value:number)=>Math.max(0,Math.min(1,value));
const smooth=(value:number)=>{const t=clamp(value);return t*t*(3-2*t);};
const validClock=(clock:MergeCeremonyClock)=>Boolean(clock&&[clock.swordStart,clock.swordDuration,clock.cutStart,clock.cutDuration,clock.fork].every(Number.isFinite)&&clock.swordStart>=0&&clock.swordDuration>0&&clock.cutDuration>0&&clock.cutStart>=clock.swordStart+clock.swordDuration&&clock.fork>=clock.cutStart+clock.cutDuration);

/** The seam is the accepted blade's axis, expressed in top-left-origin viewport UVs. */
export interface MergeSliceGeometry {slope:number;intercept:number;leftY:number;rightY:number;normal:[number,number]}
export function mergeSliceGeometry(aspect=1.44,clock:MergeCeremonyClock=defaultClock):MergeSliceGeometry {
  const a=Number.isFinite(aspect)&&aspect>0?aspect:1.44,c=validClock(clock)?clock:defaultClock;
  const held=mergeCeremonyPose(c.cutStart,a,c);
  const hilt:[number,number]=[(held.hilt[0]+1)/2,(1-held.hilt[1])/2],tip:[number,number]=[(held.tip[0]+1)/2,(1-held.tip[1])/2];
  const slope=(tip[1]-hilt[1])/(tip[0]-hilt[0]),intercept=hilt[1]-slope*hilt[0],length=Math.hypot(slope,a);
  return {slope,intercept,leftY:intercept,rightY:slope+intercept,normal:[slope/length,-a/length]};
}

export interface MergeSlicePose extends MergeSliceGeometry {strike:number;opening:number;upper:[number,number];lower:[number,number]}
/**
 * Shared by DOM and compositor. upper/lower are viewport-fraction translations
 * (multiply x by 100vw and y by 100vh); normal is a unit vector in height-scaled
 * screen space. The blade finishes its draw before either page half separates.
 */
export function mergeSlicePose(elapsed:number,aspect=1.44,clock:MergeCeremonyClock=defaultClock):MergeSlicePose {
  const t=Number.isFinite(elapsed)?Math.max(0,elapsed):0,a=Number.isFinite(aspect)&&aspect>0?aspect:1.44,c=validClock(clock)?clock:defaultClock;
  const geometry=mergeSliceGeometry(a,c),raw=clamp((t-c.cutStart)/c.cutDuration),strike=raw<.5?16*raw**5:1-(-2*raw+2)**5/2;
  const cutEnd=c.cutStart+c.cutDuration,opening=smooth((t-cutEnd)/Math.max(.01,c.fork-cutEnd-.06));
  const distance=(a*Math.abs(geometry.normal[0])+Math.abs(geometry.normal[1]))*.72*opening;
  const upper:[number,number]=[geometry.normal[0]*distance/a,geometry.normal[1]*distance];
  return {...geometry,strike,opening,upper,lower:[-upper[0],-upper[1]]};
}

/** Normalized screen-space pose. All motion is a pure function of the approved Merge clock. */
export function mergeCeremonyPose(elapsed:number,aspect=1.44,clock:MergeCeremonyClock=defaultClock):MergeCeremonyPose {
  const t=Number.isFinite(elapsed)?Math.max(0,elapsed):0,a=Number.isFinite(aspect)&&aspect>0?aspect:1.44;
  const c=validClock(clock)?clock:defaultClock,compact=a<.8;
  const offer=smooth((t-c.swordStart)/1.5),grip=smooth((t-c.swordStart-.5)/1);
  const white=smooth((t-c.swordStart-1.55)/Math.max(.01,c.swordDuration-1.55));
  const rawSweep=clamp((t-c.cutStart)/c.cutDuration),sweep=rawSweep<.5?16*rawSweep**5:1-(-2*rawSweep+2)**5/2;
  const hilt:[number,number]=[(compact?1.22:1.26)+((compact?.52:.5)-(compact?1.22:1.26))*offer,
    (compact?-1.04:-.9)+((compact?-.62:-.52)-(compact?-1.04:-.9))*offer];
  const baseTip:[number,number]=[(compact?-.08:-.05)+((compact?-.52:-.72)-(compact?-.08:-.05))*offer,
    1.06+((compact?.87:.83)-1.06)*offer];
  const dx=(baseTip[0]-hilt[0])*a,dy=baseTip[1]-hilt[1];
  const angle=Math.atan2(dy,dx),length=Math.max(Math.hypot(dx,dy),1.48*Math.max(a,1));
  // A single rigid draw follows the accepted blade's own axis through the page.
  // The hand and hilt travel together; there is no second line or elastic blade.
  const draw=sweep*3.2*Math.max(a,1);
  hilt[0]-=Math.cos(angle)*draw/a;hilt[1]-=Math.sin(angle)*draw;
  const tip:[number,number]=[hilt[0]+Math.cos(angle)*length/a,hilt[1]+Math.sin(angle)*length];
  const opacity=smooth((t-c.swordStart)/.16)*(1-smooth((t-(c.cutStart+c.cutDuration-.045))/.045));
  const phase:MergeCeremonyPhase=t<c.swordStart?'waiting':t>=c.cutStart+c.cutDuration?'gone':t>=c.cutStart?'cut':white>=.999?'white':grip>=.999?'held':grip>0?'accepting':'offering';
  return {offer,grip,white,sweep,opacity,angle,hilt,tip,viewportFraction:length/(2*Math.max(a,1)),phase};
}

export interface OpeningCeremonyClock {swordStart:number;swordDuration:number;gripStart:number;gripDuration:number;departure:number;departureDuration:number;unlock:number}
export interface OpeningCeremonyPose extends MergeCeremonyPose {receiving:number;leave:number}
/** Click-local pose. A rigid, hilt-first descent meets the frozen palm; the blade stays green. */
export function openingCeremonyPose(elapsed:number,aspect:number,clock:OpeningCeremonyClock,targetX=.30,targetY=-.12):OpeningCeremonyPose {
  const t=Number.isFinite(elapsed)?Math.max(0,elapsed):0,a=Number.isFinite(aspect)&&aspect>0?aspect:1.44;
  const x=Number.isFinite(targetX)?Math.max(-.55,Math.min(.55,targetX)):.30;
  const y=Number.isFinite(targetY)?Math.max(-.48,Math.min(.08,targetY)):-.12;
  const offer=smooth((t-clock.swordStart)/clock.swordDuration),grip=smooth((t-clock.gripStart)/clock.gripDuration);
  const leave=smooth((t-clock.departure)/clock.departureDuration),receiving=smooth(t/Math.max(.1,clock.swordStart*2));
  const catchY=Math.min(y,-.56),rise=2.65*(1-offer);
  const hilt:[number,number]=[x,catchY+rise];
  // The full received blade fits above its palm on every portrait/landscape layout.
  const dx=-Math.min(.38,.25/a),dy=.72-catchY;
  const tip:[number,number]=[x+dx,catchY+dy+rise];
  const length=Math.hypot(dx*a,dy);
  const opacity=smooth((t-clock.swordStart)/.16)*(1-smooth(leave/.3));
  return {offer,grip,white:0,sweep:0,opacity,angle:Math.atan2(dy,dx*a),hilt,tip,viewportFraction:length/(2*Math.max(a,1)),phase:offer<.999?grip>0?'accepting':t<clock.swordStart?'waiting':'offering':'held',receiving,leave};
}
