import { CanvasTexture,Color,DoubleSide,MeshPhysicalMaterial,RepeatWrapping,SRGBColorSpace,type IUniform,type Scene,type Texture } from 'three';
import { PALETTE } from '../../core/config';
import { relics } from '../../core/fixtures';

const seed=(index:number)=>{const value=Math.sin(index*91.73+31.19)*43758.5453;return value-Math.floor(value);};
const canvas=(width:number,height:number)=>{const element=document.createElement('canvas');element.width=width;element.height=height;const context=element.getContext('2d');if(!context)throw new Error('Canvas material preparation unavailable');return {element,context};};

/** Prepared once. Height, roughness and cord colour remain separate physical inputs. */
export function createSmithySurfaceTextures(){
  const weave=canvas(128,512),grain=canvas(256,256),fibre=canvas(256,512);
  weave.context.fillStyle=PALETTE.void;weave.context.fillRect(0,0,128,512);
  for(const direction of [-1,1])for(let row=-12;row<40;row++){
    const ctx=weave.context,y=row*25;
    ctx.globalAlpha=direction===1?.9:.7;ctx.strokeStyle=PALETTE.smoke;ctx.lineWidth=11;
    ctx.beginPath();ctx.moveTo(-70,y);ctx.lineTo(198,y+direction*180);ctx.stroke();
    ctx.globalAlpha=.09;ctx.strokeStyle=PALETTE.bone;ctx.lineWidth=.85;
    ctx.beginPath();ctx.moveTo(-70,y-4);ctx.lineTo(198,y+direction*180-4);ctx.stroke();
  }
  const g=grain.context;g.fillStyle=PALETTE.bone;g.fillRect(0,0,256,256);
  for(let i=0;i<14000;i++){g.globalAlpha=.03+seed(i+93)*.035;g.fillStyle=PALETTE.void;g.fillRect(seed(i+17)*256,seed(i+39)*256,.5+seed(i+123)*2,.35+seed(i+181)*.6);}
  const f=fibre.context;f.fillStyle=PALETTE.bone;f.fillRect(0,0,256,512);
  for(let i=0;i<10500;i++){f.globalAlpha=.018+seed(i+351)*.035;f.strokeStyle=PALETTE.void;f.lineWidth=.45;const x=seed(i+201)*256,y=seed(i+289)*512;f.beginPath();f.moveTo(x,y);f.lineTo(x+(seed(i+423)-.5)*2,y+1+seed(i+413)*8);f.stroke();}
  const wrap=new CanvasTexture(weave.element);wrap.colorSpace=SRGBColorSpace;wrap.wrapS=wrap.wrapT=RepeatWrapping;
  const roughness=new CanvasTexture(grain.element);roughness.wrapS=roughness.wrapT=RepeatWrapping;
  const paperFibre=new CanvasTexture(fibre.element);paperFibre.wrapS=paperFibre.wrapT=RepeatWrapping;
  return {wrap,roughness,paperFibre};
}

