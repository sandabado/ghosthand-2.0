import { Matrix4, Quaternion, Vector3 } from 'three';

export const DRAIN_STRANDS=28;
export const DRAIN_SEGMENTS=32;
export const DRAIN_AUDITS=14;
export const DRAIN_PARTICLES_PER_STRAND=24;
export interface DrainStrand {
  index:number; audit:number; seed:number; order:number; radius:number;
  control:[Vector3,Vector3,Vector3,Vector3];
}
export interface DrainData {
  strandsData:DrainStrand[]; segments:number; auditCount:number;
  matrices:Float32Array; along:Float32Array; audit:Float32Array; seed:Float32Array;
  order:Float32Array; strand:Float32Array;
  particlePositions:Float32Array; particleAlong:Float32Array; particleSeed:Float32Array;
  particleOrder:Float32Array; particleAudit:Float32Array;
}
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
export function drainSeed(index:number){const value=Math.sin(index*127.1+31.7)*43758.5453;return value-Math.floor(value);}
export function sampleDrainPoint(strand:DrainStrand,progress:number):Vector3 {
  const t=clamp(progress,0,1),u=1-t,[a,b,c,d]=strand.control;
  return new Vector3().addScaledVector(a,u*u*u).addScaledVector(b,3*u*u*t)
    .addScaledVector(c,3*u*t*t).addScaledVector(d,t*t*t);
}
export function instanceToAudit(instance:number,segments=DRAIN_SEGMENTS,auditCount=DRAIN_AUDITS){
  if(!Number.isFinite(instance)||instance<0||!Number.isInteger(instance)||segments<1||auditCount<1)return -1;
  return Math.floor(instance/segments)%auditCount;
}
/** Same stagger envelope as the material: body first, then the remaining strand above it. */
export function drainReleaseAt(snap:number,order:number,along:number){
  const local=clamp((snap-(clamp(order,0,1)*0.34+clamp(along,0,1)*0.32))/0.34,0,1);
  return local*local*(3-2*local);
}
export function buildDrainData(options:{strands?:number;segments?:number;auditCount?:number}={}):DrainData {
  const count=clamp(Math.round(options.strands??DRAIN_STRANDS),1,84);
  const segments=clamp(Math.round(options.segments??DRAIN_SEGMENTS),8,64);
  const auditCount=clamp(Math.round(options.auditCount??DRAIN_AUDITS),1,84);
  const instances=count*segments;
  const matrices=new Float32Array(instances*16),along=new Float32Array(instances);
  const audit=new Float32Array(instances),seed=new Float32Array(instances),order=new Float32Array(instances),strand=new Float32Array(instances);
  const strandsData:DrainStrand[]=[];
  const matrix=new Matrix4(),rotation=new Quaternion(),up=new Vector3(0,1,0),scale=new Vector3();
  for(let i=0;i<count;i++){
    const s=drainSeed(i+1),fraction=count===1?0.5:i/(count-1),lane=fraction*2-1;
    const root=new Vector3(lane*0.92+(s-0.5)*0.34,-2.05-s*0.55,3.5+s*0.7);
    const ceilingX=lane*(7.2+s*4)+Math.sin(i*2.1)*2.1;
    const bow=Math.sin(i*1.7+0.4);
    const item:DrainStrand={index:i,audit:i%auditCount,seed:s,order:drainSeed(i*3+7),radius:0.007+s*0.008,
      control:[root,new Vector3(root.x*1.15+bow*1.15,0.6+s*1.5,1.8-s*1.9),
        new Vector3(ceilingX*0.62-bow*2,6.2+s*3,-6-s*3.5),new Vector3(ceilingX,14+s*5,-18-s*3)]};
    strandsData.push(item);
    for(let j=0;j<segments;j++){
      const index=i*segments+j,a=sampleDrainPoint(item,j/segments),b=sampleDrainPoint(item,(j+1)/segments);
      const direction=b.clone().sub(a),length=direction.length();
      rotation.setFromUnitVectors(up,direction.normalize());
      scale.set(item.radius,length*1.045,item.radius);
      matrix.compose(a.clone().add(b).multiplyScalar(0.5),rotation,scale).toArray(matrices,index*16);
      along[index]=(j+0.5)/segments;audit[index]=item.audit;seed[index]=s;order[index]=item.order;strand[index]=i;
    }
  }
  const particles=count*DRAIN_PARTICLES_PER_STRAND;
  const particlePositions=new Float32Array(particles*3),particleAlong=new Float32Array(particles),particleSeed=new Float32Array(particles),particleOrder=new Float32Array(particles),particleAudit=new Float32Array(particles);
  for(let i=0;i<count;i++)for(let j=0;j<DRAIN_PARTICLES_PER_STRAND;j++){
    const index=i*DRAIN_PARTICLES_PER_STRAND+j,t=(j+0.5)/DRAIN_PARTICLES_PER_STRAND,item=strandsData[i];
    const p=sampleDrainPoint(item,t);p.toArray(particlePositions,index*3);
    particleAlong[index]=t;particleSeed[index]=drainSeed(index+57);particleOrder[index]=item.order;particleAudit[index]=item.audit;
  }
  return {strandsData,segments,auditCount,matrices,along,audit,seed,order,strand,
    particlePositions,particleAlong,particleSeed,particleOrder,particleAudit};
}
