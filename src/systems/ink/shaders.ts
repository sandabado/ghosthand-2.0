/**
 * Pigment is static in stroke space; it never boils with the frame clock.
 * The reveal and wet-to-dry transition consume the existing shared hand/inkTipDecay uniforms.
 * Pressure changes the ribbon geometry and the amount of pigment pooling at its irregular edge.
 */
export const brushVertex = `
  attribute float aAlong;
  attribute float aPressure;
  attribute float aSeed;
  varying vec2 vUv;
  varying float vAlong;
  varying float vPressure;
  varying float vSeed;
  void main() {
    vUv=uv;
    vAlong=aAlong;
    vPressure=aPressure;
    vSeed=aSeed;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
  }
`;

export const brushFragment = `
  uniform float uHand;
  uniform float uInkTipDecay;
  uniform float uSceneMix;
  uniform float uLightIntensity;
  uniform float uStrokeOpacity;
  uniform float uStrokeSeed;
  uniform float uInkBleed;
  uniform float uInkPressure;
  uniform vec3 uColor;
  uniform vec3 uBone;
  uniform vec3 uVoid;
  uniform vec3 uInkDim;
  varying vec2 vUv;
  varying float vAlong;
  varying float vPressure;
  varying float vSeed;

  float hash21(vec2 p) {
    vec3 p3=fract(vec3(p.xyx)*0.1031);
    p3+=dot(p3,p3.yzx+33.33);
    return fract((p3.x+p3.y)*p3.z);
  }
  float valueNoise(vec2 p) {
    vec2 i=floor(p),f=fract(p);
    f=f*f*(3.0-2.0*f);
    return mix(mix(hash21(i),hash21(i+vec2(1.0,0.0)),f.x),
      mix(hash21(i+vec2(0.0,1.0)),hash21(i+vec2(1.0,1.0)),f.x),f.y);
  }
  void main() {
    float pressure=clamp(vPressure*uInkPressure,0.12,1.7);
    float bleedAmount=clamp(uInkBleed,0.0,1.5);
    float seed=uStrokeSeed*41.0+vSeed*0.3;
    float across=abs(vUv.y*2.0-1.0);
    // Four noise samples total. Derivative limits keep the paper and fibers below pixel frequency.
    vec2 pixel=max(fwidth(vUv),vec2(0.0001));
    vec2 paperFrequency=min(vec2(18.0,5.0),vec2(0.18)/pixel);
    vec2 grainUv=vUv*paperFrequency+seed;
    float paper=valueNoise(grainUv)*0.68+valueNoise(grainUv*2.0+11.7)*0.32;
    vec2 edgeFrequency=min(vec2(32.0,4.0),vec2(0.35)/pixel);
    float capillary=valueNoise(vUv*edgeFrequency+seed+27.0);
    float strokeAge=max(0.0,uHand-vAlong);
    float settled=smoothstep(0.0,0.07,strokeAge);
    float wet=(1.0-clamp(uInkTipDecay,0.0,1.0))*(0.22+exp(-strokeAge*9.0)*0.78);

    // A broad loaded brush has a dense body and an irregular, softly feathered fringe.
    float boundary=0.75+settled*0.045*bleedAmount+(capillary-0.5)*(0.11+0.12*bleedAmount);
    float edgeSoftness=max(0.025+(0.02+wet*0.045)*bleedAmount,pixel.y*1.5);
    float body=1.0-smoothstep(boundary-edgeSoftness,boundary+edgeSoftness,across);
    float bleed=(1.0-smoothstep(boundary,1.0,across))*smoothstep(boundary-0.13,boundary+0.05,across);
    bleed*=(0.14+paper*0.26)*bleedAmount;

    // Rare, long bristle gaps read as brush drag, rather than high-frequency glitter.
    vec2 fiberFrequency=min(vec2(3.0,18.0),vec2(0.35)/pixel);
    float fiber=valueNoise(vUv*fiberFrequency+seed);
    float dryBreak=smoothstep(0.61,0.80,fiber)*(0.55+0.25*(1.0-wet))/max(0.8,pressure);
    dryBreak=clamp(dryBreak,0.0,1.0);
    float pigment=body*(1.0-dryBreak*0.92)*(0.94+paper*0.06);
    pigment*=clamp(0.94+(pressure-0.6)*0.1,0.88,1.0);

    float front=1.0-smoothstep(uHand-0.003,uHand+0.006,vAlong);
    if(uHand<=0.0)front=0.0;
    else if(uHand>=1.0)front=1.0;
    float edgeBand=max(0.065,pixel.y*2.0);
    float wetEdge=1.0-smoothstep(0.0,edgeBand,abs(across-boundary+0.04));
    float pooling=smoothstep(0.42,boundary,across)*body;

    // An opaque, muted mineral pigment carries the hand's mass. The edge pools darker.
    vec3 ink=mix(uInkDim,uBone,0.14+paper*0.23);
    ink=mix(ink,uInkDim,pooling*0.36);
    ink=mix(ink,uVoid,dryBreak*0.15);
    // Settled green sheen is about sixty percent quieter than the initial treatment.
    ink+=uColor*wetEdge*(0.17+wet*0.25)*(0.76+paper*0.24);
    ink+=uBone*wetEdge*wet*0.025;
    float alpha=clamp(pigment+bleed,0.0,1.0)*front*uSceneMix*uStrokeOpacity;
    if(alpha<0.006)discard;
    gl_FragColor=vec4(ink*clamp(uLightIntensity,0.75,1.4),alpha);
  }
`;

export const inkTipVertex = `
  attribute float aAlong;
  attribute float aSeed;
  attribute float aSide;
  uniform float uHand;
  uniform float uTime;
  uniform float uInkTipDecay;
  uniform float uStrokeWidth;
  uniform float uStrokeSeed;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    float reached=uHand<=0.0?0.0:step(aAlong,uHand);
    float age=max(0.0,uHand-aAlong);
    float life=1.0-smoothstep(0.012,0.085,age);
    float decay=clamp(uInkTipDecay,0.0,1.0);
    vAlpha=reached*life*(1.0-decay);
    vSeed=aSeed;
    float drift=(age*4.0+decay*0.32);
    float phase=aSeed*31.0+uStrokeSeed*17.0;
    vec3 p=position;
    p.x+=aSide*uStrokeWidth*(0.35+drift*2.2)+sin(phase+uTime*0.35)*drift*0.12;
    p.y+=drift*(0.22+aSeed*0.6);
    p.z+=cos(phase)*drift*0.12;
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    gl_Position=projectionMatrix*mv;
    gl_PointSize=clamp((1.7+aSeed*3.2)*(1.0-decay*0.65)*7.0/max(1.0,-mv.z),0.75,4.6);
  }
`;

export const inkTipFragment = `
  uniform vec3 uColor;
  uniform vec3 uBone;
  uniform float uStrokeOpacity;
  uniform float uSceneMix;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    float d=length(gl_PointCoord-0.5);
    float feather=1.0-smoothstep(0.08,0.5,d);
    float alpha=feather*vAlpha*uStrokeOpacity*uSceneMix*0.40;
    if(alpha<0.004)discard;
    gl_FragColor=vec4(mix(uColor,uBone,vSeed*0.42),alpha);
  }
`;
