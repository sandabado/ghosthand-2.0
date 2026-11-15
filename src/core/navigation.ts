import type {SceneId} from './config';

export interface ReaderSnapshot {scene:SceneId;offset:number;progress:number;spine:number;reduced:boolean;fragment:string;details:boolean[];focusIndex:number}
export interface JourneyHistory {ghostHand:1;key:string;reader:ReaderSnapshot;returns:ReaderSnapshot[]}
export type NavigationRequest={kind:'scene';scene:SceneId}|{kind:'home'|'about'|'return'};
export interface FragmentTarget {scene:SceneId;anchor?:'about'}
const fragments:Partial<Record<SceneId,string>>={THRESHOLD:'',LEGEND:'home',DOJO:'work-wishh',DRAIN:'making',CRAFT_F1:'forge',CRAFT_F2:'train',CRAFT_F3:'own',CRAFT_F4:'work-whole-body',FORK:'choices',CHAINS_HOLD:'holding-room',COMMISSION:'project',OATH:'ending'};
const targets=new Map(Object.entries(fragments).filter(([,fragment])=>fragment).map(([scene,fragment])=>[fragment,{scene:scene as SceneId}]));
export const sceneFragment=(scene:SceneId)=>fragments[scene]??null;
export function fragmentTarget(hash:string):FragmentTarget|null {
  const fragment=hash.replace(/^#/,'').toLowerCase();
  return fragment==='about'?{scene:'OATH',anchor:'about'}:targets.get(fragment)??null;
}
export function validReader(value:unknown):value is ReaderSnapshot {
  if(!value||typeof value!=='object')return false;
  const v=value as ReaderSnapshot;
  const target=typeof v.fragment==='string'?fragmentTarget(v.fragment):null;
  return sceneFragment(v.scene)!==null&&(v.scene==='THRESHOLD'&&v.fragment===''||target?.scene===v.scene)&&typeof v.reduced==='boolean'&&Array.isArray(v.details)&&v.details.every(open=>typeof open==='boolean')&&Number.isInteger(v.focusIndex)&&v.focusIndex>=-1&&
    [v.offset,v.progress,v.spine].every(Number.isFinite)&&v.offset>=0&&v.progress>=0&&v.progress<=1&&v.spine>=0;
}
export function validHistory(value:unknown):value is JourneyHistory {
  if(!value||typeof value!=='object')return false;
  const v=value as JourneyHistory;
  return v.ghostHand===1&&typeof v.key==='string'&&validReader(v.reader)&&Array.isArray(v.returns)&&v.returns.every(validReader);
}
let bridge:((request:NavigationRequest)=>void)|null=null;
export function installNavigation(handler:(request:NavigationRequest)=>void){bridge=handler;return()=>{if(bridge===handler)bridge=null;};}
export function requestNavigation(request:NavigationRequest){if(!bridge)return false;bridge(request);return true;}
