import { Matrix4,Quaternion,Vector3 } from 'three';

export type SmithyScene='COMMISSION'|'OATH';
export const SMITHY_PAPERS=[
  {position:[1.0,.25,-6.4] as [number,number,number],yaw:.12},
  {position:[3.65,.45,-7.8] as [number,number,number],yaw:-.08},
  {position:[6.1,.7,-9.5] as [number,number,number],yaw:-.16},
] as const;
export function smithySeed(index:number){const value=Math.sin(index*91.73+31.19)*43758.5453;return value-Math.floor(value);}
export interface SmithyData {
  bars:number;matrices:Float32Array;kind:Float32Array;seed:Float32Array;station:Float32Array;
  paperSheets:number;particlePositions:Float32Array;particleTargets:Float32Array;particleKind:Float32Array;particleSeed:Float32Array;
}

/** Authored stone, paper supports and a closed resting stand; full swords are separate meshes. */
export function buildSmithyData(scene:SmithyScene):SmithyData {
  const matrices:number[]=[],kind:number[]=[],seed:number[]=[],station:number[]=[];
  const matrix=new Matrix4(),rotation=new Quaternion(),up=new Vector3(0,1,0);
  const put=(position:[number,number,number],scale:[number,number,number],role=0,at=-1,yaw=0)=>{
    rotation.setFromAxisAngle(up,yaw);matrix.compose(new Vector3(...position),rotation,new Vector3(...scale)).toArray(matrices,matrices.length);
    kind.push(role);station.push(at);seed.push(smithySeed(kind.length));
  };
  put([0,-2.65,-5],[18,.28,28]);
  if(scene==='COMMISSION'){
    put([0,4.5,-6],[17,.25,27]);put([0,.9,-15.5],[17,7.3,.25]);
    for(const side of [-1,1]){
      for(let row=0;row<4;row++){
        const z=2-row*5;
        put([side*6.9,.7,z],[.46,7,.46]);put([side*6.9,-2.28,z],[.76,.5,.76]);
        put([0,3.94,z],[14.4,.3,.5]);put([0,3.75,z+.24],[14.1,.018,.025],1);
        put([side*6.64,.8,z],[.018,5.7,.04],1);
      }
      for(let row=0;row<8;row++)put([side*7.65,.35,2-row*2.1],[.045,5.9,.045],2);
      for(let row=0;row<5;row++)put([side*7.62,-1.8+row*1.16,-5.5],[.045,.025,18],2);
    }
    // Anvil and workstone retain a quiet green/bone forge light.
    put([2.3,-2.27,-5.4],[2.1,.7,1.7]);put([2.3,-1.86,-5.4],[1.3,.5,1.1]);
    put([2.3,-1.55,-5.4],[3.5,.28,1.9]);put([2.3,-1.39,-5.4],[3.9,.07,2.1]);
    for(let row=0;row<8;row++)put([2.3,-1.345,-6.2+row*.22],[3.35,.008,.012],1);
    SMITHY_PAPERS.forEach(({position:[x,y,z],yaw},index)=>{
      for(const side of [-1,1]){
        const xx=x+side*1.1*Math.cos(yaw),zz=z-side*1.1*Math.sin(yaw);
        put([xx,2.95+(y-.25)*.5,zz],[.012,2.2-(y-.25),.012],2,index);
      }
      put([x,y+1.72,z],[2.35,.09,.14],2,index,yaw);
      put([x,y-1.72,z],[2.35,.1,.15],4,index,yaw);
      put([x,y+1.68,z+.08],[2.1,.012,.016],1,index,yaw);
    });
    for(let i=0;i<11;i++){
      put([-6+i*1.2,.5,-15.33],[.025,5.6,.025],2);
      if(i<7)put([0,-1.4+i*.75,-15.3],[13,.018,.025],2);
    }
  }else{
    // Two low cradles support a completely covered blade. The room recedes at the ending.
    put([.15,-2.48,-4.5],[6.8,.16,2.35]);put([.15,-2.36,-4.5],[6.45,.08,2.0]);
    for(const x of [-1.75,1.85]){
      put([x,-1.91,-4.5],[.15,1.05,.32],3);put([x,-1.37,-4.5],[.5,.1,.36],3);
      put([x-.21,-1.24,-4.5],[.075,.2,.32],3);put([x+.21,-1.24,-4.5],[.075,.2,.32],3);
      put([x,-2.34,-4.5],[.76,.12,.74],3);put([x,-2.27,-4.11],[.54,.012,.012],1);
    }
    for(let i=0;i<6;i++)put([0,-2.273,-5.25+i*.27],[5.9,.006,.012],1);
    for(const side of [-1,1]){
      put([side*7,1,-10],[.25,7,.25]);put([side*6.85,1,-9.87],[.018,6.2,.018],1);
    }
  }
  const count=scene==='COMMISSION'?320:288;
  const particlePositions=new Float32Array(count*3),particleTargets=new Float32Array(count*3),particleKind=new Float32Array(count),particleSeed=new Float32Array(count);
  // A small authored hand outline; supplied canonical artwork remains a separate input.
  const hand=[[-.22,-.5],[-.3,-.13],[-.5,.05],[-.54,.18],[-.44,.24],[-.22,.08],[-.22,.62],[-.15,.72],[-.07,.67],[-.08,.27],[-.02,.85],[.05,.93],[.12,.84],[.08,.27],[.2,.76],[.28,.8],[.34,.71],[.23,.18],[.38,.5],[.46,.51],[.49,.4],[.31,-.1],[.22,-.5],[-.22,-.5]];
  for(let i=0;i<count;i++){
    const k=smithySeed(i+107),a=smithySeed(i+233)*Math.PI*2;
    particlePositions.set([(smithySeed(i+47)-.5)*12,-2.3+smithySeed(i+83)*6,4-smithySeed(i+139)*19],i*3);
    if(scene==='COMMISSION'&&i>=256){
      particleKind[i]=1;particleTargets.set([2.2+Math.cos(a)*k*.8,-1.25+k*.6,-4.6+Math.sin(a)*k*.8],i*3);
    }else if(scene==='OATH'&&i>=96){
      particleKind[i]=2;const at=((i-96)/192)*(hand.length-1),n=Math.floor(at),f=at-n;
      particleTargets.set([(hand[n][0]+(hand[Math.min(n+1,hand.length-1)][0]-hand[n][0])*f)*1.8,1.0+(hand[n][1]+(hand[Math.min(n+1,hand.length-1)][1]-hand[n][1])*f)*1.8,-4.3],i*3);
    }else particleTargets.set(particlePositions.subarray(i*3,i*3+3),i*3);
    particleSeed[i]=k;
  }
  return {bars:kind.length,matrices:new Float32Array(matrices),kind:new Float32Array(kind),seed:new Float32Array(seed),station:new Float32Array(station),paperSheets:scene==='COMMISSION'?3:0,particlePositions,particleTargets,particleKind,particleSeed};
}

