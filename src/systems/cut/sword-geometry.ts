import { ExtrudeGeometry,LatheGeometry,Path,Shape,Vector2 } from 'three';
import type { SwordProfile } from '../smithy/geometry';

/** One continuous katana assembly, measured from the middle of its wrapped grip. */
export const CEREMONY_SWORD={
  grip:{start:-.86,end:.86,radius:.112},
  guard:{center:.8815,thickness:.035,halfWidth:.32,halfDepth:.145},
  collar:{start:.899,end:1.04,halfWidth:.094,halfDepth:.043},
  blade:{start:1.04,tip:[5.44,.275] as const},
  pommel:{center:-.876,thickness:.055},
} as const;

export const CEREMONY_SCABBARD={noseClearance:.045} as const;

/** Blade and sheath use the ceremony's grip-centred coordinates in every room. */
export function buildCeremonySwordProfile(profile:SwordProfile){
  const offset=CEREMONY_SWORD.blade.start-.13;
  for(let vertex=0;vertex<profile.positions.length/3;vertex++)profile.positions[vertex*3]+=offset+(profile.sheathed?profile.uv[vertex*2]*CEREMONY_SCABBARD.noseClearance:0);
  return profile;
}

/** A low oval with two pierced openings, rather than stacked circular plates. */
export function createCeremonyGuard(){
  const shape=new Shape();shape.absellipse(0,0,CEREMONY_SWORD.guard.halfDepth,CEREMONY_SWORD.guard.halfWidth,0,Math.PI*2,false,0);
  for(const side of [-1,1]){
    const opening=new Path();opening.absellipse(0,side*.172,.035,.054,0,Math.PI*2,true,0);shape.holes.push(opening);
  }
  const geometry=new ExtrudeGeometry(shape,{depth:.027,steps:1,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:2,curveSegments:24});
  geometry.translate(0,0,-.0135);geometry.rotateY(Math.PI/2);return geometry;
}

/** The habaki touches both the guard and the blade root with a small forged bevel. */
export function createCeremonyCollar(){
  const {start,end,halfWidth,halfDepth}=CEREMONY_SWORD.collar,shape=new Shape();
  shape.moveTo(-halfDepth,-halfWidth);shape.lineTo(halfDepth,-halfWidth);shape.lineTo(halfDepth,halfWidth);shape.lineTo(-halfDepth,halfWidth);shape.closePath();
  const geometry=new ExtrudeGeometry(shape,{depth:end-start-.01,steps:1,bevelEnabled:true,bevelThickness:.005,bevelSize:.003,bevelSegments:2,curveSegments:1});
  geometry.translate(0,0,-(end-start-.01)/2);geometry.rotateY(Math.PI/2);return geometry;
}

export function createCeremonyGrip(){
  const points=[[-.86,.102],[-.82,.108],[-.53,.112],[0,.114],[.53,.112],[.82,.106],[.86,.101]].map(([x,r])=>new Vector2(r,x));
  const geometry=new LatheGeometry(points,32);geometry.rotateZ(-Math.PI/2);geometry.scale(1,1,.73);return geometry;
}

export function createCeremonyPommel(){
  const geometry=new LatheGeometry([[0,-.0275],[.099,-.0275],[.108,-.018],[.112,0],[.108,.018],[.099,.0275],[0,.0275]].map(([r,y])=>new Vector2(r,y)),32);
  geometry.rotateZ(-Math.PI/2);geometry.scale(1,1,.73);return geometry;
}
