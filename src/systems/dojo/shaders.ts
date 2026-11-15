export const dojoBarVertex=`
  attribute float aKind;attribute float aSeed;attribute float aStation;
  uniform float uTime;uniform float uHankoPress;uniform vec3 uGuidePosition;
  varying vec3 vWorld;varying vec3 vNormal;varying float vKind;varying float vSeed;varying float vStation;
  void main(){
    vec4 p=instanceMatrix*vec4(position,1.0);
    if(aKind>2.5&&aKind<3.5){p.xyz+=uGuidePosition;p.y+=sin(uTime*1.2)*.045;}
    if(aKind>3.5&&aKind<4.5)p.y-=uHankoPress*.53;
    vec4 world=modelMatrix*p;vWorld=world.xyz;vNormal=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal);
    vKind=aKind;vSeed=aSeed;vStation=aStation;
    gl_Position=projectionMatrix*viewMatrix*world;
  }`;

export const dojoBarFragment=`
  uniform float uTime;uniform float uSceneMix;uniform float uChamberStrength;uniform float uDojoFocus;uniform float uDojoGuide;
  uniform float uHankoBloom;uniform float uHankoImpact;uniform float uHankoStroke;
  uniform vec3 uCandle;uniform vec3 uCandleDim;uniform vec3 uSmoke;uniform vec3 uBone;uniform vec3 uVoid;uniform vec3 uBlood;uniform vec3 uLampPosition;
  varying vec3 vWorld;varying vec3 vNormal;varying float vKind;varying float vSeed;varying float vStation;
  float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  void main(){
    float focusGlow=vStation<-.5?0.0:exp(-abs(uDojoFocus-vStation)*3.5);
    float lamp=1.0/(1.0+distance(vWorld,uLampPosition)*.6);
    float grit=hash(floor(vWorld*46.0));
    vec3 normal=normalize(vNormal);float lambert=max(dot(normal,normalize(uLampPosition-vWorld)),0.0);
    vec3 stone=mix(uVoid,uSmoke,.32+grit*.21);
    float seam=0.0;
    if(normal.y>.7&&vWorld.y<-2.45){
      vec2 tile=abs(fract(vWorld.xz*.72)-.5);
      seam=smoothstep(.485,.498,max(tile.x,tile.y));
      stone=mix(stone,uCandleDim,seam*.17);
      stone+=uCandleDim*pow(max(0.0,1.0-length(vWorld.xz-uLampPosition.xz)*.2),3.0)*.14;
    }
    vec3 color=stone*(.48+lambert*.5)+uCandleDim*lamp*.09;float alpha=1.0;
    if(vKind>.5&&vKind<1.5){color=mix(uCandleDim,uCandle,.15+focusGlow*.7)*( .5+lamp*.6 );alpha=.48+focusGlow*.5;}
    else if(vKind>1.5&&vKind<2.5){color=uBone*(.1+lamp*.2);alpha=.65;}
    else if(vKind>2.5&&vKind<3.5){color=mix(uCandle,uBone,.16);alpha=(.45+.3*uDojoGuide)*( .8+sin(vWorld.y*31.0+uTime*.7)*.08 );}
    else if(vKind>3.5&&vKind<4.5){color=mix(uSmoke,uBlood,.6+grit*.1)+uBone*.035+uBlood*uHankoStroke*.35;}
    else if(vKind>4.5&&vKind<5.5){color=uBlood*(.8+uHankoImpact*.7);alpha=uHankoBloom*(.8+grit*.2);}
    else if(vKind>5.5){color=mix(uCandle,uBone,.1)*(.58+uHankoStroke*.25+uHankoImpact*.2);alpha=.55+uHankoBloom*.4;}
    float fog=1.0-exp(-max(0.0,distance(cameraPosition,vWorld)-5.0)*.025);
    color=mix(color,uVoid,fog*.74);
    if(alpha*uSceneMix*uChamberStrength<.002)discard;
    gl_FragColor=vec4(color,alpha*uSceneMix*uChamberStrength);
  }`;

