'use client';
import { memo,useEffect,useRef,useState,useSyncExternalStore } from 'react';
import { resetJourney } from '../core/director';
import { getPerformanceSnapshot,getServerPerformanceSnapshot,subscribePerformance } from '../core/performance';
import { runtime,useJourney } from '../core/world';

interface PayloadMeasurement {
  measured?:boolean;measuredAt?:string;method?:string;
  initialReferencedRawBytes?:number;initialReferencedGzipBytes?:number;
  conservativeClientRawBytes?:number;conservativeClientGzipBytes?:number;
  conservativeAppLoadRawBytes?:number;conservativeAppLoadGzipBytes?:number;
}

const bytes=(value:number|undefined)=>typeof value==='number'&&Number.isFinite(value)?`${(value/1_000_000).toFixed(2)} MB`:'Unavailable';
const ms=(value:number|null)=>typeof value==='number'&&Number.isFinite(value)?`${value.toFixed(1)} ms`:'Sampling';
const number=(value:number)=>Number.isFinite(value)?value.toLocaleString('en-US'):'Unavailable';

function ExportReceipt(){
  const [payload,setPayload]=useState<PayloadMeasurement|null>(null);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    fetch('/foundation-receipt.json',{signal:controller.signal}).then(response=>{
      if(!response.ok)throw new Error('Receipt unavailable');
      return response.json() as Promise<PayloadMeasurement>;
    }).then(data=>{if(!controller.signal.aborted)setPayload(data);}).catch(()=>{if(!controller.signal.aborted)setFailed(true);});
    return()=>controller.abort();
  },[]);
  const complete=typeof payload?.conservativeAppLoadRawBytes==='number';
  return <section className="receipt-section" aria-labelledby="export-receipt-title">
    <h3 id="export-receipt-title">Exported files</h3>
    {payload?.measured?<>
      <dl className="receipt-metrics"><div><dt>Entry references · lower bound</dt><dd>{bytes(payload.initialReferencedRawBytes)} raw <span>/ {bytes(payload.initialReferencedGzipBytes)} gzip</span></dd></div><div><dt>{complete?'All client files + receipt':'All client files · excluding this receipt'}</dt><dd>{bytes(complete?payload.conservativeAppLoadRawBytes:payload.conservativeClientRawBytes)} raw <span>/ {bytes(complete?payload.conservativeAppLoadGzipBytes:payload.conservativeClientGzipBytes)} gzip</span></dd></div></dl>
      <p className="receipt-small">Filesystem sizes. Gzip is a local compression estimate, separate from transferred bytes. All-client totals include lazy chunks and routes that may never load.</p>
      {payload.measuredAt?<p className="receipt-small">Measured <time dateTime={payload.measuredAt}>{payload.measuredAt.replace('T',' ').replace('Z',' UTC')}</time>.</p>:<p className="receipt-small">Measurement date unavailable.</p>}
    </>:<p className="receipt-small">{failed?'Export measurement unavailable in this local preview.':'Loading the export measurement…'}</p>}
    <a href="/foundation-receipt.json" target="_blank" rel="noreferrer">Read the measurement file ↗</a>
  </section>;
}

