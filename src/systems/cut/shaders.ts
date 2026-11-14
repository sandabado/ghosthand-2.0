export const cutBarVertex=`
attribute float aKind;attribute float aSide;attribute float aAlong;attribute float aSeed;
uniform float uCutMode;uniform float uCompact;uniform float uPursuit;uniform float uSword;uniform float uCutProgress;
uniform float uForkLean;uniform float uForkChoice;uniform float uForkCollapse;uniform float uForkReveal;
uniform float uHoldDoorX;uniform float uHoldDoorY;uniform float uHoldDoorWidth;uniform float uHoldDoorHeight;
varying float vKind;varying float vSide;varying float vAlong;varying float vSeed;varying float vReject;varying float vFace;varying float vDepth;
void main(){
  vec3 original=(instanceMatrix*vec4(position,1.0)).xyz;
  vec3 p=original;
  float rejectHalf=0.0;
  if(uCutMode<1.5){
    if(aKind>2.5&&aKind<4.5){
      float arc=sin(uPursuit*3.14159265);
      float angle=-.18-arc*.3;mat2 turn=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
      p.xy=turn*p.xy;p.x+=mix(1.85,.35,uCompact)-arc*.9;
      p.y+=.35+arc*.6;p.z+=-7.0-uPursuit*12.0;
    }else{p.z=mod(p.z+uPursuit*43.0+51.0,43.0)-51.0;}
  }else if(uCutMode<2.5){
    if(aKind>2.5&&aKind<4.5){
      p.x+=mix(3.05,.7,uCompact);p.y+=mix(7.8,mix(-.35,-1.75,uCompact),clamp(uSword,0.0,1.0));p.z-=5.1;
    }
  }else if(uCutMode<3.5){
    if(abs(aSide)>.5){
      rejectHalf=step(.5,abs(aSide-uForkChoice))*step(.5,abs(uForkChoice));
      float angle=-clamp(uForkLean,-1.0,1.0)*.12;
      vec3 hinge=p-vec3(0.0,0.0,-6.5);float c=cos(angle),s=sin(angle);
      p=vec3(c*hinge.x+s*hinge.z,hinge.y,-s*hinge.x+c*hinge.z)+vec3(0.0,0.0,-6.5);
      float collapse=uForkCollapse*rejectHalf;
      p.x+=aSide*collapse*(.5+aSeed);p.y-=collapse*collapse*(.2+aSeed*.9);p.z-=collapse*(1.0+aSeed*3.0);
    }
    p.x*=mix(1.0,.42,uCompact);p.y*=mix(1.0,.7,uCompact)*(0.98+.02*uForkReveal);
  }else{
    float central=1.0-step(1.2,abs(p.x));
    p.x*=mix(1.0,mix(.48,.85,central),uCompact);p.y*=mix(1.0,.85,uCompact);
  }
  vKind=aKind;vSide=aSide;vAlong=aAlong;vSeed=aSeed;vReject=rejectHalf;
  vFace=.48+abs(normal.y)*.26+abs(normal.z)*.26;vDepth=clamp((-p.z-5.0)/40.0,0.0,1.0);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
  // The physical portal and its readable label share one measured screen-space frame.
  // The room remains in world space; only the five portal parts use this projection.
  bool portalPart=uCutMode>3.5&&abs(aSide)<.25&&((aKind<.5&&abs(aAlong-.2)<.01)||(abs(aKind-1.0)<.25&&abs(aAlong-.3)<.01));
  if(portalPart){
    vec2 local=vec2(original.x/2.3,(original.y+.55)/4.9);
    vec2 ndc=vec2(uHoldDoorX,uHoldDoorY)+local*vec2(uHoldDoorWidth,uHoldDoorHeight);
    gl_Position.xy=ndc*gl_Position.w;
  }
}`;

