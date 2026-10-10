// Nhà nguyện Chén Thánh — a quest location. Paper-cut, 4 layers (far → near):
// the apse wall with a tall window and shafts of light, the chancel arch and
// side aisles, the altar with the glowing Grail between two candles, the dark
// vault and pews framing the view. Palette: ux-plan Phụ lục C.
import type { ParticleGroup, ScenePalette } from '../types';
import { archPath, blobs, box, H, pill, sceneLayer, W } from '../paper';

const C = {
  wall: '#2a2210',
  ray: '#4a3a14',
  rayCore: '#57441a',
  glass: '#5c4818',
  nave: '#1d170a',
  pillar: '#17120a',
  altar: '#1a1408',
  altarTop: '#30260f',
  cloth: '#3a2e12',
  clothInk: '#2a2110',
  grail: '#e3b341',
  grailLit: '#f2cf6e',
  candle: '#cdbb8e',
  flame: '#f2c14e',
  vault: '#120e06',
  pew: '#0d0a04',
  mote: '#e8c875',
};

export const CHAPEL_PALETTE: ScenePalette = { base: C.wall, accent: C.grail };

const GRAIL = { x: 800, y: 690 }; // foot of the cup, on the altar

export const CHAPEL_PARTICLES: readonly ParticleGroup[] = [
  { kind: 'flicker', count: 1, color: C.grail, area: [GRAIL.x, GRAIL.y - 50, GRAIL.x, GRAIL.y - 50], size: 190 },
  { kind: 'flicker', count: 1, color: C.flame, area: [712, 610, 712, 610], size: 46 },
  { kind: 'flicker', count: 1, color: C.flame, area: [888, 610, 888, 610], size: 46 },
  { kind: 'mote', count: 10, color: C.mote, area: [680, 280, 920, 700], size: 3 },
];

// The apse: a tall lancet window with tracery high on the wall, shafts of
// light falling from it onto the altar, two round windows on wide screens.
export const ChapelApse = sceneLayer(
  'ChapelApse',
  <>
    <rect width={W} height={H} fill={C.wall} />
    <path d="M748 300H852L1010 760H590Z" fill={C.ray} opacity={0.75} />
    <path d="M780 300H820L900 760H700Z" fill={C.rayCore} opacity={0.8} />
    <path d={archPath(800, 120, 150, 330, 0.85)} fill={C.glass} />
    <path d="M797 118H803V330H797ZM741 210H859V216H741ZM741 270H859V276H741Z" fill={C.wall} />
    <circle cx={800} cy={96} r={22} fill={C.glass} />
    <path d="M800 74v44M778 96h44" stroke={C.wall} strokeWidth={4} />
    <circle cx={330} cy={260} r={44} fill={C.glass} opacity={0.6} />
    <circle cx={1270} cy={260} r={44} fill={C.glass} opacity={0.6} />
  </>
);

// The chancel arch opens on the apse; lower arches open on the side aisles.
const NAVE =
  `M-20 -20H${W + 20}V${H + 20}H-20Z` +
  archPath(800, 520, 360, H + 20, 0.74) +
  archPath(360, 220, 480, H + 20, 0.8) +
  archPath(1240, 220, 480, H + 20, 0.8);
// Clustered pillars between the arches, with capitals.
const PILLARS =
  box(520, 330, 548, H) + box(1052, 330, 1080, H) + box(506, 340, 562, 360) + box(1038, 340, 1094, 360) +
  box(232, 440, 252, H) + box(1348, 440, 1368, H);

export const ChapelNave = sceneLayer(
  'ChapelNave',
  <>
    <path d={NAVE} fill={C.nave} fillRule="evenodd" />
    <path d={PILLARS} fill={C.pillar} />
  </>
);

// The altar on three steps, its cloth, the Grail in a halo, two candles.
const STEPS = box(560, 800, 1040, 900) + box(600, 776, 1000, 800) + box(640, 754, 960, 776);
const STEP_EDGES = box(560, 800, 1040, 806) + box(600, 776, 1000, 782) + box(640, 754, 960, 760);
const CUP =
  // bowl, stem with a knot, foot
  `M${GRAIL.x - 34} 620H${GRAIL.x + 34}C${GRAIL.x + 34} 648 ${GRAIL.x + 18} 662 ${GRAIL.x + 6} 664V676` +
  `C${GRAIL.x + 16} 680 ${GRAIL.x + 26} 684 ${GRAIL.x + 28} ${GRAIL.y}H${GRAIL.x - 28}C${GRAIL.x - 26} 684 ${GRAIL.x - 16} 680 ${GRAIL.x - 6} 676V664` +
  `C${GRAIL.x - 18} 662 ${GRAIL.x - 34} 648 ${GRAIL.x - 34} 620Z`;
const candle = (x: number) => (
  <g key={x}>
    <path d={`M${x - 16} ${GRAIL.y}h32l-8-10h-16zM${x - 3} 680V640h6v40z`} fill={C.altarTop} />
    <rect x={x - 6} y={600} width={12} height={40} rx={2} fill={C.candle} />
    <path d={`M${x} 576c8 10 8 18 0 22c-8-4-8-12 0-22Z`} fill={C.flame} />
  </g>
);

export const ChapelAltar = sceneLayer(
  'ChapelAltar',
  <>
    <path d={STEPS} fill={C.altar} />
    <path d={STEP_EDGES} fill={C.altarTop} />
    <path d={box(680, 690, 920, 754)} fill={C.altar} />
    <path d={box(670, 686, 930, 698)} fill={C.altarTop} />
    <path d="M716 698H884V740L800 752L716 740Z" fill={C.cloth} />
    <path d="M796 704h8v36h-8zM784 714h32v7h-32z" fill={C.clothInk} />
    <circle cx={GRAIL.x} cy={640} r={150} fill={C.grail} opacity={0.05} />
    <circle cx={GRAIL.x} cy={640} r={96} fill={C.grail} opacity={0.07} />
    <circle cx={GRAIL.x} cy={640} r={56} fill={C.grail} opacity={0.1} />
    <path d={CUP} fill={C.grail} />
    <path d={pill(GRAIL.x - 30, 620, GRAIL.x + 30, 8)} fill={C.grailLit} />
    {[712, 888].map(candle)}
  </>
);

// Foreground: the dark vault overhead (a pointed arch cut out of it) and two
// banks of pews either side of the aisle.
const VAULT = `M-20 -20H${W + 20}V${H + 20}H-20Z` + archPath(800, 1040, 540, H + 20, 0.6);
const PEWS = [
  [380, 826, 740], [860, 826, 1220], [300, 872, 734], [866, 872, 1300],
]
  .map(([x0, y, x1]) => box(x0, y, x1, y + 50) + blobs([[x0 + 4, y + 6, 12], [x1 - 4, y + 6, 12]]))
  .join('');

export const ChapelVault = sceneLayer(
  'ChapelVault',
  <>
    <path d={VAULT} fill={C.vault} fillRule="evenodd" />
    <path d={PEWS} fill={C.pew} />
  </>
);
