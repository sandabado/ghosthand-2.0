import { Matrix4, Quaternion, Vector3 } from 'three';

export interface GateData {
  gate:number; bars:number; matrices:Float32Array; kind:Float32Array;
  channel:Float32Array; along:Float32Array; seed:Float32Array;
  particlePositions:Float32Array; particleSeed:Float32Array; particleChannel:Float32Array;
}
export function gateSeed(index:number){const value=Math.sin(index*127.1+47.3)*43758.5453;return value-Math.floor(value);}

/** Deterministic unit-box instances. All continuous movement belongs to the shared uniforms. */
export function buildGateData(requestedGate:number):GateData {
  const gate=Math.max(1,Math.min(4,Math.round(requestedGate)||1));
  const transforms:number[]=[],kinds:number[]=[],channels:number[]=[],distances:number[]=[],seeds:number[]=[];
  const matrix=new Matrix4(),rotation=new Quaternion(),up=new Vector3(0,1,0);
  const add=(position:[number,number,number],scale:[number,number,number],kind=0,channel=0,along=0)=>{
    matrix.compose(new Vector3(...position),rotation.identity(),new Vector3(...scale)).toArray(transforms,transforms.length);
    kinds.push(kind);channels.push(channel);distances.push(along);seeds.push(gateSeed(kinds.length+gate*101));
  };
  const line=(a:[number,number,number],b:[number,number,number],width:number,kind=1,channel=0,along=0)=>{
    const from=new Vector3(...a),to=new Vector3(...b),direction=to.clone().sub(from),length=direction.length();
    rotation.setFromUnitVectors(up,direction.normalize());
    matrix.compose(from.add(to).multiplyScalar(.5),rotation,new Vector3(width,length,width)).toArray(transforms,transforms.length);
    kinds.push(kind);channels.push(channel);distances.push(along);seeds.push(gateSeed(kinds.length+gate*101));
  };
  add([1.7,-3.55,-15],[35,.06,65],0,0,0);
  // Three architectural thresholds give the existing PASS dolly a physical depth cue.
  for(const [depth,z] of [-7.8,-18,-31].entries()){
    const center=1.65,half=3.15;
    for(const side of [-1,1]){
      add([center+side*half,-.15,z],[.27,6.9,.42],0,0,.1);
      add([center+side*(half-.14),-.15,z+.23],[.014,6.7,.012],0,0,.98);
    }
    add([center,2.45,z],[7,.23,.6],0,0,.1);
    add([center,3.15,z],[7.75,.24,.7],0,0,.1);
    add([center,3.015,z+.37],[7.7,.018,.012],0,0,.98);
    add([center,2.78,z+.05],[.8,.65,.45],0,0,.25);
    for(let i=0;i<6;i++)add([center+(i-2.5)*.9,-3.49,z-4-depth],[.018,.01,5],0,0,.96);
  }
  if(gate===1){
    // Three interlaced directions are assigned to the three accepted strands.
    for(let layer=0;layer<3;layer++)for(let row=0;row<5;row++){
      const offset=(row-2)*.48,z=-5.9-layer*.33;
      if(layer===0)line([1.35,offset-.1,z],[4.1,offset-.1,z],.024,1,layer,row/4);
      else if(layer===1)line([2.72+offset,-1.25,z],[2.72+offset,1.05,z],.021,1,layer,row/4);
      else line([1.65+offset*.4,-1.2,z],[3.7+offset*.4,1.05,z],.018,1,layer,row/4);
    }
    add([2.72,-1.69,-6.5],[3.55,.21,2.2],0,0,.2);
    add([2.72,-1.57,-6.1],[2.8,.025,1.45],0,0,.98);
  }else if(gate===2){
    add([2.75,-.05,-6.1],[4.1,3.15,.16],0,0,.2);
    for(let row=0;row<14;row++){
      const indent=row%4===0?.32:row%3===0?.58:0;
      for(let chunk=0;chunk<3;chunk++){
        const width=.26+gateSeed(row*7+chunk+3)*.55;
        add([1.3+indent+chunk*.69+width*.5,1.16-row*.18,-5.99],[width,.018,.018],1,row%3,(row*3+chunk)/42);
      }
    }
    add([2.75,-1.47,-5.96],[3.76,.025,.018],1,0,1);
  }else if(gate===3){
    const center:[number,number,number]=[2.78,-.05,-6.05];
    for(let i=0;i<72;i++){
      const a=i/72*Math.PI*2,b=(i+.76)/72*Math.PI*2,r=1.66;
      line([center[0]+Math.cos(a)*r,center[1]+Math.sin(a)*r,center[2]],[center[0]+Math.cos(b)*r,center[1]+Math.sin(b)*r,center[2]],.019,1,i%3,i/72);
    }
    const glyph:[number,number,number,number][]=[[-.12,.85,.12,.65],[-.69,.43,.69,.43],[-.55,-.05,.55,-.05],[0,.43,0,-.65],[-.82,-.65,.82,-.65]];
    for(const [x1,y1,x2,y2] of glyph)line([center[0]+x1,center[1]+y1,center[2]+.12],[center[0]+x2,center[1]+y2,center[2]+.12],.047,2,0,.5);
    // An abstract tool, deliberately neither a blade nor an additional sword moment.
    const tool:[number,number,number][]=[[.46,-.73,-5.75],[.7,-1.02,-5.75],[.46,-1.31,-5.75],[.22,-1.02,-5.75]];
    for(let i=0;i<4;i++)line(tool[i],tool[(i+1)%4],.032,3,0,.5);
    line([.46,-.9,-5.75],[.46,-1.16,-5.75],.028,3,0,.5);
  }else{
    for(let lane=0;lane<3;lane++){
      const x=.6+lane*2.1;
      for(let i=0;i<6;i++)add([x,-1.7+i*.62,-7-i*2.5],[.014,.22,.05],1,lane,i/5);
    }
  }
  const particles=gate===1||gate===4?384:192;
  const particlePositions=new Float32Array(particles*3),particleSeed=new Float32Array(particles),particleChannel=new Float32Array(particles);
  for(let i=0;i<particles;i++){
    const s=gateSeed(i+gate*211),channel=i%3;
    particlePositions[i*3]=gate===4?.6+channel*2.1:(gate===3?2.78:2.72)+(gateSeed(i+61)-.5)*(gate===3?3.5:3.9);
    particlePositions[i*3+1]=gate===4?-.6:(gateSeed(i+97)-.5)*2.6;
    particlePositions[i*3+2]=-5.8-(gate===4?0:gateSeed(i+137)*2.4);
    particleSeed[i]=s;particleChannel[i]=channel;
  }
  return {gate,bars:kinds.length,matrices:new Float32Array(transforms),kind:new Float32Array(kinds),channel:new Float32Array(channels),along:new Float32Array(distances),seed:new Float32Array(seeds),particlePositions,particleSeed,particleChannel};
}