export interface SwordProfile {positions:Float32Array;uv:Float32Array;indices:Uint16Array;sheathed:boolean;closed:true;rings:number;sectionSize:number}
/** A closed bevelled profile. Oath generates only the scabbard, with no blade hidden inside it. */
export function buildSwordProfile(sheathed:boolean):SwordProfile {
  const positions:number[]=[],uv:number[]=[],indices:number[]=[],rings=37,sectionSize=8;
  const section=[[-.72,-1],[.72,-1],[1,-.66],[1,.66],[.72,1],[-.72,1],[-1,.66],[-1,-.66]];
  for(let i=0;i<rings;i++){
    const t=sheathed?(i<=30?i/30*.95:.95+(i-30)/6*.05):i/(rings-1);
    const nose=(t-.95)/.05;
    const tip=sheathed?(t>.95?Math.sqrt(Math.max(.0196,1-nose*nose)):1):Math.max(.025,Math.min(1,(1-t)*9));
    const curve=.035*t+.24*t*t;
    for(let j=0;j<sectionSize;j++){
      const [y,z]=section[j];positions.push(.13+t*4.4,curve+y*(sheathed?.115:.078)*tip,z*(sheathed?.075:.025)*tip);uv.push(t,j/sectionSize);
      if(i<rings-1){const a=i*sectionSize+j,b=i*sectionSize+(j+1)%sectionSize,c=a+sectionSize,d=b+sectionSize;indices.push(a,b,c,b,d,c);}
    }
  }
  const start=positions.length/3;positions.push(.13,0,0);uv.push(0,.5);
  const end=positions.length/3;positions.push(4.53,.275,0);uv.push(1,.5);
  for(let j=0;j<sectionSize;j++){indices.push(start,(j+1)%sectionSize,j);const a=(rings-1)*sectionSize+j,b=(rings-1)*sectionSize+(j+1)%sectionSize;indices.push(end,a,b);}
  return {positions:new Float32Array(positions),uv:new Float32Array(uv),indices:new Uint16Array(indices),sheathed,closed:true,rings,sectionSize};
}
