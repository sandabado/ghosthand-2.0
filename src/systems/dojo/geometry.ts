import { Matrix4,Quaternion,Vector3 } from 'three';

export const DOJO_SCROLLS = [
  {position:[-3.15,.15,-2] as [number,number,number],yaw:.12},
  {position:[3.15,.15,-2] as [number,number,number],yaw:-.12},
  {position:[-3.45,.35,-6] as [number,number,number],yaw:.17},
  {position:[3.45,.35,-6] as [number,number,number],yaw:-.17},
  {position:[-3.15,.5,-10] as [number,number,number],yaw:.12},
  {position:[3.15,.5,-10] as [number,number,number],yaw:-.12},
] as const;

export function dojoSeed(index:number){const n=Math.sin(index*127.1+19.19)*43758.5453;return n-Math.floor(n);}

/** The guide moves between authored stations, rather than becoming another camera verb. */
export function dojoWaypoint(focus:number):[number,number,number]{
  const at=Number.isFinite(focus)?Math.max(0,Math.min(5,focus)):0;
  const from=Math.floor(at),to=Math.min(5,from+1),mix=at-from;
  const station=(i:number):[number,number,number]=>[(i%2?1:-1)*1.8,.15,-.7-Math.floor(i/2)*4];
  const a=station(from),b=station(to);
  return [a[0]+(b[0]-a[0])*mix,a[1],a[2]+(b[2]-a[2])*mix];
}

export interface DojoData {
  bars:number;matrices:Float32Array;kind:Float32Array;seed:Float32Array;station:Float32Array;
  particlePositions:Float32Array;particleKind:Float32Array;particleSeed:Float32Array;
}

