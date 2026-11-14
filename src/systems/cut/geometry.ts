import { Matrix4,Quaternion,Vector3 } from 'three';

export type CutScene='PURSUIT'|'MERGE'|'FORK'|'CHAINS_HOLD';
export interface CutData {
  scene:CutScene;mode:number;bars:number;matrices:Float32Array;kind:Float32Array;side:Float32Array;along:Float32Array;seed:Float32Array;
  particlePositions:Float32Array;particleKind:Float32Array;particleSide:Float32Array;particleSeed:Float32Array;
}
export function cutSeed(index:number){const n=Math.sin(index*127.1+73.7)*43758.5453;return n-Math.floor(n);}

/** Authored deterministic field data. Kinds 3/4 form a sword only in Pursuit/Merge. */
export function buildCutData(scene:CutScene):CutData {
  const mode={PURSUIT:1,MERGE:2,FORK:3,CHAINS_HOLD:4}[scene];
  const transforms:number[]=[],kinds:number[]=[],sides:number[]=[],alongs:number[]=[],seeds:number[]=[];
  const matrix=new Matrix4(),rotation=new Quaternion(),axis=new Vector3(0,1,0);
  const add=(position:[number,number,number],scale:[number,number,number],kind:number,side=0,along=0)=>{
    matrix.compose(new Vector3(...position),rotation.identity(),new Vector3(...scale)).toArray(transforms,transforms.length);
    kinds.push(kind);sides.push(side);alongs.push(along);seeds.push(cutSeed(kinds.length+mode*89));
  };
  const line=(a:[number,number,number],b:[number,number,number],width:number,kind:number,side=0,along=0)=>{
    const from=new Vector3(...a),to=new Vector3(...b),dir=to.clone().sub(from),length=dir.length();
    rotation.setFromUnitVectors(axis,dir.normalize());
    matrix.compose(from.add(to).multiplyScalar(.5),rotation,new Vector3(width,length,width)).toArray(transforms,transforms.length);
    kinds.push(kind);sides.push(side);alongs.push(along);seeds.push(cutSeed(kinds.length+mode*89));
  };
  const blade=()=>{
    for(let i=0;i<24;i++){
      const t=(i+.5)/24;
      add([0,-1.15+t*3.15,0],[.025*(1-t*.67),3.15/24*1.025,.016],3,0,t);
    }
    add([0,-1.2,0],[.42,.04,.07],4,0,.2);
    add([0,-1.53,0],[.075,.62,.07],4,0,.35);
    for(let i=0;i<5;i++)add([0,-1.32-i*.105,.043],[.082,.018,.015],4,0,.65+i*.07);
    add([0,-1.89,0],[.09,.09,.08],4,0,1);
  };
  if(scene==='PURSUIT'){
    blade();
    for(let i=0;i<36;i++){
      const angle=cutSeed(i+10)*Math.PI*2,r=2.5+cutSeed(i+41)*8;
      add([Math.cos(angle)*r,Math.sin(angle)*r,-7-cutSeed(i+73)*35],[.007+cutSeed(i+34)*.012,.007,.4+cutSeed(i+65)*2.5],1,0,i/36);
    }
  }else if(scene==='MERGE'){
    blade();
    // A seam of light under the palm; this is a graphic line, not another sword.
    add([0,0,-5.8],[.007,10,.009],5,0,.5);
  }else if(scene==='FORK'){
    for(const side of [-1,1]){
      const inner=.08,outer=5.7;
      line([side*inner,-3.25,-6.5],[side*inner,3.25,-6.5],.018,1,side,.1);
      line([side*inner,3.25,-6.5],[side*outer,3.25,-6.5],.014,1,side,.95);
      line([side*outer,3.25,-6.5],[side*outer,-3.25,-6.5],.014,1,side,.7);
      line([side*outer,-3.25,-6.5],[side*inner,-3.25,-6.5],.014,1,side,.9);
      if(side<0){
        for(let row=0;row<7;row++){
          const y=-2.5+row*.79;
          line([-.45,y,-6.65],[-5.3,y+.52,-6.65],.011,1,side,row/7);
        }
      }else{
        for(let strand=0;strand<9;strand++){
          const x=.5+strand*.56;
          for(let link=0;link<7;link++){
            const y=-2.7+link*.82,dx=(link%2?1:-1)*.12;
            line([x,y,-6.6],[x+dx,y+.38,-6.6],.021,2,side,link/7);
            line([x+dx,y+.38,-6.6],[x,y+.76,-6.6],.021,2,side,(link+.5)/7);
          }
        }
      }
    }
    add([0,0,-6.35],[.012,8,.015],5,0,.5);
  }else{
    add([0,-3.25,-11],[28,.06,35],0,0,.1);
    add([0,0,-12],[25,11,.08],0,0,.05);
    for(const side of [-1,1]){
      add([side*7,0,-8],[.09,10,18],0,side,.1);
      for(let strand=0;strand<7;strand++){
        const x=side*(2.6+strand*.6);
        for(let link=0;link<6;link++){
          const y=-3+link*1.05,dx=(link%2?1:-1)*.1;
          line([x,y,-8.8],[x+dx,y+.47,-8.8],.025,2,side,link/6);
          line([x+dx,y+.47,-8.8],[x,y+.94,-8.8],.025,2,side,(link+.5)/6);
        }
      }
    }
    // One physical doorway. Its threshold is reached through the shared PASS/scroll spine.
    add([0,-.55,-10],[2.3,4.9,.08],0,0,.2);
    line([-1.15,-3,-9.94],[-1.15,1.9,-9.94],.023,1,0,.3);
    line([-1.15,1.9,-9.94],[1.15,1.9,-9.94],.023,1,0,.3);
    line([1.15,1.9,-9.94],[1.15,-3,-9.94],.023,1,0,.3);
    line([-1.15,-3,-9.94],[1.15,-3,-9.94],.016,1,0,.3);
  }
  const count=scene==='FORK'?512:scene==='PURSUIT'?384:scene==='MERGE'?192:128;
  const particlePositions=new Float32Array(count*3),particleKind=new Float32Array(count),particleSide=new Float32Array(count),particleSeed=new Float32Array(count);
  for(let i=0;i<count;i++){
    const s=cutSeed(i+mode*173),side=i%2?-1:1;
    if(scene==='FORK'){
      particlePositions.set([side*(.1+cutSeed(i+31)*5.5),(cutSeed(i+61)-.5)*6.3,-6.5],i*3);
      particleKind[i]=2;particleSide[i]=side;
    }else if(scene==='PURSUIT'){
      const angle=cutSeed(i+19)*Math.PI*2,r=2+cutSeed(i+37)*11;
      particlePositions.set([Math.cos(angle)*r,Math.sin(angle)*r,-5-cutSeed(i+67)*46],i*3);
      particleKind[i]=0;
    }else if(scene==='MERGE'){
      particlePositions.set([(cutSeed(i+19)-.5)*7,(cutSeed(i+37)-.5)*6,-5.8-cutSeed(i+67)*4],i*3);
      particleKind[i]=1;
    }else{
      particlePositions.set([(cutSeed(i+19)-.5)*15,(cutSeed(i+37)-.5)*8,-5-cutSeed(i+67)*10],i*3);
      particleKind[i]=3;particleSide[i]=side;
    }
    particleSeed[i]=s;
  }
  return {scene,mode,bars:kinds.length,matrices:new Float32Array(transforms),kind:new Float32Array(kinds),side:new Float32Array(sides),along:new Float32Array(alongs),seed:new Float32Array(seeds),particlePositions,particleKind,particleSide,particleSeed};
}
