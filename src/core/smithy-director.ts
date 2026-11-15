'use client';
import gsap from 'gsap';
import { TIMING } from './config';
import { runtime,useJourney } from './world';
import { soundDirector } from './sound';
import { commissionSealIntent,oathGreetingFrame,validCommissionRelic } from './smithy';
let entrance:gsap.core.Timeline|null=null,rite:gsap.core.Timeline|null=null;
const mark=(event:string,input:string,selected=useJourney.getState().selectedRelic)=>runtime.smithyEvents.push({event,input,selected,at:performance.now()});
export function stopSmithy(){
  entrance?.kill();entrance=null;rite?.kill();rite=null;
  const s=useJourney.getState();gsap.killTweensOf(s.params,'commissionStroke');
  if(s.commissionPhase==='pressing')useJourney.setState({commissionPhase:s.commissionSeal?'sealed':'idle'});
}
export function prepareSmithy(){
  stopSmithy();const s=useJourney.getState(),p=s.params;
  if(s.scene==='COMMISSION'){
    Object.assign(p,{smithyScroll:0,smithyUnroll:s.reducedMotion?1:0,smithyOffer:s.reducedMotion?1:0,smithyFocus:s.selectedRelic,
      commissionStroke:0,commissionPress:0,commissionImpact:0,commissionBloom:s.commissionSeal?1:0});
    useJourney.setState({commissionPhase:s.commissionSeal?'sealed':'idle'});mark('commission-enter','journey');
    if(!s.reducedMotion)entrance=gsap.timeline().to(p,{smithyOffer:1,duration:TIMING.smithy.offer,ease:'power3.out'},0)
      .to(p,{smithyUnroll:1,duration:TIMING.smithy.unroll,ease:'power3.out'},TIMING.smithy.paperDelay);
  }else if(s.scene==='OATH'){
    Object.assign(p,{oathTime:0,oathRest:s.reducedMotion?1:0,oathGather:1,oathScroll:0});mark('oath-enter','journey');
    if(!s.reducedMotion)entrance=gsap.timeline().to(p,{oathRest:1,duration:TIMING.oath.settle,ease:'power3.out'});
  }
}
export function stepSmithy(elapsed:number){
  const s=useJourney.getState(),p=s.params;
  if(s.scene==='COMMISSION'){
    const blend=s.reducedMotion?1:1-Math.exp(-8*Math.max(0,Math.min(.05,elapsed)));
    p.smithyFocus+=(s.selectedRelic-p.smithyFocus)*blend;
  }else if(s.scene==='OATH'){
    if(!s.reducedMotion&&Number.isFinite(elapsed))p.oathTime+=Math.max(0,elapsed);
    p.oathGather=s.reducedMotion?1:oathGreetingFrame(p.oathTime,TIMING.oath).hand;
  }
}
export function selectCommissionRelic(index:number,input='button'){
  const s=useJourney.getState();if(s.scene!=='COMMISSION'||!validCommissionRelic(index)||s.selectedRelic===index)return false;
  useJourney.setState({selectedRelic:index});mark('relic-focus',input,index);return true;
}
export function previewCommissionStroke(progress:number){
  const s=useJourney.getState();if(s.scene!=='COMMISSION'||s.commissionSeal||!Number.isFinite(progress))return;
  gsap.to(s.params,{commissionStroke:Math.max(0,Math.min(1,progress)),duration:s.reducedMotion?0:TIMING.smithy.stroke,ease:'power2.out',overwrite:'auto'});
}
export function cancelCommissionStroke(){previewCommissionStroke(0);}
export function settleSmithyForMotion(){
  const s=useJourney.getState();if(s.scene!=='COMMISSION'&&s.scene!=='OATH')return;
  stopSmithy();const p=s.params;
  if(s.scene==='COMMISSION'){
    Object.assign(p,{smithyOffer:1,smithyUnroll:1,commissionStroke:0,commissionPress:0,commissionImpact:0,commissionBloom:s.commissionSeal?1:0});
    useJourney.setState({commissionPhase:s.commissionSeal?'sealed':'idle'});
  }else{p.oathRest=1;if(s.reducedMotion){p.oathTime=0;p.oathGather=1;}}
}
export function commitCommissionSeal(input:'pointer'|'keyboard'='pointer'){
  const s=useJourney.getState();if(!commissionSealIntent(s.scene,s.commissionSeal,s.commissionPhase,s.selectedRelic))return false;
  const selected=s.selectedRelic,p=s.params;rite?.kill();gsap.killTweensOf(p,'commissionStroke');p.commissionStroke=1;
  useJourney.setState({commissionSeal:true,commissionSealedRelic:selected,commissionPhase:s.reducedMotion?'sealed':'pressing'});mark('seal-commit',input,selected);
  if(s.reducedMotion){p.commissionBloom=1;p.commissionPress=0;soundDirector.emit('ink_bloom');mark('seal-static',input,selected);return true;}
  rite=gsap.timeline({onComplete:()=>{useJourney.setState({commissionPhase:'sealed'});mark('seal-settled',input,selected);}})
    .to(p,{commissionPress:1,duration:TIMING.smithy.press,ease:'power4.in'},0)
    .call(()=>{p.commissionImpact=1;soundDirector.emit('ink_bloom');mark('seal-impact',input,selected);},[],TIMING.smithy.press)
    .to(p,{commissionImpact:0,duration:TIMING.smithy.impact,ease:'power3.out'},TIMING.smithy.press)
    .to(p,{commissionBloom:1,duration:TIMING.smithy.bloom,ease:'power2.out'},TIMING.smithy.press)
    .to(p,{commissionPress:0,duration:TIMING.smithy.lift,ease:'power3.out'},TIMING.smithy.press+.1);
  return true;
}