/** Real catalogue strings, system fonts and rice fibres; no generated or invented lettering. */
export function createCatalogueTexture(index:number){
  const {element,context:ctx}=canvas(512,896),relic=relics[index];
  ctx.fillStyle=PALETTE.bone;ctx.fillRect(0,0,512,896);
  for(let i=0;i<22000;i++){
    ctx.globalAlpha=.01+seed(i+index*57)*.035;ctx.fillStyle=PALETTE.void;
    ctx.fillRect(seed(i+71)*512,seed(i+209)*896,.4+seed(i+139)*1.5,.4+seed(i+293)*2.6);
  }
  ctx.globalAlpha=.6;ctx.strokeStyle=PALETTE.void;ctx.lineWidth=.8;ctx.strokeRect(25.5,25.5,461,845);
  const topShadow=ctx.createLinearGradient(0,0,0,64);topShadow.addColorStop(0,PALETTE.void);topShadow.addColorStop(1,PALETTE.bone);
  ctx.globalAlpha=.14;ctx.fillStyle=topShadow;ctx.fillRect(0,0,512,64);
  const lowerShadow=ctx.createLinearGradient(0,832,0,896);lowerShadow.addColorStop(0,PALETTE.bone);lowerShadow.addColorStop(1,PALETTE.void);
  ctx.fillStyle=lowerShadow;ctx.fillRect(0,832,512,64);
  ctx.globalAlpha=.86;ctx.fillStyle=PALETTE.void;ctx.font='12px monospace';ctx.fillText('GHOST HAND / STUDY',48,64);
  const lines=(text:string,font:string,top:number,lineHeight:number,width:number)=>{
    ctx.font=font;const words=text.split(/\s+/),rows:string[]=[];let row='';
    for(const word of words){const test=row?`${row} ${word}`:word;if(ctx.measureText(test).width>width&&row){rows.push(row);row=word;}else row=test;}
    if(row)rows.push(row);rows.forEach((text,i)=>ctx.fillText(text,48,top+i*lineHeight));return top+rows.length*lineHeight;
  };
  let bottom=lines(relic.title.replace(/^\d+\s*\/\s*/,''),'39px Georgia, serif',180,46,416);
  ctx.globalAlpha=.48;ctx.beginPath();ctx.moveTo(48,bottom+15);ctx.lineTo(464,bottom+15);ctx.stroke();
  ctx.globalAlpha=.75;bottom=lines(relic.material,'15px monospace',bottom+62,25,416);
  ctx.globalAlpha=.82;lines(relic.description,'22px Georgia, serif',bottom+68,32,416);
  ctx.globalAlpha=.55;ctx.font='11px monospace';ctx.fillText('LOCAL CATALOGUE STUDY',48,800);ctx.fillText('INTENT, NOT AN ORDER.',48,826);
  const texture=new CanvasTexture(element);texture.colorSpace=SRGBColorSpace;texture.anisotropy=4;return texture;
}

/** Photographic soft boxes are reflection inputs, never painted onto the room. */
export function createSmithyReflectionEnvironment(plate:Texture){
  const {element,context:ctx}=canvas(1024,512);
  ctx.fillStyle=PALETTE.void;ctx.fillRect(0,0,1024,512);
  if(plate.image)ctx.drawImage(plate.image as CanvasImageSource,0,0,1024,512);
  ctx.fillStyle=PALETTE.void;ctx.globalAlpha=.38;ctx.fillRect(0,0,1024,512);ctx.globalAlpha=1;
  const strip=(x:number,y:number,width:number,height:number,color:string,strength:number)=>{
    ctx.save();ctx.translate(x,y+height*.5);ctx.scale(width,height*.5);
    const glow=ctx.createRadialGradient(0,0,.015,0,0,1);
    glow.addColorStop(0,color);glow.addColorStop(.42,color);glow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.globalAlpha=strength;ctx.fillStyle=glow;ctx.fillRect(-1,-1,2,2);ctx.restore();
  };
  strip(195,55,155,330,PALETTE.bone,.98);strip(805,85,105,290,PALETTE.bone,.88);
  strip(625,180,60,190,PALETTE.candleDim,.36);
  ctx.globalAlpha=.8;const overhead=ctx.createRadialGradient(510,80,5,510,80,155);
  overhead.addColorStop(0,PALETTE.bone);overhead.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=overhead;ctx.fillRect(350,0,320,235);
  const texture=new CanvasTexture(element);texture.colorSpace=SRGBColorSpace;return texture;
}