export const cutBarFragment=`
uniform float uCutMode;uniform float uSceneMix;uniform float uPursuit;uniform float uSword;uniform float uFlash;uniform float uCutProgress;
uniform float uForkLean;uniform float uForkChoice;uniform float uForkCollapse;uniform float uForkStroke;uniform float uForkReveal;uniform float uProgress;
uniform vec3 uBone;uniform vec3 uVoid;uniform vec3 uSmoke;uniform vec3 uCandle;uniform vec3 uCandleDim;uniform vec3 uEnemy;
varying float vKind;varying float vSide;varying float vAlong;varying float vSeed;varying float vReject;varying float vFace;varying float vDepth;
void main(){
  vec3 col=uBone;float alpha=.6;
  if(vKind<.5){col=mix(uVoid,uSmoke,.25+vFace*.25);alpha=.82;}
  else if(vKind>2.5&&vKind<4.5){
    float edge=pow(max(0.0,sin(vAlong*3.14159265)),.4);
    col=mix(uBone,uCandle,.13+vAlong*.19)*(1.2+edge*.8);
    if(vKind>3.5){col=mix(uSmoke,uBone,.35+vAlong*.26);}
    alpha=uCutMode<1.5?.86:smoothstep(.00001,.001,uSword)*(1.0-smoothstep(.02,.9,uCutProgress));
  }else if(vKind>4.5){col=uCandle*(1.4+uFlash*2.0);alpha=uCutMode<2.5?uCutProgress:.55;}
  else if(uCutMode<1.5){col=mix(uCandleDim,uBone,vSeed*.4);alpha=(.07+vSeed*.14)*(1.0-vDepth*.6);}
  else if(uCutMode>2.5&&uCutMode<3.5){
    vec3 halfColor=vSide>.5?uEnemy:uCandle;
    float attention=clamp(uForkLean*vSide,0.0,1.0);
    col=mix(halfColor,uBone,vKind>1.5?.08:.13);
    alpha=(vKind>1.5?.16:.1)+attention*.13+uForkStroke*.09;
    alpha*=uForkReveal;
    float crumble=smoothstep(vSeed*.42,.48+vSeed*.52,uForkCollapse);
    alpha*=1.0-vReject*crumble;
    float chosen=(1.0-step(.5,abs(vSide-uForkChoice)))*step(.5,abs(uForkChoice));
    alpha+=chosen*uForkCollapse*.14;
  }else if(vKind>1.5){col=mix(uEnemy,uSmoke,.28);alpha=.22*(1.0-vDepth*.6);}
  else{col=uCandle;alpha=.5+uProgress*.2;}
  if(alpha<.003)discard;
  gl_FragColor=vec4(col,alpha*uSceneMix);
}`;

export const cutParticleVertex=`
attribute float aKind;attribute float aSide;attribute float aSeed;
uniform float uCutMode;uniform float uTime;uniform float uCompact;uniform float uPursuit;uniform float uSword;uniform float uFlash;uniform float uCutProgress;
uniform float uForkChoice;uniform float uForkCollapse;uniform float uForkStroke;
varying float vAlpha;varying float vSeed;varying float vSide;varying float vKind;
void main(){
  vec3 p=position;float alpha=0.0;float size=1.0;
  if(aKind<.5){
    p.z=mod(p.z+uPursuit*51.0+55.0,50.0)-55.0;
    float nearFade=1.0-smoothstep(-11.0,-5.0,p.z);
    alpha=(.04+aSeed*.055)*nearFade;size=100.0+aSeed*150.0;
  }else if(aKind<1.5){
    p.x+=mix(3.05,.7,uCompact);p.y+=mix(-.35,-1.75,uCompact);
    p.y=mod(p.y+uTime*(.07+aSeed*.04)+4.0,8.0)-4.0;
    float lit=smoothstep(.00001,.001,uSword)*(.15+uSword*.85);
    float cutBurst=sin(clamp(uCutProgress,0.0,1.0)*3.14159265);
    p.x+=sin(aSeed*71.0)*cutBurst*1.2;p.z-=cutBurst*aSeed*2.0;
    alpha=.015+lit*.16+cutBurst*.55+uFlash*.22;size=1.2+aSeed*3.0;
  }else if(aKind<2.5){
    float rejected=step(.5,abs(aSide-uForkChoice))*step(.5,abs(uForkChoice));
    float age=clamp((uForkCollapse-aSeed*.2)/.8,0.0,1.0);
    p.x+=aSide*age*(.8+aSeed*2.0);p.y+=sin(aSeed*67.0)*age*1.5-age*age*.8;p.z-=age*(1.0+aSeed*5.0);
    p.x*=mix(1.0,.42,uCompact);p.y*=mix(1.0,.7,uCompact);
    alpha=rejected*smoothstep(.01,.16,age)*(1.0-smoothstep(.58,1.0,age))*(.25+aSeed*.45);
    size=1.5+aSeed*3.5;
  }else{
    p.y=mod(p.y+uTime*.035+4.0,8.0)-4.0;
    p.x*=mix(1.0,.6,uCompact);alpha=.035;size=.8+aSeed*1.3;
  }
  vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;
  gl_PointSize=clamp(size*17.0/max(1.0,-mv.z),.7,aKind<.5?210.0:6.0);
  vAlpha=alpha;vSeed=aSeed;vSide=aSide;vKind=aKind;
}`;

