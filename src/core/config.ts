export const PALETTE = {
  void: '#0A0B0D', bone: '#E8E4DC', candle: '#3FFF9E', candleDim: '#1E7A4D',
  blood: '#B01E2E', smoke: '#2A3038', enemy: '#3a4a63', flash: '#ffffff',
} as const;

/** D03 is approved. Other durations and scroll budgets are builder choices. Seconds. */
export const TIMING = {
  threshold: { summon: 0.4, handStart: 1.6, handDuration: 2.2, glint: 4.2, glintDuration: 0.4, unlock: 8 },
  merge: { summon: 0.4, handStart: 1.6, handDuration: 2.2, swordStart: 3.8, swordDuration: 3,
    flashStart: 6.9, flashDuration: 0.5, cutStart: 7, cutDuration: 0.35, silenceStart: 7, silenceEnd: 8, fork: 8 },
  overlap: 0.4, pursuit: 2, pass: 0.8, draw: 0.9, nudge: 0.2, fogTween: 0.6, greeting: 3,
  strokePixels: 40, lookUpPixels: 64, scrollBudget: 560,
  // V4 builder pacing, separate from the locked Merge ceremony.
  drain:{entrance:1.1,gesture:0.12,tensionLead:0.16,snapStart:0.18,snapDuration:1.35,
    dawnStart:0.7,dawnDuration:2.4,settle:3.2},
  gates:{drag:.07,return:.28,forgeSnap:.52,trainType:2.2,trainCompile:.48,ownLock:1.05,fleetFlight:.95,pulse:.32},
  cut:{reveal:.55,collapse:.85,stroke:.07},
  travel:{settle:.6,burstGap:160},
} as const;

export const SCENE_IDS = ['THRESHOLD','LEGEND','DRAIN','CRAFT_F1','CRAFT_F2','CRAFT_F3','CRAFT_F4','PURSUIT','MERGE','FORK','DOJO','COMMISSION','CHAINS_HOLD','OATH'] as const;
export type SceneId = typeof SCENE_IDS[number];
export type MotionVerb = 'FALL' | 'PASS' | 'PURSUE' | 'ENTER';
export type SwordMoment = 'opening-glint' | 'pursuit' | 'merge' | 'commission-handover' | 'sheathed-oath';
export interface SceneDef { id: SceneId; index: string; glyph: string; title: string; verb: MotionVerb; budget: number; }
export interface StationStop { stop: string; interact: string; meaning: string; }
export interface Relic { id: string; title: string; material: string; description: string; }
export interface MemberBuild { id: string; title: string; maker: string; shader: number; description: string; }

export const SCENES: Record<SceneId,SceneDef> = {
  THRESHOLD:{id:'THRESHOLD',index:'01',glyph:'手',title:'The threshold',verb:'FALL',budget:TIMING.scrollBudget},
  LEGEND:{id:'LEGEND',index:'02',glyph:'刃',title:'The hands behind the work',verb:'FALL',budget:TIMING.scrollBudget},
  DRAIN:{id:'DRAIN',index:'03',glyph:'縛',title:'The things that own you',verb:'FALL',budget:TIMING.scrollBudget},
  CRAFT_F1:{id:'CRAFT_F1',index:'04.1',glyph:'鍛',title:'Forge',verb:'PASS',budget:TIMING.scrollBudget},
  CRAFT_F2:{id:'CRAFT_F2',index:'04.2',glyph:'修',title:'Train',verb:'PASS',budget:TIMING.scrollBudget},
  CRAFT_F3:{id:'CRAFT_F3',index:'04.3',glyph:'主',title:'Own',verb:'PASS',budget:TIMING.scrollBudget},
  CRAFT_F4:{id:'CRAFT_F4',index:'04.4',glyph:'霊',title:'Fleet',verb:'PASS',budget:TIMING.scrollBudget},
  PURSUIT:{id:'PURSUIT',index:'05',glyph:'刃',title:'Follow the blade',verb:'PURSUE',budget:0},
  MERGE:{id:'MERGE',index:'06',glyph:'手',title:'The merge',verb:'PURSUE',budget:0},
  FORK:{id:'FORK',index:'07',glyph:'選',title:'Two destinies',verb:'PASS',budget:0},
  DOJO:{id:'DOJO',index:'08',glyph:'道',title:'The dojo',verb:'ENTER',budget:TIMING.scrollBudget},
  COMMISSION:{id:'COMMISSION',index:'09',glyph:'代',title:'Commission',verb:'PASS',budget:TIMING.scrollBudget},
  CHAINS_HOLD:{id:'CHAINS_HOLD',index:'10',glyph:'縛',title:'The holding room',verb:'PASS',budget:TIMING.scrollBudget},
  OATH:{id:'OATH',index:'11',glyph:'手',title:'The oath',verb:'PASS',budget:0},
};
