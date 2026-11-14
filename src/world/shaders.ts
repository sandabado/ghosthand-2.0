import { Color, ShaderMaterial } from 'three';
import { PALETTE } from '../core/config';
import { runtime, type WorldParams } from '../core/world';

export function worldUniforms() {
  return {
    uTime:{value:0},uProgress:{value:0},uDepth:{value:0},uFogDensity:{value:0.36},
    uInkFlow:{value:0},uLightIntensity:{value:1},uChromaOffset:{value:0},uCutProgress:{value:0},
    uPursuit:{value:0},uHand:{value:0},uInkTipDecay:{value:0},uSword:{value:0},uFlash:{value:0},uReleased:{value:0},
    uSceneMix:{value:1},uVariant:{value:0},uInkBleed:{value:1},uInkPressure:{value:1},uColor:{value:new Color(PALETTE.candle)},
    uDrainTension:{value:0},uDrainSnap:{value:0},uDrainDawn:{value:0},uDrainFocus:{value:0},uDrainGesture:{value:0},
    uDrainMix:{value:0},uSmoke:{value:new Color(PALETTE.smoke)},uCandle:{value:new Color(PALETTE.candle)},uCandleDim:{value:new Color(PALETTE.candleDim)},
    uForge0:{value:0},uForge1:{value:0},uForge2:{value:0},uGateActive:{value:-1},uGateDragX:{value:0},uGateDragY:{value:0},
    uTrainReveal:{value:0},uTrainCompile:{value:0},uOwnX:{value:.18},uOwnY:{value:.74},uOwnLock:{value:0},
    uFleet0:{value:0},uFleet1:{value:0},uFleet2:{value:0},uGatePulse:{value:0},
    uForkLean:{value:0},uForkVelocity:{value:0},uForkChoice:{value:0},uForkCollapse:{value:0},uForkStroke:{value:0},uForkReveal:{value:1},
    uHoldDoorX:{value:.45},uHoldDoorY:{value:0},uHoldDoorWidth:{value:.25},uHoldDoorHeight:{value:.6},
    uBone:{value:new Color(PALETTE.bone)},uVoid:{value:new Color(PALETTE.void)},
  };
}

/** Called by the shared render adapter before every draw. No animation authority lives here. */
export function uploadUniforms(material:ShaderMaterial,params:WorldParams) {
  for(const [name,value] of Object.entries(params)) {
    const key=`u${name[0].toUpperCase()}${name.slice(1)}`;
    if(material.uniforms[key]) material.uniforms[key].value=value;
  }
  runtime.uniformUploads++;
  if(material.uniforms.uFogDensity) runtime.fogUniform=material.uniforms.uFogDensity.value;
}

export const fogVertex=`
  uniform float uTime; uniform float uFogDensity;
  attribute float aSeed; varying float vSeed; varying float vDepth;
  void main(){
    vec3 p=position;
    p.y=mod(p.y+uTime*(0.055+aSeed*0.035)+6.0,12.0)-6.0;
    p.x+=sin(uTime*0.13+aSeed*20.0)*0.22;
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    gl_Position=projectionMatrix*mv;
    gl_PointSize=clamp((17.0+aSeed*35.0)*(0.4+uFogDensity)/max(1.0,-mv.z),1.0,24.0);
    vSeed=aSeed;vDepth=clamp((-mv.z)/30.0,0.0,1.0);
  }`;
export const fogFragment=`
  uniform float uFogDensity;uniform float uLightIntensity;uniform vec3 uColor;uniform vec3 uBone;
  varying float vSeed;varying float vDepth;
  void main(){
    vec2 uv=gl_PointCoord-0.5;float d=length(uv);
    float soft=exp(-d*d*17.0)*smoothstep(0.5,0.2,d);
    float alive=smoothstep(vSeed-0.08,vSeed+0.04,uFogDensity);
    gl_FragColor=vec4(mix(uColor,uBone,vSeed*0.4),soft*alive*(0.14+uFogDensity*0.2)*uLightIntensity*(1.0-vDepth*0.5));
  }`;

export const atmosphereVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
export const atmosphereFragment=`
  varying vec2 vUv;uniform float uTime;uniform float uFogDensity;uniform float uLightIntensity;
  uniform float uDrainDawn;uniform float uDrainMix;uniform vec3 uColor;uniform vec3 uVoid;
  uniform vec3 uSmoke;uniform vec3 uCandle;uniform vec3 uCandleDim;
  float haze(vec2 p){return sin(p.x*2.0+sin(p.y*3.2+uTime*0.06))*sin(p.y*2.3-uTime*0.025);}
  void main(){
    vec2 p=vUv*2.0-1.0;
    float cloud=0.5+0.5*haze(p*2.0);
    float edge=exp(-dot(p*vec2(0.8,1.4),p*vec2(0.8,1.4))*2.5);
    vec3 ordinary=mix(uVoid,uColor,edge*cloud*uFogDensity*0.23*uLightIntensity);
    vec3 burden=mix(uVoid,uSmoke,edge*(0.28+cloud*0.3)*uFogDensity);
    vec3 col=mix(ordinary,burden,uDrainMix);
    float dawn=clamp(uDrainDawn,0.0,1.0);
    float horizon=exp(-pow((p.y+0.28+dawn*0.12)*3.2,2.0))*exp(-p.x*p.x*0.8);
    float opening=exp(-length(p-vec2(0.18,-0.42))*mix(6.0,1.4,dawn));
    float angle=atan(p.x,p.y+1.45);
    float shafts=pow(max(0.0,sin(angle*24.0+0.2)*0.5+0.5),9.0)*smoothstep(-0.7,0.8,p.y);
    col+=mix(uCandleDim,uCandle,horizon*0.68)*(horizon*0.23+opening*0.18+shafts*0.035)*dawn;
    gl_FragColor=vec4(col,1.0);
  }`;

export const strokeVertex=`attribute float aAlong;varying float vAlong;void main(){vAlong=aAlong;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
export const strokeFragment=`
  uniform float uHand;uniform float uSceneMix;uniform float uLightIntensity;uniform vec3 uColor;varying float vAlong;
  void main(){float draw=1.0-smoothstep(uHand-0.015,uHand+0.015,vAlong);gl_FragColor=vec4(uColor*1.3,draw*uSceneMix*(0.45+uLightIntensity*0.2));}`;

export const scrollFragment=`
  varying vec2 vUv;uniform float uTime;uniform float uVariant;uniform float uSceneMix;uniform vec3 uColor;uniform vec3 uBone;uniform vec3 uVoid;
  void main(){
    vec2 p=(vUv-0.5)*2.0;float r=length(p);float angle=atan(p.y,p.x);
    float wave=sin(r*(16.0+uVariant*2.0)-uTime*0.4+angle*(uVariant+1.0));
    float lines=pow(max(0.0,wave),16.0)*smoothstep(1.25,0.1,r);
    float grid=step(0.96,fract(vUv.y*90.0))*0.06;
    float crt=0.96+sin(vUv.y*600.0+uTime)*0.04;
    vec3 col=mix(uVoid,uColor,clamp(lines*0.7+grid,0.0,1.0));
    col+=uBone*pow(max(0.0,1.0-r*4.0),4.0)*0.5;
    gl_FragColor=vec4(col*crt,uSceneMix);
  }`;
