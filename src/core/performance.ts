'use client';
import type { WebGLRenderer } from 'three';
import { createGovernor,observeGovernor,percentile,type GovernorState,type PerformanceTier } from './performance-policy';
import { setRenderQualityTier } from './render-quality';

export interface ResourceObservation {status:'not-sampled'|'observed';requests:number;transferBytes:number;encodedBytes:number;decodedBytes:number;cachedOrUnreported:number;externalRequests:number}
export interface PerformanceSnapshot {
  status:'warming'|'measuring'|'paused'|'still'|'unavailable';tier:PerformanceTier;qualityReason:string;
  renderFps:number|null;frameP50Ms:number|null;frameP95Ms:number|null;cpuP95Ms:number|null;gpuMs:number|null;
  gpuStatus:'unsupported'|'sampling'|'available'|'disjoint';renderDpr:number;pixelWidth:number;pixelHeight:number;
  drawCalls:number;triangles:number;geometries:number;textures:number;sampleSeconds:number;frames:number;resources:ResourceObservation;
}
const empty=Object.freeze<PerformanceSnapshot>({status:'warming',tier:'cinematic',qualityReason:'Warming up',renderFps:null,frameP50Ms:null,frameP95Ms:null,cpuP95Ms:null,gpuMs:null,gpuStatus:'unsupported',renderDpr:1,pixelWidth:0,pixelHeight:0,drawCalls:0,triangles:0,geometries:0,textures:0,sampleSeconds:0,frames:0,resources:{status:'not-sampled',requests:0,transferBytes:0,encodedBytes:0,decodedBytes:0,cachedOrUnreported:0,externalRequests:0}});
let snapshot:PerformanceSnapshot=empty;
const listeners=new Set<()=>void>();
export const subscribePerformance=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export const getPerformanceSnapshot=()=>snapshot;
export const getServerPerformanceSnapshot=()=>empty;
let active=true,reduced=false,critical=false,lastRender=0,lastPublish=0,windowStart=0;
let frames=0,governor:GovernorState=createGovernor(),initialized=false;
const intervals:number[]=[],cpu:number[]=[],gpu:number[]=[];
let metrics={renderDpr:1,pixelWidth:0,pixelHeight:0,drawCalls:0,triangles:0,geometries:0,textures:0};
let gpuStatus:PerformanceSnapshot['gpuStatus']='unsupported';
let measurementEpoch=0;
type GpuTimer={gl:WebGL2RenderingContext;ext:{TIME_ELAPSED_EXT:number;GPU_DISJOINT_EXT:number};pending:WebGLQuery[];epoch:number};
const timers=new WeakMap<WebGLRenderer,GpuTimer|null>();
function publish(next:PerformanceSnapshot){snapshot=Object.freeze(next);for(const listener of listeners)listener();}
export function setPerformanceMode(mode:{visible:boolean;reduced:boolean;critical:boolean}){
  const changed=active!==mode.visible||reduced!==mode.reduced;
  active=mode.visible;reduced=mode.reduced;critical=mode.critical;
  if(changed){measurementEpoch++;lastRender=0;windowStart=performance.now();intervals.length=0;cpu.length=0;gpu.length=0;frames=0;governor={...governor,badWindows:0,goodWindows:0,warmUntil:windowStart+2500};publish({...snapshot,status:!active?'paused':reduced?'still':'warming',renderFps:null,frameP50Ms:null,frameP95Ms:null,cpuP95Ms:null,gpuMs:null,frames:0,sampleSeconds:0});}
}
function resources():ResourceObservation{
  const entries=[...performance.getEntriesByType('navigation'),...performance.getEntriesByType('resource')] as PerformanceResourceTiming[];
  const result:ResourceObservation={status:'observed',requests:0,transferBytes:0,encodedBytes:0,decodedBytes:0,cachedOrUnreported:0,externalRequests:0};
  for(const entry of entries){
    if(!/^https?:/.test(entry.name))continue;
    result.requests++;result.transferBytes+=Math.max(0,entry.transferSize||0);result.encodedBytes+=Math.max(0,entry.encodedBodySize||0);result.decodedBytes+=Math.max(0,entry.decodedBodySize||0);
    if(!entry.transferSize)result.cachedOrUnreported++;
    try{if(new URL(entry.name).origin!==location.origin)result.externalRequests++;}catch{}
  }
  return result;
}
export function samplePerformance(now=performance.now()){
  if(now-lastPublish<1000)return;lastPublish=now;
  if(!windowStart)windowStart=now;
  const seconds=Math.max(0,(now-windowStart)/1000),count=intervals.length,renderFps=count?count*1000/intervals.reduce((sum,value)=>sum+value,0):null;
  const p95=percentile(intervals,.95),decision=observeGovernor(governor,{now,windowMs:seconds*1000,fps:renderFps,p95Ms:p95,samples:count,active,critical,reduced});
  governor=decision.state;if(decision.changed)setRenderQualityTier(governor.tier);
  publish({status:!active?'paused':reduced?'still':count>=1&&seconds>=.75?'measuring':metrics.pixelWidth?'warming':'unavailable',tier:governor.tier,qualityReason:decision.reason,
    renderFps:active&&!reduced?renderFps:null,frameP50Ms:active&&!reduced?percentile(intervals,.5):null,frameP95Ms:active&&!reduced?p95:null,cpuP95Ms:percentile(cpu,.95),gpuMs:gpuStatus==='available'?percentile(gpu,.5):null,gpuStatus,...metrics,sampleSeconds:seconds,frames,resources:resources()});
  intervals.length=0;cpu.length=0;gpu.length=0;frames=0;windowStart=now;
}
export function renderMeasured(renderer:WebGLRenderer,draw:()=>void){
  const start=performance.now();
  if(!initialized){initialized=true;governor=createGovernor(innerWidth<760?'balanced':'cinematic',start);setRenderQualityTier(governor.tier);windowStart=start;}
  let timer=timers.get(renderer);
  if(timer===undefined){
    const gl=renderer.getContext() as WebGL2RenderingContext,ext=typeof gl.createQuery==='function'?gl.getExtension('EXT_disjoint_timer_query_webgl2'):null;
    timer=ext?{gl,ext,pending:[],epoch:measurementEpoch}:null;timers.set(renderer,timer);gpuStatus=timer?'sampling':'unsupported';
    // Preserve the setting even when hardware timers are unsupported.
    resetOwners.set(renderer,renderer.info.autoReset);renderer.info.autoReset=false;
  }
  let query:WebGLQuery|null=null;
  try{if(timer){
    const {gl,ext,pending}=timer;
    if(timer.epoch!==measurementEpoch){for(const old of pending)gl.deleteQuery(old);pending.length=0;timer.epoch=measurementEpoch;gpuStatus='sampling';}
    const disjoint=Boolean(gl.getParameter(ext.GPU_DISJOINT_EXT));
    if(disjoint){for(const old of pending)gl.deleteQuery(old);pending.length=0;gpuStatus='disjoint';gpu.length=0;}
    else{
      while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){
        const old=pending.shift()!,value=Number(gl.getQueryParameter(old,gl.QUERY_RESULT))/1e6;gl.deleteQuery(old);if(Number.isFinite(value)&&value>0){if(gpu.length<240)gpu.push(value);gpuStatus='available';}
      }
      if(pending.length<3&&!gl.getQuery(ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY)){query=gl.createQuery();if(query){gl.beginQuery(ext.TIME_ELAPSED_EXT,query);if(gpuStatus!=='available')gpuStatus='sampling';}}
    }
  }}catch{timer=null;timers.set(renderer,null);gpuStatus='unsupported';gpu.length=0;}
  renderer.info.reset();
  try{draw();}finally{
    if(query&&timer){try{timer.gl.endQuery(timer.ext.TIME_ELAPSED_EXT);timer.pending.push(query);}catch{timers.set(renderer,null);gpuStatus='unsupported';}}
    const end=performance.now();
    if(active&&!reduced&&lastRender){const delta=start-lastRender;if(Number.isFinite(delta)&&delta>0&&intervals.length<240)intervals.push(delta);}
    lastRender=start;frames++;if(cpu.length<240)cpu.push(Math.max(0,end-start));
    metrics={renderDpr:renderer.getPixelRatio(),pixelWidth:renderer.domElement.width,pixelHeight:renderer.domElement.height,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures};
  }
}
const resetOwners=new WeakMap<WebGLRenderer,boolean>();
export function cleanupMeasuredRenderer(renderer:WebGLRenderer){
  const timer=timers.get(renderer);if(timer)for(const query of timer.pending){try{timer.gl.deleteQuery(query);}catch{}}
  timers.delete(renderer);const old=resetOwners.get(renderer);if(old!==undefined)renderer.info.autoReset=old;resetOwners.delete(renderer);
  lastRender=0;initialized=false;
}