function ReceiptContent({onReplay}:{onReplay:()=>void}){
  const p=useSyncExternalStore(subscribePerformance,getPerformanceSnapshot,getServerPerformanceSnapshot);
  const gates=useJourney(s=>s.completedGates.length),swordMoments=useJourney(s=>s.swordMoments),shingCount=useJourney(s=>s.shingCount);
  const inactive=p.status==='unavailable'||p.status==='still'||p.status==='paused';
  const hasCanvas=p.pixelWidth>0&&p.pixelHeight>0;
  const cadence=p.renderFps===null?(p.status==='still'?'Still image':p.status==='paused'?'Paused':p.status==='unavailable'?'Unavailable':'Sampling'):`${p.renderFps.toFixed(1)} frames/s`;
  const gpu=p.gpuMs!==null?`${p.gpuMs.toFixed(2)} ms`:p.gpuStatus==='unsupported'?'Unavailable · timer unsupported':p.gpuStatus==='disjoint'?'Unavailable · timer reset':'Sampling';
  return <div className="receipt-panel" data-lenis-prevent>
    <div className="receipt-title">BUILT BY GHOST HANDS<span>LOCAL PERFORMANCE RECEIPT</span></div>
    <section className="receipt-section" aria-labelledby="render-receipt-title">
      <h3 id="render-receipt-title">This browser, now</h3>
      <dl className="receipt-metrics">
        <div><dt>Rendered cadence</dt><dd>{cadence}<span> · {p.status}</span></dd></div>
        <div><dt>Frame interval · p50 / p95</dt><dd>{inactive?'Not rendering':`${ms(p.frameP50Ms)} / ${ms(p.frameP95Ms)}`}</dd></div>
        <div><dt>CPU render submission · p95</dt><dd>{inactive?'Not rendering':ms(p.cpuP95Ms)}</dd></div>
        <div><dt>GPU elapsed</dt><dd>{inactive?'Not rendering':gpu}</dd></div>
        <div><dt>Quality / canvas</dt><dd>{hasCanvas?<>{p.tier}<span> · DPR {p.renderDpr.toFixed(2)} · {number(p.pixelWidth)} × {number(p.pixelHeight)} physical pixels</span></>:'Not measured'}</dd></div>
        <div><dt>Draw calls / triangles</dt><dd>{hasCanvas?<>{number(p.drawCalls)} / {number(p.triangles)}<span> · last measured render</span></>:'Not measured'}</dd></div>
      </dl>
      <p className="receipt-small">Observed render cadence is not GPU FPS or a device benchmark. {number(p.frames)} frames over {p.sampleSeconds.toFixed(1)} seconds. {p.qualityReason}</p>
    </section>
    <section className="receipt-section" aria-labelledby="network-receipt-title">
      <h3 id="network-receipt-title">Observed resources</h3>
      {p.resources.status==='observed'?<>
        <dl className="receipt-metrics"><div><dt>Transfer / encoded / decoded bodies</dt><dd>{bytes(p.resources.transferBytes)} / {bytes(p.resources.encodedBytes)} / {bytes(p.resources.decodedBytes)}</dd></div><div><dt>Requests / external origin URLs</dt><dd>{number(p.resources.requests)} / {number(p.resources.externalRequests)}</dd></div><div><dt>Cached or transfer size unreported</dt><dd>{number(p.resources.cachedOrUnreported)} resources</dd></div></dl>
        <p className="receipt-small">Browser Resource Timing entries for this visit. Zero transfer can mean cache or restricted timing; it is not proof that a request cost no bytes. External origins are counted by URL, not classified as trackers.</p>
      </>:<p className="receipt-small">Resource Timing has not been sampled in this browser.</p>}
    </section>
    <ExportReceipt/>
    <details className="receipt-diagnostics"><summary>Scene diagnostics <span aria-hidden="true">＋</span></summary>
      <dl className="receipt-metrics"><div><dt>Clock owners / canvases / grade</dt><dd>{runtime.heartbeatOwners} / {runtime.canvasMounts} / {runtime.composerMounts}</dd></div><div><dt>WebGL geometries / textures</dt><dd>{hasCanvas?<>{number(p.geometries)} / {number(p.textures)}<span> · renderer allocation counts, not memory bytes</span></>:'Not measured'}</dd></div><div><dt>Ink strokes / ribbon vertices</dt><dd>{runtime.ink.instances} / {number(runtime.ink.ribbonVertices)}</dd></div><div><dt>Drain filaments / release motes</dt><dd>{runtime.drain.filaments} / {number(runtime.drain.particles)}</dd></div><div><dt>Gate rites settled</dt><dd>{gates} / 4</dd></div><div><dt>Reference hand / smoke wisps / floating studies</dt><dd>{runtime.referenceHand.loaded?'Loaded':'Resting'} / {runtime.smoke.wisps} / {runtime.smithy.floatingObjects}</dd></div><div><dt>Sword moments visited</dt><dd>{swordMoments.join(' · ')||'None yet'}</dd></div><div><dt>Accepted shing cues / cap</dt><dd>{shingCount} / 3</dd></div></dl>
      <p className="receipt-small">Geometry, hand paths, media, audio tones, and offering copy remain local fixtures. Replay clears the local journey record. Branch changes preserve it.</p>
    </details>
    <details className="receipt-atmosphere"><summary>Atmosphere controls <span aria-hidden="true">＋</span></summary><div className="proof-controls"><label htmlFor="fog-proof">Fog density<input id="fog-proof" type="range" min="0.05" max="1" step="0.01" defaultValue={useJourney.getState().params.fogDensity} onChange={event=>window.__GH_DEBUG?.setFog(Number(event.target.value))}/></label><label htmlFor="ink-bleed">Wet bleed<input id="ink-bleed" type="range" min="0" max="1.5" step="0.05" defaultValue={runtime.ink.bleedUniform} onChange={event=>window.__GH_DEBUG?.setInk({bleed:Number(event.target.value)})}/></label><label htmlFor="ink-pressure">Ink pressure<input id="ink-pressure" type="range" min="0.5" max="1.5" step="0.05" defaultValue={runtime.ink.pressureUniform} onChange={event=>window.__GH_DEBUG?.setInk({pressure:Number(event.target.value)})}/></label></div></details>
    <button className="receipt-replay" onClick={onReplay}>Replay from the threshold ↺</button>
  </div>;
}

function Receipt(){
  const [open,setOpen]=useState(false);
  const drawer=useRef<HTMLDetailsElement>(null),resetVersion=useJourney(s=>s.resetVersion);
  const close=()=>{if(drawer.current)drawer.current.open=false;setOpen(false);};
  useEffect(()=>{if(drawer.current)drawer.current.open=false;setOpen(false);},[resetVersion]);
  const replay=()=>{close();resetJourney();};
  return <details ref={drawer} className="receipt-drawer" onToggle={event=>{if(event.target===event.currentTarget)setOpen(event.currentTarget.open);}}><summary>Details <span aria-hidden="true">＋</span></summary>{open?<ReceiptContent onReplay={replay}/>:null}</details>;
}
export default memo(Receipt);
