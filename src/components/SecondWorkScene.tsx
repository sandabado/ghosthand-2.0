'use client';
import { navigate } from '../core/director';
import WorkShowcase from './WorkShowcase';
import { FleetStudy } from './GatesScene';
import ScrollCue from './ScrollCue';
import { useJourney } from '../core/world';

export default function SecondWorkScene(){
  return <div className="second-work-scene">
    <header className="studio-work-intro"><p>An instrument becomes a connected world</p><h2>One foundation.<br/><em>Many expressions.</em></h2></header>
    <WorkShowcase project="whole-body-earth"/>
    <section className="work-interface-sequence" aria-labelledby="whole-body-interfaces"><h3 id="whole-body-interfaces">Different properties.<br/><em>One language.</em></h3><p>The same five-pillar navigation connects distinct studio and publishing interfaces.</p><figure><img src="/work-proofs/whole-body-press-ui.webp" alt="Actual Whole Body Press interface showing the shared five-pillar masthead and book publishing home" width={1280} height={900} loading="lazy" decoding="async"/><figcaption>Whole Body Press · Local interface review, November 2026</figcaption><a className="studio-case-link" href="/work-proofs/whole-body-press-ui.webp" target="_blank" rel="noreferrer">View interface at full size <span aria-hidden="true">↗</span></a></figure><p className="studio-case-provenance">The interface captures show a local review build. Commerce and integrations remain in development.</p></section>
    <details className="practice-experiment second-work-experiment" onToggle={event=>{if(event.target===event.currentTarget&&event.currentTarget.closest('.current-shell'))useJourney.setState({practiceExploring:event.currentTarget.open});}}><summary><span>Explore the fleet study</span><span className="practice-optional">Optional</span><i aria-hidden="true">＋</i></summary><div className="practice-experiment-body"><p className="practice-study-note">A conceptual study of distinct parts moving together. No agents are launched.</p><FleetStudy/></div></details>
    <div className="gate5-footer"><ScrollCue label="Scroll. The world settles."/><button type="button" className="practice-ownership-link" onClick={()=>navigate('FORK')}>Explore ownership <span aria-hidden="true">↗</span></button></div>
  </div>;
}
