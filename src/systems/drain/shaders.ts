export const filamentVertex=`
attribute float aAlong;attribute float aAudit;attribute float aSeed;attribute float aOrder;
uniform float uTime;uniform float uDrainTension;uniform float uDrainGesture;uniform float uDrainSnap;uniform float uShell;uniform float uSegmentSpan;
varying float vAlong;varying float vAudit;varying float vSeed;varying float vDetach;
varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;
void main(){
  float along=clamp(aAlong+position.y*uSegmentSpan,0.0,1.0);
  vUv=uv;vAlong=along;vAudit=aAudit;vSeed=aSeed;
  float delay=aOrder*0.34+along*0.32;
  float detach=smoothstep(0.0,1.0,clamp((uDrainSnap-delay)/0.34,0.0,1.0));
  vDetach=detach;
  vec3 local=position;
  float tension=uDrainTension+uDrainGesture*0.16;
  local.xz*=uShell*(0.8+tension*0.2);
  vec4 world=instanceMatrix*vec4(local,1.0);
  float anchored=sin(along*3.14159265);
  float tremor=sin(along*21.0+uTime*1.5+aSeed*31.0)*0.017*anchored;
  world.x+=tremor*(0.25+tension*0.75);
  // The released material recoils away from the body and toward the ceiling.
  float recoil=detach*detach;
  world.y+=recoil*(1.4+aSeed*2.8);
  world.x+=sign(world.x+0.001)*recoil*(0.18+aSeed*0.55);
  world.z-=recoil*(0.8+aSeed*1.5);
  vec4 mv=modelViewMatrix*world;
  vNormal=normalize(mat3(modelViewMatrix)*mat3(instanceMatrix)*normal);
  vView=-mv.xyz;
  gl_Position=projectionMatrix*mv;
}`;
export const filamentFragment=`
uniform float uTime;uniform float uDrainFocus;uniform float uDrainTension;uniform float uSceneMix;uniform float uGlow;
uniform vec3 uEnemy;uniform vec3 uBone;uniform vec3 uSmoke;
varying float vAlong;varying float vAudit;varying float vSeed;varying float vDetach;varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;
void main(){
  float focused=1.0-step(0.45,abs(vAudit-uDrainFocus));
  // Cold packets travel upward, making the direction of the drain legible.
  float packet=pow(max(0.0,sin(vAlong*39.0-uTime*(2.0+vSeed)+vSeed*18.0)),18.0);
  float facing=abs(dot(normalize(vNormal),normalize(vView)));
  float seam=0.75+0.25*sin(vUv.x*6.2831853+vSeed*6.0);
  vec3 cold=mix(uEnemy,uBone,0.055+focused*0.24+packet*0.16);
  cold=mix(cold,uSmoke,vDetach*0.8);
  float alpha=(0.58+focused*0.30+packet*0.1)*(1.0-vDetach)*uSceneMix;
  if(uGlow>0.5){alpha*=0.055*pow(facing,1.6);cold*=1.08+focused*0.45;}
  else{alpha*=smoothstep(0.0,0.32,facing);cold*=0.76+seam*0.25+uDrainTension*0.1;}
  if(alpha<0.004)discard;
  gl_FragColor=vec4(cold,alpha);
}`;
export const releaseVertex=`
attribute float aAlong;attribute float aSeed;attribute float aOrder;attribute float aAudit;
uniform float uTime;uniform float uDrainSnap;uniform float uDrainDawn;
varying float vAlpha;varying float vSeed;varying float vDawn;
void main(){
  float delay=aOrder*0.34+aAlong*0.32;
  float age=clamp((uDrainSnap-delay)/0.34,0.0,1.0);
  float detach=age*age*(3.0-2.0*age);
  float live=smoothstep(0.0,0.13,age)*(1.0-smoothstep(0.25,1.0,age));
  vec3 p=position;float phase=aSeed*31.0;
  p.x+=sin(phase)*detach*(0.25+aSeed*0.7);
  p.y+=detach*(1.1+aSeed*2.1);
  p.z-=detach*(0.5+aSeed*1.4);
  vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;
  gl_PointSize=clamp((1.5+aSeed*4.0)*11.0/max(1.0,-mv.z),1.0,5.5);
  vAlpha=live;vSeed=aSeed;vDawn=uDrainDawn;
}`;
export const releaseFragment=`
uniform vec3 uEnemy;uniform vec3 uCandle;uniform vec3 uBone;uniform float uSceneMix;
varying float vAlpha;varying float vSeed;varying float vDawn;
void main(){
  float soft=1.0-smoothstep(0.05,0.5,length(gl_PointCoord-0.5));
  float alpha=soft*vAlpha*uSceneMix*0.55;if(alpha<0.004)discard;
  vec3 col=mix(uEnemy,uCandle,vDawn);col=mix(col,uBone,vSeed*0.18);
  gl_FragColor=vec4(col,alpha);
}`;