/** Authored stone, light carvings, and a small outlined guide hand. No sword geometry. */
export function buildDojoData():DojoData {
  const transforms:number[]=[],kinds:number[]=[],seeds:number[]=[],stations:number[]=[];
  const matrix=new Matrix4(),rotation=new Quaternion(),axis=new Vector3(0,1,0);
  const put=(position:[number,number,number],scale:[number,number,number],kind:number,station=-1,yaw=0)=>{
    rotation.setFromAxisAngle(axis,yaw);
    matrix.compose(new Vector3(...position),rotation,new Vector3(...scale)).toArray(transforms,transforms.length);
    kinds.push(kind);stations.push(station);seeds.push(dojoSeed(kinds.length));
  };
  const line=(a:[number,number,number],b:[number,number,number],width:number,kind:number,station=-1)=>{
    const from=new Vector3(...a),to=new Vector3(...b),direction=to.clone().sub(from),length=direction.length();
    rotation.setFromUnitVectors(axis,direction.normalize());
    matrix.compose(from.add(to).multiplyScalar(.5),rotation,new Vector3(width,length,width)).toArray(transforms,transforms.length);
    kinds.push(kind);stations.push(station);seeds.push(dojoSeed(kinds.length));
  };
  // A dark, heavy room: the lit grooves reveal its depth without adding new hues.
  put([0,-2.65,-5],[15,.25,30],0);
  put([0,4.55,-6],[15,.2,28],0);
  for(const side of [-1,1]){
    put([side*7,.8,-6],[.25,7,28],0);
    for(let row=0;row<5;row++){
      const z=4-row*4.5;
      put([side*5.9,.9,z],[.4,7,.4],0);
      put([side*5.68,.9,z+.18],[.018,6.6,.02],1);
      put([side*5.9,-2.3,z],[.64,.35,.64],0);
      put([0,4.08,z],[12.2,.28,.4],0);
      put([0,3.92,z+.2],[12,.014,.02],1);
    }
    // Thin shoji-like lattice belongs to the architecture, not a lateral interface.
    for(let i=0;i<12;i++)put([side*6.75,.5,2-i*1.35],[.1,5,.03],2);
    for(let i=0;i<5;i++)put([side*6.72,-1.8+i*1.1,-5.5],[.1,.025,16],2);
  }
  put([0,1,-15],[14,7.1,.25],0);
  for(let i=0;i<15;i++)put([-5.7+i*.82,1,-14.8],[.025,5.6,.025],2);
  for(let i=0;i<8;i++)put([0,-1.45+i*.72,-14.78],[12,.02,.02],2);
  // A six-station hall: each scroll hangs from its own rods and fine cords.
  DOJO_SCROLLS.forEach(({position,yaw},index)=>{
    const [x,y,z]=position;
    for(const side of [-1,1]){
      const xx=x+side*1.04*Math.cos(yaw),zz=z-side*1.04*Math.sin(yaw);
      line([xx,y+1.9,zz],[xx,4,zz],.012,2,index);
      put([xx,y-1.92,zz],[.12,.12,.17],2,index,yaw);
    }
    for(const offset of [-1.83,1.83]){
      put([x,y+offset,z],[2.2,.1,.14],0,index,yaw);
      put([x,y+offset-.01,z+.084],[2.08,.016,.018],1,index,yaw);
    }
    // Discrete floor station: a broken circle keeps the path visible from above.
    for(let j=0;j<18;j++){
      if(j%6===0)continue;
      const a=j/18*Math.PI*2,b=(j+.78)/18*Math.PI*2;
      line([x+Math.cos(a)*.62,-2.505,z+.8+Math.sin(a)*.62],[x+Math.cos(b)*.62,-2.505,z+.8+Math.sin(b)*.62],.012,1,index);
    }
  });
  // One offering stone, its illuminated terms represented by authored carved marks.
  put([0,-2.23,-10],[2.8,.55,2.2],0);
  put([0,-1.9,-10],[3.35,.18,2.6],0);
  put([0,-1.78,-10],[3.12,.08,2.36],0);
  for(const side of [-1,1]){
    put([side*1.5,-1.73,-10],[.012,.012,2.15],1);
    put([0,-1.73,-10+side*1.05],[3,.012,.012],1);
  }
  for(let column=0;column<6;column++)for(let row=0;row<5;row++){
    const x=-1.13+column*.45,z=-10.82+row*.36;
    put([x,-1.728,z],[.2,.009,.018],6);
    put([x+(column%2?.06:-.06),-1.728,z-.06],[.016,.009,.14],6);
    if((column+row)%2===0)put([x,-1.728,z+.065],[.15,.009,.014],6);
  }
  // The floating seal is local to the dais. Its impact never paints the chamber red.
  put([0,-.74,-9.63],[.36,.55,.36],4);
  put([0,-1.06,-9.63],[.62,.15,.62],4);
  put([0,-.42,-9.63],[.46,.1,.46],4);
  for(const side of [-1,1]){
    put([side*.28,-1.975,-8.673],[.018,.48,.014],5);
    put([0,-1.975+side*.24,-8.673],[.56,.018,.014],5);
  }
  // A hand-like stamp, deliberately authored rather than copied from generated lettering.
  line([-.15,-1.87,-8.66],[.15,-1.83,-8.66],.023,5);
  line([-.16,-1.97,-8.66],[.16,-1.97,-8.66],.023,5);
  line([-.2,-2.06,-8.66],[.2,-2.06,-8.66],.023,5);
  line([.02,-1.82,-8.66],[.02,-2.15,-8.66],.025,5);
  line([.02,-2.15,-8.66],[-.07,-2.12,-8.66],.023,5);
  // A small spectral hand escorts the currently focused scroll.
  const hand:[number,number][]=[[-.18,-.42],[-.24,-.08],[-.4,.1],[-.5,.14],[-.51,.23],[-.44,.28],[-.22,.1],[-.22,.62],[-.18,.71],[-.1,.69],[-.09,.29],[-.03,.86],[.03,.92],[.1,.86],[.08,.29],[.18,.75],[.25,.8],[.3,.72],[.23,.18],[.35,.53],[.43,.55],[.47,.45],[.32,-.08],[.23,-.42],[-.18,-.42]];
  for(let i=1;i<hand.length;i++)line([hand[i-1][0],hand[i-1][1],0],[hand[i][0],hand[i][1],0],.016,3);
  line([-.13,-.05,0],[.11,.06,0],.009,3);
  line([-.12,-.13,0],[.16,-.05,0],.009,3);
  line([-.06,-.32,0],[.08,-.12,0],.009,3);

  const count=384,particlePositions=new Float32Array(count*3),particleKind=new Float32Array(count),particleSeed=new Float32Array(count);
  for(let i=0;i<count;i++){
    const ritual=i>=288;
    const seed=dojoSeed(i+301),angle=dojoSeed(i+411)*Math.PI*2;
    particlePositions.set(ritual?[Math.cos(angle)*(.12+seed*.85),dojoSeed(i+509)*.5,Math.sin(angle)*(.12+seed*.85)]:[(dojoSeed(i+51)-.5)*11,-2.2+dojoSeed(i+139)*6.2,4-dojoSeed(i+223)*18],i*3);
    particleKind[i]=ritual?1:0;particleSeed[i]=seed;
  }
  return {bars:kinds.length,matrices:new Float32Array(transforms),kind:new Float32Array(kinds),seed:new Float32Array(seeds),station:new Float32Array(stations),particlePositions,particleKind,particleSeed};
}
