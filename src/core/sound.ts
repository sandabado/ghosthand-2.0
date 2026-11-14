'use client';
import gsap from 'gsap';
import { TIMING } from './config';
import { runtime, useJourney } from './world';
export type SoundEvent='shing'|'ink_bloom'|'creak'|'ember'|'heartbeat';
class SoundDirector {
  private context:AudioContext|null=null;
  private master:GainNode|null=null;
  private silent=false;
  private connected=false;
  private last=new Map<SoundEvent,number>();
  async enable(enabled:boolean){
    if(enabled){
      this.context??=new AudioContext();
      this.master??=this.context.createGain();
      await this.context.resume();
    }
    useJourney.setState({soundEnabled:enabled});
    this.applyGain();
  }
  private applyGain(){
    if(this.master&&this.context){
      const muted=this.silent||!useJourney.getState().soundEnabled;
      if(muted&&this.connected){this.master.disconnect();this.connected=false;}
      else if(!muted&&!this.connected){this.master.connect(this.context.destination);this.connected=true;}
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.value=muted?0:0.035;
      this.master.gain.setValueAtTime(muted?0:0.035,this.context.currentTime);
    }
  }
  setSilent(silent:boolean){this.silent=silent;this.applyGain();}
  reset(){this.last.clear();this.setSilent(false);}
  emit(event:SoundEvent){
    const state=useJourney.getState();
    if(this.silent) return false;
    if(event==='shing'&&state.shingCount>=3) return false;
    const now=state.params.time;
    if(now-(this.last.get(event)??-Infinity)<TIMING.nudge) return false;
    this.last.set(event,now);
    if(event==='shing')useJourney.setState({shingCount:state.shingCount+1});
    runtime.soundEvents.push(`${event}:${state.soundEnabled?'synth-fixture':'muted'}`);
    if(!state.reducedMotion)gsap.to(state.params,{lightIntensity:1.3,chromaOffset:0.001,duration:TIMING.nudge/2,yoyo:true,repeat:1,ease:'sine.inOut',overwrite:'auto'});
    if(!state.soundEnabled||!this.context||!this.master)return true;
    const oscillator=this.context.createOscillator();
    const envelope=this.context.createGain();
    const tones:Record<SoundEvent,number>={shing:880,ink_bloom:110,creak:70,ember:220,heartbeat:55};
    oscillator.type='sine';oscillator.frequency.value=tones[event];
    const t=this.context.currentTime;
    envelope.gain.setValueAtTime(0,t);envelope.gain.linearRampToValueAtTime(0.4,t+0.01);
    envelope.gain.exponentialRampToValueAtTime(0.001,t+TIMING.nudge);
    oscillator.connect(envelope);envelope.connect(this.master);oscillator.start(t);oscillator.stop(t+TIMING.nudge);
    oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect();};
    return true;
  }
  get isSilent(){return this.silent;}
  snapshot(){return {silent:this.silent,connected:this.connected,masterGain:this.master?.gain.value??null,contextState:this.context?.state??'not-created'};}
}
export const soundDirector=new SoundDirector();
