import type { SceneId } from './config';
export type CommissionPhase='idle'|'pressing'|'sealed';
export const OATH_GREETINGS=[{text:'Welcome',lang:'en'},{text:'ようこそ',lang:'ja'},{text:'Bienvenido',lang:'es'},{text:'Willkommen',lang:'de'}] as const;
export const validCommissionRelic=(index:number)=>Number.isInteger(index)&&index>=0&&index<3;
export function commissionSealIntent(scene:SceneId,alreadySealed:boolean,phase:CommissionPhase,index:number){
  return scene==='COMMISSION'&&!alreadySealed&&phase==='idle'&&validCommissionRelic(index);
}
export interface OathPolicy {word:number;fade:number;rest:number}
const defaultOath:OathPolicy={word:2.4,fade:.45,rest:5.4};
const smooth=(value:number)=>{const x=Math.max(0,Math.min(1,value));return x*x*(3-2*x);};
/** The final index is a quiet hand-only rest. Clock input is local to Oath entry. */
export function oathGreetingFrame(elapsed:number,policy:OathPolicy=defaultOath){
  const valid=[policy.word,policy.fade,policy.rest].every(Number.isFinite)&&policy.word>0&&policy.fade>0&&policy.rest>=0;
  const p=valid?policy:defaultOath,fade=Math.min(p.fade,p.word/2),duration=OATH_GREETINGS.length*p.word+p.rest;
  const time=Number.isFinite(elapsed)?Math.max(0,elapsed):0,cycle=Math.floor(time/duration),local=time%duration;
  const index=Math.min(OATH_GREETINGS.length,Math.floor(local/p.word));
  if(index===OATH_GREETINGS.length)return {index,word:0,hand:1,cycle};
  const t=local-index*p.word,word=smooth(t/fade)*(1-smooth((t-(p.word-fade))/fade));
  return {index,word,hand:1-word,cycle};
}