export const cutParticleFragment=`
uniform float uSceneMix;uniform vec3 uBone;uniform vec3 uSmoke;uniform vec3 uCandle;uniform vec3 uCandleDim;uniform vec3 uEnemy;
varying float vAlpha;varying float vSeed;varying float vSide;varying float vKind;
void main(){
  float r=length(gl_PointCoord-.5);float soft=exp(-r*r*(vKind<.5?10.0:18.0))*(1.0-smoothstep(.35,.5,r));
  vec3 col=mix(uCandleDim,uBone,.48+vSeed*.2);
  if(vKind>1.5&&vKind<2.5)col=mix(vSide>.5?uEnemy:uCandle,uBone,vSeed*.2);
  if(vKind>2.5)col=mix(uSmoke,uBone,.18);
  float alpha=soft*vAlpha*uSceneMix;if(alpha<.002)discard;
  gl_FragColor=vec4(col,alpha);
}`;

export const spillVertex=`
varying vec2 vUv;uniform float uCutMode;uniform float uHoldDoorX;uniform float uHoldDoorY;uniform float uHoldDoorWidth;uniform float uHoldDoorHeight;
void main(){
  vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
  if(uCutMode>3.5){
    vec2 ndc=vec2(uHoldDoorX,uHoldDoorY)+position.xy*vec2(uHoldDoorWidth*3.0,uHoldDoorHeight*1.7);
    gl_Position.xy=ndc*gl_Position.w;
  }
}`;
export const spillFragment=`
varying vec2 vUv;uniform float uCutMode;uniform float uSword;uniform float uFlash;uniform float uCutProgress;uniform float uSceneMix;uniform float uProgress;uniform float uTime;
uniform vec3 uCandle;uniform vec3 uCandleDim;uniform vec3 uBone;
void main(){
  vec2 p=vUv*2.0-1.0;float glow=0.0;
  if(uCutMode<2.5){
    float arrival=smoothstep(.00001,.001,uSword);float tipY=mix(1.6,-.1,clamp(uSword,0.0,1.0));
    float halo=exp(-length(p-vec2(0.0,tipY))*3.4);
    float shaft=exp(-abs(p.x)*32.0)*exp(-abs(p.y-tipY)*1.6);
    float cloud=.65+.35*sin(p.x*6.0+sin(p.y*5.0+uTime*.08));
    glow=(halo*.3+shaft*.32)*arrival*(.15+uSword*.85)*cloud;
    glow+=exp(-dot(p,p)*2.1)*uFlash*.72;
    glow+=exp(-abs(p.x)*46.0)*sin(clamp(uCutProgress,0.0,1.0)*3.14159265)*.25;
  }else{
    float halo=exp(-dot(p*vec2(1.1,.65),p*vec2(1.1,.65))*2.1);
    float threshold=exp(-pow((p.y+.66)*9.0,2.0))*exp(-p.x*p.x*4.0);
    glow=halo*.075+threshold*(.15+uProgress*.12);
  }
  vec3 col=mix(uCandleDim,uCandle,.65)+uBone*uFlash*.25;
  if(glow<.002)discard;gl_FragColor=vec4(col,glow*uSceneMix);
}`;