export const dojoScrollVertex=`
  varying vec2 vUv;varying vec3 vWorld;
  void main(){vUv=uv;vec4 world=modelMatrix*vec4(position,1.0);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`;

export const dojoScrollFragment=`
  uniform float uTime;uniform float uSceneMix;uniform float uVariant;uniform float uDojoFocus;
  uniform vec3 uCandle;uniform vec3 uCandleDim;uniform vec3 uBone;uniform vec3 uVoid;
  varying vec2 vUv;varying vec3 vWorld;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float line(float d,float width){return 1.0-smoothstep(width,width+.006,abs(d));}
  float ring(vec2 p,float radius){return line(length(p)-radius,.006);}
  void main(){
    vec2 uv=vUv;vec2 bend=uv-.5;uv+=bend*dot(bend,bend)*.05;
    float edge=step(.012,uv.x)*step(uv.x,.988)*step(.008,uv.y)*step(uv.y,.992);
    float focusGlow=exp(-abs(uDojoFocus-uVariant)*3.0);
    vec2 p=(uv-vec2(.5,.6))*vec2(1.0,1.7);float t=uTime*.12;
    float image=0.0,detail=0.0;
    if(uVariant<.5){
      for(int i=0;i<7;i++){float k=float(i);float y=sin(p.x*8.0+k*.63+t)*(.07+k*.012)+sin(p.x*15.0-t*.7)*.02;image+=line(p.y-y+(k-3.0)*.055,.003)*.35;}
      vec2 q=fract((p+1.0)*8.0)-.5;detail=(1.0-smoothstep(.02,.065,length(q)))*.24;
    }else if(uVariant<1.5){
      vec2 q=p*1.05;float a=atan(q.y,q.x);image=ring(q,.23)+ring(q,.34)*.4;
      image+=line(length(q)-(.28+sin(a*12.0+t)*.012),.004)*.45;
      detail=line(p.y,.003)*step(.35,abs(p.x))+line(p.x,.003)*step(.35,abs(p.y));
    }else if(uVariant<2.5){
      vec2 grid=(p+vec2(t*.025,0.0))*7.0;vec2 q=fract(grid)-.5;
      float nodes=1.0-smoothstep(.025,.09,length(q));
      image=nodes*(.4+.6*hash(floor(grid)));
      detail=(line(q.x,.009)+line(q.y,.009))*.18+line(q.x-q.y,.012)*.1;
    }else if(uVariant<3.5){
      float d=length(p*vec2(.8,1.15))+sin(p.x*9.0+t)*.018+sin(p.y*14.0-t)*.014;
      image=pow(.5+.5*cos(d*93.0-t),14.0)*.55;
      detail=ring(p,.075)*.5+line(p.x,.002)*.1+line(p.y,.002)*.1;
    }else if(uVariant<4.5){
      for(int i=0;i<3;i++){float k=float(i),x=(k-1.0)*.22;vec2 q=p-vec2(x,sin(t+k)*.035);
        image+=ring(q,.06)*.8;float route=line(q.x+sin(q.y*9.0+t+k)*.018,.004);image+=route*step(q.y,-.07)*step(-.6,q.y)*.4;}
      detail=line(p.y-.27,.004)*.3;
    }else{
      vec2 q=p*6.0;vec2 cell=floor(q),local=fract(q)-.5;float n=hash(cell);
      float track=n>.5?line(local.x,.017):line(local.y,.017);
      image=track*.25+ring(local,.095)*step(.72,n)*.7;
      detail=line(p.x+p.y-.12,.004)*.4+line(p.x-p.y+.12,.004)*.4;
    }
    // Legible structure, intentionally non-text glyph bars: supplied member media stays replaceable.
    float row=floor(uv.y*70.0),cell=floor(uv.x*34.0);
    float glyph=step(.48,hash(vec2(cell,row+uVariant*17.0)))*step(.22,fract(uv.x*34.0))*step(fract(uv.y*70.0),.27);
    float text=glyph*step(uv.y,.255)*step(.06,uv.x)*step(uv.x,.72+hash(vec2(row,uVariant))*.18)*.25;
    float rules=line(uv.y-.905,.0015)*step(.06,uv.x)*step(uv.x,.94);
    rules+=line(uv.y-.29,.001)*step(.06,uv.x)*step(uv.x,.94)*.45;
    float border=line(uv.x-.035,.0012)+line(uv.x-.965,.0012);
    float label=step(.825,uv.y)*step(uv.y,.86)*step(.07,uv.x)*step(uv.x,.33+uVariant*.055);
    float scan=.91+.09*sin(uv.y*1200.0);
    float flicker=.975+.025*sin(uTime*24.0+uVariant*7.0);
    float rolling=line(uv.y-fract(uTime*.035+uVariant*.13),.012)*.045;
    float vignette=clamp(1.0-dot(bend*vec2(.8,.5),bend)*1.1,.4,1.0);
    float energy=clamp(image*.75+detail*.4+text+rules*.6+border*.22+label*.3+rolling,0.0,1.25);
    vec3 color=mix(uVoid,uCandleDim,.18)+uCandle*energy*(.48+focusGlow*.5);
    color=mix(color,uBone,clamp(image-.9,0.0,.08));
    color*=scan*flicker*vignette;
    float fog=1.0-exp(-max(0.0,distance(cameraPosition,vWorld)-7.0)*.027);
    color=mix(color,uVoid,fog*.6);
    if(edge<.5)discard;
    gl_FragColor=vec4(color,(.87+focusGlow*.12)*edge*uSceneMix);
  }`;

