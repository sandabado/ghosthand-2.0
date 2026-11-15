import { Color,DoubleSide,Mesh,MeshBasicMaterial,MeshPhysicalMaterial,PlaneGeometry,PMREMGenerator,Scene,type Texture,type WebGLRenderer,type WebGLRenderTarget } from 'three';
import { PALETTE } from '../../core/config';

/** One cord wrap and metal finish follow the sword through every scene. */
export function createCeremonyGripMaterial(wrap:Texture){
  wrap.repeat.set(1,1.3);
  const material=new MeshPhysicalMaterial({color:new Color(PALETTE.bone).multiplyScalar(.7),map:wrap,bumpMap:wrap,bumpScale:.006,metalness:.02,roughness:.82,envMapIntensity:.55,sheen:.2,sheenColor:new Color(PALETTE.bone).multiplyScalar(.2),sheenRoughness:.85,transparent:true});
  material.name='GhostHandSingleWrappedTsuka';return material;
}

export function createCeremonyFittingsMaterial(){
  const material=new MeshPhysicalMaterial({color:new Color(PALETTE.bone).multiplyScalar(.34),metalness:.98,roughness:.22,envMapIntensity:1.6,emissive:PALETTE.candleDim,emissiveIntensity:.018,clearcoat:.22,clearcoatRoughness:.23,transparent:true});
  material.name='GhostHandPiercedTsubaAndFlushHabaki';return material;
}

/** The same emerald steel can charge toward white without changing identity. */
export function createCeremonyBladeMaterial(roughness:Texture,destination:string=PALETTE.flash){
  const white={value:0},core={value:.18},green={value:new Color(PALETTE.candle)},whiteColor={value:new Color(destination)};
  const material=new MeshPhysicalMaterial({color:new Color(PALETTE.bone).multiplyScalar(.32),metalness:.96,roughness:.24,anisotropy:.72,anisotropyRotation:Math.PI/2,envMapIntensity:1.35,bumpMap:roughness,bumpScale:.00065,emissive:PALETTE.candle,emissiveIntensity:1,clearcoat:.18,clearcoatRoughness:.24,flatShading:true,transparent:true});
  material.name='GhostHandContinuousEmeraldKatana';
  material.onBeforeCompile=shader=>{
    shader.uniforms.uMergeWhite=white;shader.uniforms.uMergeCore=core;shader.uniforms.uMergeGreen=green;shader.uniforms.uMergeWhiteColor=whiteColor;
    shader.vertexShader=`varying float vMergeAcross;varying vec2 vMergeUv;\n${shader.vertexShader}`;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float ghTip=max(.025,min(1.0,(1.0-uv.x)*9.0));
      vMergeAcross=(position.y-(.035*uv.x+.24*uv.x*uv.x))/(.078*ghTip);vMergeUv=uv;`);
    shader.fragmentShader=`varying float vMergeAcross;varying vec2 vMergeUv;uniform float uMergeWhite;uniform float uMergeCore;uniform vec3 uMergeGreen;uniform vec3 uMergeWhiteColor;
      float ghTemperLine(float along){return .51+sin(along*23.0)*.032+sin(along*61.0+.6)*.012;}
      float ghHamon(){return 1.0-smoothstep(.012,.06,abs(vMergeAcross-ghTemperLine(vMergeUv.x)));}\n${shader.fragmentShader}`;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      diffuseColor.rgb*=mix(.76,1.18,smoothstep(-.8,.65,vMergeAcross));
      diffuseColor.rgb+=vec3(.016)*ghHamon();`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      roughnessFactor=clamp(roughnessFactor+smoothstep(.55,.9,vMergeAcross)*.035-ghHamon()*.055,.12,.38);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      float ghEdge=smoothstep(.66,.98,vMergeAcross),ghSpine=smoothstep(.86,1.0,-vMergeAcross)*.13;
      vec3 ghLight=mix(uMergeGreen,uMergeWhiteColor,uMergeWhite);
      vec3 ghCore=ghLight*uMergeCore*(.72+ghHamon()*.28);
      totalEmissiveRadiance=ghCore+ghLight*(ghEdge*1.45+ghSpine);`);
  };
  material.customProgramCacheKey=()=> 'ghosthand-faceted-emerald-katana';
  return {material,white,core,green,whiteColor};
}

// One bounded studio reflection is prepared during the idle opening and reused
// by the later Merge. It belongs to this renderer, never to scene.environment.
const studios=new WeakMap<WebGLRenderer,WebGLRenderTarget>();
export function prepareCeremonyStudio(renderer:WebGLRenderer){
  const cached=studios.get(renderer);if(cached)return cached.texture;
  const studio=new Scene();studio.background=new Color(PALETTE.void).multiplyScalar(.35);
  const geometry=new PlaneGeometry(1,1),materials:MeshBasicMaterial[]=[];
  const panel=(x:number,y:number,z:number,width:number,height:number,color:string,strength:number)=>{
    const material=new MeshBasicMaterial({color:new Color(color).multiplyScalar(strength),side:DoubleSide,toneMapped:false});materials.push(material);
    const mesh=new Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(width,height,1);mesh.lookAt(0,0,0);studio.add(mesh);
  };
  panel(-2.8,1.8,3.2,.55,5.7,PALETTE.bone,4.2);
  panel(3.3,.6,2.3,.75,4.6,PALETTE.bone,2.8);
  panel(.2,4.1,-.5,5.0,.65,PALETTE.bone,2.1);
  panel(.1,-1.6,3.8,4.5,.8,PALETTE.bone,.35);
  panel(-3.8,.8,-1.0,.38,5.0,PALETTE.candle,1.2);
  panel(0,.5,-4.2,3.6,3.8,PALETTE.smoke,.45);
  const generator=new PMREMGenerator(renderer);
  try{
    // This installed Three release clamps every PMREM to at least 256px.
    const target=generator.fromScene(studio,0,.1,20,{size:256});studios.set(renderer,target);return target.texture;
  }finally{generator.dispose();geometry.dispose();for(const material of materials)material.dispose();studio.clear();}
}
export function releaseCeremonyStudio(renderer:WebGLRenderer){const target=studios.get(renderer);if(target){studios.delete(renderer);target.dispose();}}