/** Independent microsurface inputs for machined metal and mineral glaze. */
export function createRelicSurfaceTextures(){
  const metal=canvas(256,128),stone=canvas(256,256);
  metal.context.fillStyle=PALETTE.bone;metal.context.fillRect(0,0,256,128);
  for(let i=0;i<1800;i++){
    const ctx=metal.context;ctx.globalAlpha=.02+seed(i+127)*.12;ctx.strokeStyle=PALETTE.void;ctx.lineWidth=.3+seed(i+81)*.45;
    const y=seed(i+53)*128;ctx.beginPath();ctx.moveTo(seed(i+19)*210,y);ctx.lineTo(256,y+seed(i+78)*.5);ctx.stroke();
  }
  stone.context.fillStyle=PALETTE.bone;stone.context.fillRect(0,0,256,256);
  for(let i=0;i<6000;i++){
    stone.context.globalAlpha=.025+seed(i+927)*.11;stone.context.fillStyle=PALETTE.smoke;
    stone.context.fillRect(seed(i+101)*256,seed(i+233)*256,.6+seed(i+73)*2,.5+seed(i+49)*2);
  }
  const brushed=new CanvasTexture(metal.element),mineral=new CanvasTexture(stone.element);
  for(const texture of [brushed,mineral])texture.wrapS=texture.wrapT=RepeatWrapping;
  return {brushed,mineral};
}

export function createPaperMaterial(map:Texture,bump:Texture){
  const unroll:IUniform<number>={value:0};
  const material=new MeshPhysicalMaterial({color:new Color(PALETTE.bone).multiplyScalar(.86),map,bumpMap:bump,bumpScale:.018,roughness:.92,metalness:0,
    envMapIntensity:.3,side:DoubleSide,transparent:true,opacity:.78});
  material.name='GhostHandRicePaperPBR';
  material.onBeforeCompile=shader=>{
    shader.uniforms.uSmithyUnroll=unroll;
    shader.vertexShader=`uniform float uSmithyUnroll;\n${shader.vertexShader}`;
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
      float ghCurlN=.12+(1.0-uSmithyUnroll)*.65;
      float ghDy=3.3*max(.035,uSmithyUnroll);
      float ghDz=-6.0*pow(1.0-uv.y,5.0)*ghCurlN;
      float ghDx=cos(uv.x*3.14159)*3.14159*.018/2.15;
      objectNormal=normalize(vec3(-ghDx*ghDy,-ghDz,ghDy));`);
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      transformed.y=1.65-(1.0-uv.y)*3.3*max(.035,uSmithyUnroll);
      transformed.z+=pow(1.0-uv.y,6.0)*(.12+(1.0-uSmithyUnroll)*.65)+sin(uv.x*3.14159)*.018;`);
  };
  material.customProgramCacheKey=()=> 'ghosthand-rice-paper-curl-v8';
  return {material,unroll};
}

// Active owners form a small lease stack. An old overlap cannot restore a disposed environment.
const environments=new WeakMap<Scene,{base:Texture|null;owners:Map<symbol,Texture>}>();
const preparedEnvironments=new WeakMap<Scene,Map<symbol,{kind:'COMMISSION'|'OATH';texture:Texture}>>();
export function prepareSmithyEnvironment(scene:Scene,owner:symbol,kind:'COMMISSION'|'OATH',texture:Texture){
  let state=preparedEnvironments.get(scene);if(!state){state=new Map();preparedEnvironments.set(scene,state);}state.set(owner,{kind,texture});
}
export function getPreparedSmithyEnvironment(scene:Scene,kind:'COMMISSION'|'OATH'){
  const state=preparedEnvironments.get(scene);return state?[...state.values()].findLast(value=>value.kind===kind)?.texture??null:null;
}
export function claimSmithyEnvironment(scene:Scene,owner:symbol,texture:Texture){
  let state=environments.get(scene);if(!state){state={base:scene.environment,owners:new Map()};environments.set(scene,state);}
  state.owners.delete(owner);state.owners.set(owner,texture);scene.environment=texture;
}
export function releaseSmithyEnvironment(scene:Scene,owner:symbol){
  const prepared=preparedEnvironments.get(scene);prepared?.delete(owner);if(prepared?.size===0)preparedEnvironments.delete(scene);
  const state=environments.get(scene);if(!state)return;const texture=state.owners.get(owner);state.owners.delete(owner);
  if(scene.environment===texture)scene.environment=[...state.owners.values()].at(-1)??state.base;
  if(!state.owners.size)environments.delete(scene);
}