export const dojoParticleVertex=`
  attribute float aSeed;attribute float aKind;uniform float uTime;uniform float uHankoImpact;
  varying float vSeed;varying float vKind;varying float vAlpha;
  void main(){
    vec3 p=position;vSeed=aSeed;vKind=aKind;
    if(aKind<.5){p.y=mod(p.y+2.5+uTime*(.025+aSeed*.025),6.2)-2.5;p.x+=sin(uTime*.2+aSeed*20.0)*.06;vAlpha=.12;}
    else{float spread=1.0-uHankoImpact;p=vec3(p.x*(.3+spread*1.8),-1.72+spread*(.3+aSeed*.65),-9.63+p.z*(.3+spread*1.8));vAlpha=uHankoImpact*.8;}
    vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;
    gl_PointSize=clamp((aKind<.5?12.0:32.0)/max(1.0,-mv.z),1.0,aKind<.5?2.5:7.0);
  }`;
export const dojoParticleFragment=`
  uniform float uSceneMix;uniform vec3 uCandle;uniform vec3 uBone;uniform vec3 uBlood;
  varying float vSeed;varying float vKind;varying float vAlpha;
  void main(){float radius=length(gl_PointCoord-.5);float alpha=(1.0-smoothstep(.1,.5,radius))*vAlpha*uSceneMix;
    vec3 color=vKind<.5?mix(uCandle,uBone,vSeed*.4):uBlood;gl_FragColor=vec4(color,alpha);}`;

export const dojoPoolFragment=`
  uniform float uTime;uniform float uSceneMix;uniform vec3 uCandleDim;uniform vec3 uCandle;varying vec2 vUv;varying vec3 vWorld;
  void main(){vec2 p=(vUv-.5)*2.0;float pool=pow(max(0.0,1.0-length(p)),3.0);
    float vapor=.7+.15*sin(p.x*13.0+uTime*.35)+.15*sin(p.y*17.0-uTime*.23);
    gl_FragColor=vec4(mix(uCandleDim,uCandle,.13),pool*vapor*.14*uSceneMix);}`;
