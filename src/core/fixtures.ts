import type { MemberBuild, Relic, StationStop } from './config';

/** Illustrative foundation data. Replace with approved member work and catalog copy. */
export const memberBuilds: MemberBuild[] = [
  { id: 'fixture-01', title: 'Signal garden', maker: 'Foundation fixture', shader: 0,
    description: 'A procedural field standing in for a member-built knowledge surface.' },
  { id: 'fixture-02', title: 'Quiet machinery', maker: 'Foundation fixture', shader: 1,
    description: 'A shader scroll exploring the shape of a human-guided workflow.' },
  { id: 'fixture-03', title: 'Memory lattice', maker: 'Foundation fixture', shader: 2,
    description: 'A temporary visual texture for connected sources and retained context.' },
  { id: 'fixture-04', title: 'Local light', maker: 'Foundation fixture', shader: 3,
    description: 'A placeholder for a useful tool that stays under its maker’s control.' },
  { id: 'fixture-05', title: 'Small fleet', maker: 'Foundation fixture', shader: 4,
    description: 'An abstract dispatch pattern, awaiting a real member demonstration.' },
  { id: 'fixture-06', title: 'Open circuit', maker: 'Foundation fixture', shader: 5,
    description: 'A procedural screen reserved for an approved build and its maker.' },
];

export interface DrainAuditItem { id: string; name: string; rate: string; meaning: string; }
/** Example costs and time burdens, not visitor telemetry or a savings claim. */
export const drainAudit: DrainAuditItem[] = [
  { id: 'cloud-rent', name: 'Cloud rent', rate: '$340 / month', meaning: 'Illustrative hosting bill for capacity that is rented rather than owned.' },
  { id: 'feed', name: 'The feed', rate: '2.1 hours / day', meaning: 'Illustrative attention spent inside an endless recommendation loop.' },
  { id: 'seat-tax', name: 'Seat tax', rate: '$24 / person / month', meaning: 'Illustrative recurring charge for access to one shared tool.' },
  { id: 'context-switch', name: 'Context switching', rate: '38 switches / day', meaning: 'Illustrative movement between tools before a thought can settle.' },
  { id: 'manual-handoff', name: 'Manual handoffs', rate: '45 minutes / day', meaning: 'Illustrative effort copying the same context between disconnected systems.' },
  { id: 'storage', name: 'Storage tiers', rate: '$19 / month', meaning: 'Illustrative charge for retaining work inside a vendor’s storage boundary.' },
  { id: 'reporting', name: 'Reporting ritual', rate: '3 hours / week', meaning: 'Illustrative time reconstructing work for status reporting.' },
  { id: 'search', name: 'Lost context', rate: '27 minutes / day', meaning: 'Illustrative time spent finding a source that once felt easy to retrieve.' },
  { id: 'approval', name: 'Approval drift', rate: '2 days / handoff', meaning: 'Illustrative waiting time when responsibility and context become unclear.' },
  { id: 'export', name: 'Export friction', rate: '6 steps / release', meaning: 'Illustrative effort required to take work out of a closed system.' },
  { id: 'duplicate', name: 'Duplicate entry', rate: '70 fields / week', meaning: 'Illustrative repeated entry of information the system already has.' },
  { id: 'notification', name: 'Notification rent', rate: '86 interruptions / day', meaning: 'Illustrative interruptions that borrow attention from deliberate work.' },
  { id: 'meeting', name: 'Meeting residue', rate: '90 minutes / week', meaning: 'Illustrative follow-up work needed to rebuild decisions after a call.' },
  { id: 'dependency', name: 'Dependency lock', rate: '1 gatekeeper / change', meaning: 'Illustrative dependence on an external permission before a tool can evolve.' },
];

/** Museum-catalog placeholders. No price, availability, or commercial promise. */
export const relics: Relic[] = [
  { id: 'relic-01', title: '01 / The local instrument', material: 'Code · context · owned infrastructure',
    description: 'A fixture for a commissioned tool shaped around a specific working practice.' },
  { id: 'relic-02', title: '02 / The memory vessel', material: 'Sources · retrieval · human judgment',
    description: 'A fixture for a source-aware knowledge system with visible boundaries.' },
  { id: 'relic-03', title: '03 / The quiet fleet', material: 'Workflows · agents · deliberate control',
    description: 'A fixture for a small coordinated system that supports the work already being done.' },
];

/** Builder descriptions pending the missing station-meaning canon. */
export const stations: StationStop[] = [
  { stop: '鍛 FORGE', interact: 'Draw the strands into a lattice.', meaning: 'Give the idea a structure that can hold.' },
  { stop: '修 TRAIN', interact: 'Type three keys; let the ghost complete the pattern.', meaning: 'Practice makes the instrument useful.' },
  { stop: '主 OWN', interact: 'Bring the tools inside the ring.', meaning: 'Keep agency over the things you build.' },
  { stop: '霊 FLEET', interact: 'Send the hands into the dark.', meaning: 'Coordinate the work without surrendering judgment.' },
];
