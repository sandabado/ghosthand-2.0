'use client';
import { studioWork } from '../core/work';

/** Existing work leads; conceptual studies live in optional exploration below it. */
export default function WorkShowcase({project}:{project?:string}){
  return <div className="studio-work">{studioWork.filter(work=>!project||work.id===project).map(work=>{const index=studioWork.findIndex(item=>item.id===work.id);return <article className="studio-case" data-work-id={work.id} data-has-media={Boolean(work.media)} key={work.id}>
    {work.media&&<figure className={`studio-case-media studio-case-media-${index}`}>
      <img src={work.media.src} alt={work.media.alt} width={work.media.width} height={work.media.height} loading={index===0?'eager':'lazy'} decoding="async"/>
      <figcaption>{work.eyebrow}<span>{work.status}</span></figcaption>
      {work.media.kind==='image'&&<a className="studio-case-link" href={work.media.src} target="_blank" rel="noreferrer">View interface at full size <span aria-hidden="true">↗</span></a>}
    </figure>}
    <div className="studio-case-copy"><p className="studio-case-kind">{work.eyebrow}</p><h3>{work.title}</h3><p className="studio-case-summary">{work.summary}</p>
      <dl className="studio-case-credits">{work.contributions.map(credit=><div key={credit.name}><dt>{credit.name}</dt><dd>{credit.role}</dd></div>)}</dl>
      <details className="studio-case-notes"><summary>About the work <span aria-hidden="true">＋</span></summary>{work.facts.map(fact=><p key={fact}>{fact}</p>)}<p className="studio-case-provenance">{work.provenance}</p></details>
      {work.href&&<a className="studio-case-link" href={work.href} target="_blank" rel="noreferrer">Explore the project <span aria-hidden="true">↗</span></a>}
    </div>
  </article>})}</div>;
}
