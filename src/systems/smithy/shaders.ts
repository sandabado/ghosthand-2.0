export const smithyBarVertex=`
  attribute float aKind;attribute float aSeed;attribute float aStation;
  uniform float uSmithyUnroll;
  varying vec3 vWorld;varying vec3 vNormal;varying float vKind;varying float vSeed;varying float vStation;varying float vRod;
  void main(){vec4 p=instanceMatrix*vec4(position,1.0);
    if(aKind>3.5)p.y+=(1.0-uSmithyUnroll)*3.35;
    vec4 world=modelMatrix*p;vWorld=world.xyz;vNormal=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal);
    vKind=aKind;vSeed=aSeed;vStation=aStation;vRod=aStation>-.5?step(1.7,length(instanceMatrix[0].xyz)):0.0;gl_Position=projectionMatrix*viewMatrix*world;
  }`;
export const smithyBarFragment=`
  uniform float uSceneMix;uniform float uSmithyFocus;uniform float uPlateLoaded;
  uniform vec3 uBone;uniform vec3 uCandle;uniform vec3 uCandleDim;uniform vec3 uVoid;uniform vec3 uSmoke;
  varying vec3 vWorld;varying vec3 vNormal;varying float vKind;varying float vSeed;varying float vStation;varying float vRod;
  float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  void main(){
    if(vRod>.5||uPlateLoaded>.5&&vStation<-.5)discard;
    float grit=hash(floor(vWorld*73.0));vec3 light=normalize(vec3(1.4,3.5,3.0)-vWorld);
    float diffuse=max(0.0,dot(normalize(vNormal),light));float focus=vStation<-.5?0.0:exp(-abs(vStation-uSmithyFocus)*3.0);
    vec3 color=mix(uVoid,uSmoke,.3+grit*.14)*(.3+diffuse*.6)+uCandleDim*diffuse*.035;
    if(vKind>.5&&vKind<1.5)color=mix(uCandleDim,uCandle,focus*.5)*(.16+focus*.32);
    else if(vKind>1.5&&vKind<2.5||vKind>3.5)color=uBone*(.18+diffuse*.24)+uCandleDim*focus*.1;
    else if(vKind>2.5&&vKind<3.5)color=mix(uVoid,uSmoke,.6)*(.45+diffuse*.4)+uBone*pow(diffuse,9.0)*.09;
    float fog=1.0-exp(-max(0.0,distance(cameraPosition,vWorld)-7.0)*.028);
    gl_FragColor=vec4(mix(color,uVoid,fog*.7),uSceneMix);
  }`;

export const smithySurfaceVertex=`
  varying vec2 vUv;varying vec3 vWorld;varying vec3 vNormal;
  void main(){vUv=uv;vec4 world=modelMatrix*vec4(position,1.0);vWorld=world.xyz;vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*viewMatrix*world;}`;
export const smithyParticleVertex=`
  attribute float aSeed;attribute float aKind;attribute vec3 aTarget;
  uniform float uTime;uniform float uCommissionImpact;uniform float uOathGather;
  varying float vSeed;varying float vKind;varying float vAlpha;
  void main(){vec3 p=position;vSeed=aSeed;vKind=aKind;
    if(aKind<.5){p.y=mod(p.y+2.6+uTime*(.018+aSeed*.025),6.0)-2.6;p.x+=sin(uTime*.12+aSeed*31.0)*.035;vAlpha=.09;}
    else if(aKind<1.5){float spread=1.0-uCommissionImpact;p=aTarget+vec3((position.x*.08)*spread,spread*(.15+aSeed*.7),position.z*.025*spread);vAlpha=uCommissionImpact*.65;}
    else{float gather=smoothstep(0.0,1.0,uOathGather);p=mix(p,aTarget,gather);p.y+=sin(uTime*.45+aSeed*40.0)*.012*(1.0-gather);vAlpha=.04+gather*.24;}
    vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;
    gl_PointSize=clamp((aKind<.5?10.0:22.0)/max(1.0,-mv.z),1.0,aKind<.5?2.2:4.0);
  }`;
export const smithyParticleFragment=`
  uniform float uSceneMix;uniform float uSceneMode;uniform vec3 uBone;uniform vec3 uCandleDim;uniform vec3 uBlood;
  varying float vSeed;varying float vKind;varying float vAlpha;
  void main(){float alpha=(1.0-smoothstep(.07,.5,length(gl_PointCoord-.5)))*vAlpha*uSceneMix;
    vec3 color=mix(uCandleDim,uBone,.5+vSeed*.4);
    if(vKind>.5&&vKind<1.5&&uSceneMode<.5)color=uBlood;
    gl_FragColor=vec4(color,alpha);}`;
export const smithyPoolFragment=`
  uniform float uSceneMix;uniform float uSceneMode;uniform float uOathGather;uniform vec3 uBone;uniform vec3 uCandleDim;
  varying vec2 vUv;
  void main(){vec2 p=(vUv-.5)*2.0;float pool=pow(max(0.0,1.0-length(p)),3.0);
    vec3 color=uSceneMode>.5?mix(uCandleDim,uBone,.25):uCandleDim;
    gl_FragColor=vec4(color,pool*(uSceneMode>.5?.025+uOathGather*.025:.08)*uSceneMix);}`;

export const smithyPlateVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.9999,1.0);}`;
export const smithyPlateFragment=`
  uniform sampler2D uPlate;uniform float uPlateLoaded;uniform float uSceneMix;uniform float uViewAspect;uniform float uImageAspect;
  uniform float uTime;uniform float uSceneMode;uniform vec3 uVoid;
  varying vec2 vUv;
  void main(){if(uPlateLoaded<.5)discard;vec2 crop=vec2(1.0);vec2 uv;
    bool restingNarrow=uSceneMode>.5&&uViewAspect<.8;
    if(restingNarrow){
      float imageHeight=uViewAspect/uImageAspect;
      uv=vec2(vUv.x,(vUv.y-(.31-imageHeight*.5))/imageHeight);
      if(uv.y<0.0||uv.y>1.0){gl_FragColor=vec4(uVoid*.25,uSceneMix);return;}
    }else{
      if(uViewAspect<uImageAspect)crop.x=uViewAspect/uImageAspect;else crop.y=uImageAspect/uViewAspect;
      uv=(vUv-.5)*crop+.5;
    }
    float heat=0.0;
    if(uSceneMode<.5){
      vec2 local=(uv-vec2(.51,.49))*vec2(7.0,4.0);
      heat=exp(-dot(local,local))*smoothstep(.24,.43,uv.y)*(1.0-smoothstep(.75,.82,uv.y));
      uv+=vec2(sin(uv.y*95.0+uTime*.9)*.0012,sin(uv.x*120.0-uTime*.65)*.0005)*heat;
    }
    vec3 color=texture2D(uPlate,uv).rgb;
    color*=1.0+heat*(sin(uTime*2.3)*.008+sin(uTime*4.7)*.005);
    if(restingNarrow)color=mix(uVoid*.25,color,smoothstep(0.0,.045,uv.y)*smoothstep(0.0,.045,1.0-uv.y));
    gl_FragColor=vec4(color,uSceneMix);
  }`;
