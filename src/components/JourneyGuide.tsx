'use client';
import { useJourney } from '@/core/world';
import { journeyGuidance } from '@/core/journey-ux';

/** One quiet answer to "how do I continue?" It reveals controls, never commits them. */
export default function JourneyGuide(){
  const state=useJourney(),guide=journeyGuidance(state);
  const reveal=()=>{
    if(!guide.selector)return;
    const control=document.querySelector<HTMLElement>(`.current-shell ${guide.selector}`);
    if(!control)return;
    control.scrollIntoView({block:'center',behavior:'instant'});
    control.focus({preventScroll:true});
  };
  return <div className="journey-guide" data-mode={guide.mode}>
    <span className="journey-guide-icon" aria-hidden="true">{guide.mode==='required'?'↗':guide.mode==='ceremony'||guide.mode==='settling'?'·':guide.mode==='end'?'手':'↓'}</span>
    <div><span className="journey-guide-label">{guide.label}</span>{guide.selector&&<button type="button" onClick={reveal}>Show required action <span aria-hidden="true">↗</span></button>}</div>
  </div>;
}
