'use client';
export default function ScrollCue({ready=true,label='Scroll to continue',waiting='Let the moment settle'}:{ready?:boolean;label?:string;waiting?:string}){
  return <div className="scroll-cue" data-ready={ready} role="status"><span>{ready?label:waiting}</span><i aria-hidden="true">{ready?'↓':'·'}</i><b aria-hidden="true"/></div>;
}
