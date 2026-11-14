export const gateBarVertex=`
attribute float aKind;attribute float aChannel;attribute float aAlong;attribute float aSeed;
uniform float uGateMode;uniform float uTime;uniform float uForge0;uniform float uForge1;uniform float uForge2;
uniform float uGateActive;uniform float uGateDragX;uniform float uGateDragY;uniform float uTrainReveal;uniform float uTrainCompile;
uniform float uOwnX;uniform float uOwnY;uniform float uOwnLock;uniform float uFleet0;uniform float uFleet1;uniform float uFleet2;
varying float vKind;varying float vAlong;varying float vSeed;varying float vActivation;
varying vec3 vWorldPosition;varying vec3 vFaceNormal;
float channel(float a,float b,float c){return aChannel<.5?a:aChannel<1.5?b:c;}
void main(){
  vec4 world=instanceMatrix*vec4(position,1.0);float activation=0.0;
  if(aKind>.5){
    if(uGateMode<1.5){
      activation=channel(uForge0,uForge1,uForge2);
      float loose=1.0-activation;
      world.x+=loose*(-1.0+aSeed*.55);world.y+=loose*sin(aSeed*24.0)*.35;
      float activeStrand=1.0-step(.45,abs(aChannel-uGateActive));
      world.x+=activeStrand*loose*(uGateDragX-.12)*1.1;
      world.y+=activeStrand*loose*(.5-uGateDragY)*.65;
    }else if(uGateMode<2.5){
      activation=smoothstep(aAlong-.025,aAlong+.015,uTrainReveal)+uTrainCompile*.35;
    }else if(uGateMode<3.5){
      activation=uOwnLock;
      if(aKind>2.5){world.x+=(uOwnX-.18)*4.83;world.y+=(.74-uOwnY)*3.03;}
      else if(aKind<1.5){world.xy+=vec2(world.x-2.78,world.y+.05)*sin(uOwnLock*3.14159265)*.045;}
    }else{
      activation=channel(uFleet0,uFleet1,uFleet2);
      world.y+=activation*.3;
    }
  }
  vKind=aKind;vAlong=aAlong;vSeed=aSeed;vActivation=activation;
  vWorldPosition=world.xyz;vFaceNormal=normalize(mat3(instanceMatrix)*normal);
  gl_Position=projectionMatrix*modelViewMatrix*world;
}`;
export const gateBarFragment=`
uniform float uGateMode;uniform float uSceneMix;uniform float uGatePulse;uniform float uTrainCompile;uniform float uOwnLock;
uniform vec3 uBone;uniform vec3 uCandle;uniform vec3 uCandleDim;uniform vec3 uSmoke;uniform vec3 uVoid;
varying float vKind;varying float vAlong;varying float vSeed;varying float vActivation;
varying vec3 vWorldPosition;varying vec3 vFaceNormal;
void main(){
  vec3 color=mix(uSmoke,uBone,.1);float alpha=.5;
  if(vKind<.5){
    float depthFalloff=mix(.35,1.0,smoothstep(-33.0,-4.0,vWorldPosition.z));
    float storyShade=mix(.3,1.0,smoothstep(-1.8,3.5,vWorldPosition.x));
    float faceLight=.22+.78*max(0.0,dot(normalize(vFaceNormal),normalize(vec3(-.4,.8,.5))));
    if(vAlong>.94){color=uCandleDim;alpha=(.16+uGatePulse*.08)*depthFalloff*storyShade;}
    else{
      color=mix(uSmoke,uBone,.035)*(.08+faceLight*.08)*depthFalloff;
      alpha=.56*storyShade;
      // The floor catches a trace of the room, rather than becoming a gray stage.
      if(vAlong<.05){color=uVoid*(.56+faceLight*.14);alpha=.58*storyShade;}
    }
  }else{
    color=mix(uCandleDim,uBone,.15+vActivation*.45);
    alpha=.13+clamp(vActivation,0.0,1.0)*.24+uGatePulse*.14;
    if(uGateMode>1.5&&uGateMode<2.5){color=mix(uCandleDim,uCandle,vActivation*.62);alpha*=.7+sin(uTrainCompile*3.14159265)*.5;}
    if(uGateMode>2.5&&uGateMode<3.5){
      color=mix(uCandleDim,uCandle,uOwnLock*.7);
      if(vKind>1.5&&vKind<2.5){alpha*=smoothstep(.3,.85,uOwnLock);color=mix(uBone,uCandle,.4);}
      if(vKind>2.5){alpha*=1.0-uOwnLock; color=uBone;}
    }
  }
  gl_FragColor=vec4(color,alpha*uSceneMix);
}`;
export const gateParticleVertex=`
attribute float aSeed;attribute float aChannel;
uniform float uGateMode;uniform float uTime;uniform float uForge0;uniform float uForge1;uniform float uForge2;
uniform float uTrainCompile;uniform float uOwnLock;uniform float uFleet0;uniform float uFleet1;uniform float uFleet2;
varying float vAlpha;varying float vSeed;
float channel(float a,float b,float c){return aChannel<.5?a:aChannel<1.5?b:c;}
void main(){
  vec3 p=position;float seed=aSeed;float angle=seed*83.0;float alpha=0.0;
  if(uGateMode<1.5){
    float seat=channel(uForge0,uForge1,uForge2);float burst=sin(seat*3.14159265);
    p.y+=mod(uTime*(.23+seed*.15)+seed*5.0,5.0)-2.0;
    p.x+=sin(angle+uTime*.23)*(.12+burst*.8);p.z-=burst*seed*1.2;
    alpha=.07+burst*.65;
  }else if(uGateMode<2.5){
    float age=uTrainCompile;p.x+=cos(angle)*age*1.2;p.y+=sin(angle)*age*.8;p.z+=age*.6;
    alpha=sin(age*3.14159265)*.45;
  }else if(uGateMode<3.5){
    float age=uOwnLock;float r=1.7+sin(age*3.14159265)*seed*1.1;
    p=vec3(2.78+cos(angle)*r,-.05+sin(angle)*r,-6.0+sin(angle*2.0)*age*.4);
    alpha=sin(age*3.14159265)*.65;
  }else{
    float age=channel(uFleet0,uFleet1,uFleet2);float local=clamp((age-seed*.13)/.87,0.0,1.0);
    p.x+=(aChannel-1.0)*local*1.1+sin(angle)*local*seed*.8;
    p.y+=local*local*5.5+cos(angle)*local*seed*.7;p.z-=local*22.0-seed*local*2.3;
    alpha=smoothstep(.01,.17,age)*(1.0-smoothstep(.68,1.0,age))*(.18+seed*.6);
  }
  vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;
  gl_PointSize=clamp((1.0+seed*2.4)*17.0/max(1.0,-mv.z),.7,5.0);
  vAlpha=alpha;vSeed=seed;
}`;
export const gateParticleFragment=`
uniform float uSceneMix;uniform vec3 uBone;uniform vec3 uCandle;
varying float vAlpha;varying float vSeed;
void main(){
  float soft=1.0-smoothstep(.04,.5,length(gl_PointCoord-.5));float alpha=soft*vAlpha*uSceneMix;
  if(alpha<.003)discard;gl_FragColor=vec4(mix(uCandle,uBone,vSeed*.65),alpha);
}`;
export const fleetHandVertex=`
attribute float aHand;attribute float aPressure;attribute float aSeed;
uniform float uFleet0;uniform float uFleet1;uniform float uFleet2;uniform float uGateActive;uniform float uGateDragX;uniform float uGateDragY;
varying vec2 vUv;varying float vFlight;varying float vPressure;varying float vSeed;
void main(){
  float flight=aHand<.5?uFleet0:aHand<1.5?uFleet1:uFleet2;
  vec3 p=position;p.x+=(aHand-1.0)*flight*1.1;p.y+=flight*flight*5.5;p.z-=flight*22.0;
  float activeHand=(1.0-step(.45,abs(aHand-uGateActive)))*(1.0-step(.001,flight));
  p.x+=activeHand*(uGateDragX-.5)*.3;p.y+=activeHand*(.5-uGateDragY)*.35;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);vUv=uv;vFlight=flight;vPressure=aPressure;vSeed=aSeed;
}`;
export const fleetHandFragment=`
uniform float uSceneMix;uniform vec3 uBone;uniform vec3 uCandleDim;uniform vec3 uCandle;
varying vec2 vUv;varying float vFlight;varying float vPressure;varying float vSeed;
void main(){
  float edge=smoothstep(0.0,.12,vUv.y)*(1.0-smoothstep(.88,1.0,vUv.y));
  float bristle=.8+.2*sin(vUv.y*119.0+vSeed*21.0);
  float alpha=edge*bristle*(.10+smoothstep(0.0,.15,vFlight)*.25)*(1.0-smoothstep(.65,1.0,vFlight))*uSceneMix;
  vec3 color=mix(uCandleDim,uBone,.62);color=mix(color,uCandle,vFlight*.32);
  if(alpha<.003)discard;gl_FragColor=vec4(color,alpha*clamp(vPressure,.3,1.3));
}`;
