'use client';
import { useSyncExternalStore } from 'react';

const listeners=new Set<()=>void>();
let observer:MutationObserver|null=null;
export const renderFailureSnapshot=()=>document.documentElement.dataset.renderFailed==='true';
export const renderFailureServerSnapshot=()=>false;
export function subscribeRenderFailure(notify:()=>void){
  listeners.add(notify);
  if(!observer){
    observer=new MutationObserver(()=>{for(const listener of listeners)listener();});
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-render-failed']});
  }
  return()=>{listeners.delete(notify);if(!listeners.size){observer?.disconnect();observer=null;}};
}
export function useRenderFailure(){return useSyncExternalStore(subscribeRenderFailure,renderFailureSnapshot,renderFailureServerSnapshot);}
