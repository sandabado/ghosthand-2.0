'use client';

import type { ReactNode } from 'react';
import { SCENES, SCENE_IDS, type SceneId } from '@/core/config';
import { useJourney } from '@/core/world';
import DrainScene from './DrainScene';
import GatesScene from './GatesScene';
import ScrollCue from './ScrollCue';
import DojoScene from './DojoScene';
import { PursuitScene,MergeScene,ForkScene,ChainsHoldScene } from './CutScenes';
import { CommissionScene,OathScene } from './SmithyScenes';
import ThresholdScene from './ThresholdScene';
import SecondWorkScene from './SecondWorkScene';
import { studioWork } from '../core/work';

function SceneLabel({ scene }: { scene: SceneId; detail?: string }) {
  const def = SCENES[scene];
  return <div className="scene-label"><span>{def.title}</span></div>;
}

function ChapterPassage({children='Scroll to continue',disabled=false}:{children?:ReactNode;disabled?:boolean}) {
  const text=typeof children==='string'?children:'Scroll to continue';
  return <ScrollCue ready={!disabled} label={text} waiting={text}/>;
}

function Threshold() {return <ThresholdScene/>;}

function Legend() {
  const first=studioWork.find(work=>work.id==='wishh');
  return <div className="experience-bridge"><h2 className="sr-only">Through the threshold</h2><img className="passage-still" src="/summon-entry/torii-passage.webp" alt="A stone passage framed by successive torii gates"/>{first?.media&&<img className="passage-project" src={first.media.src} alt={first.media.alt}/>}<p className="passage-caption">A world takes form.</p><ChapterPassage>Scroll into the work</ChapterPassage></div>;
}


function CraftGate({gate}:{gate:number}) { return gate===4?<SecondWorkScene/>:<GatesScene gate={gate}/>; }

function Pursuit(){return <PursuitScene/>;}
function Merge(){return <MergeScene/>;}
function Fork(){return <ForkScene/>;}

function Dojo(){return <DojoScene/>;}

function Commission(){return <CommissionScene/>;}

function ChainsHold(){return <ChainsHoldScene/>;}

function Oath(){return <OathScene/>;}

export default function SceneDirector({sceneOverride}:{sceneOverride?:SceneId}={}) {
  const activeScene=useJourney(s=>s.scene);
  const scene=sceneOverride??activeScene;
  const reset=useJourney(s=>s.resetVersion);
  let content:ReactNode;
  switch(scene){case 'THRESHOLD':content=<Threshold/>;break;case 'LEGEND':content=<Legend/>;break;case 'DRAIN':content=<DrainScene/>;break;case 'CRAFT_F1':case 'CRAFT_F2':case 'CRAFT_F3':case 'CRAFT_F4':content=<CraftGate key={`${scene}-${reset}`} gate={Number(scene.slice(-1))}/>;break;case 'PURSUIT':content=<Pursuit/>;break;case 'MERGE':content=<Merge/>;break;case 'FORK':content=<Fork/>;break;case 'DOJO':content=<Dojo/>;break;case 'COMMISSION':content=<Commission/>;break;case 'CHAINS_HOLD':content=<ChainsHold/>;break;case 'OATH':content=<Oath/>;break;}
  return <section key={`${scene}-${reset}`} className={`gh-scene gh-${scene.toLowerCase()}`} aria-label={SCENES[scene].title} data-scene={scene}>{content}</section>;
}

const stripCopy:Record<SceneId,string>={THRESHOLD:'Guide the hand and deliberately summon the blade. The gates open automatically.',LEGEND:'An idea takes form. Scroll into the work.',DRAIN:'Make room for the work. The filament study is optional.',CRAFT_F1:'Wishh: application and data. The lattice study is optional.',CRAFT_F2:'Wishh: streaming AI in a rich editor. The code study is conceptual and optional.',CRAFT_F3:'Wishh: documented integrations, webhooks and rate limits. The circle study is optional.',CRAFT_F4:'Whole Body: a connected world, shown through actual local interface review captures. The fleet and ownership branch are optional.',PURSUIT:'Follow the same blade.',MERGE:'The hand receives the blade. Green charges toward white. A literal cut opens the project invitation.',FORK:'Optional ownership exploration. Choose a branch or scroll to the invitation.',DOJO:'Wishh: Chris Kyser’s prior individual application build. The chamber, visual experiments and personal mark are optional.',COMMISSION:'Start a conversation. Concept instruments and a project mark are optional.',CHAINS_HOLD:'A green doorway returns to the optional choice. Work and Start a project remain available.',OATH:'The same sheathed sword rests. Read your local journey, find the studio About at the bottom, or deliberately begin again.'};
export function StoryboardStrip() {
  return <details className="storyboard-strip"><summary>Still storyboard</summary><p>The complete journey, with movement reduced.</p><ol>{SCENE_IDS.map(id=><li key={id}><span aria-hidden="true">{SCENES[id].glyph}</span><div><strong>{SCENES[id].title}</strong><p>{stripCopy[id]}</p></div></li>)}</ol></details>;
}
