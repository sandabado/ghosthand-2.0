import { studioWork } from '../core/work';

/** Detail views of the actual identity artifact, not simulated product screens. */
export default function PracticeVisual({phase}:{phase:number}){
  const project=studioWork.find(work=>work.id==='wishh');if(!project?.media)return null;
  const captions=['The application and its data.','A rich editor, with streaming AI.','Integrations, webhooks and rate limits.'];
  return <figure className={`practice-project-reference practice-reference-${phase}`}><div><img src={project.media.src} alt="Detail of the verified Wishh interface" loading="lazy" decoding="async"/></div><figcaption><span>Wishh · Interface detail</span><p>{captions[phase-1]??captions[0]}</p></figcaption></figure>;
}
