// Rừng Broceliande — a quest location. Paper-cut, 4 layers (far → near): sky
// with faint light shafts, a far row of pines, mist with a mid row and the path
// into the wood, big dark trunks and ferns framing the view.
// Palette: ux-plan Phụ lục C.
import type { ParticleGroup, ScenePalette } from '../types';
import { blobs, H, pineRow, ridge, rng, sceneLayer, W } from '../paper';

const C = {
  sky: '#0f2a22',
  ray: '#133227',
  far: '#163d31',
  mist: '#1d4a3c',
  path: '#24574a',
  mid: '#0d241c',
  near: '#0a1f19',
  firefly: '#d9f27a',
};

export const FOREST_PALETTE: ScenePalette = { base: C.sky, accent: C.firefly };

export const FOREST_PARTICLES: readonly ParticleGroup[] = [
  { kind: 'firefly', count: 10, color: C.firefly, area: [630, 420, 970, 820], size: 4 },
  { kind: 'firefly', count: 6, color: C.firefly, area: [80, 360, 1520, 820], size: 4 },
];

export const ForestSky = sceneLayer(
  'ForestSky',
  <>
    <rect width={W} height={H} fill={C.sky} />
    <path d="M740 -10H790L660 620H560ZM820 -10H850L880 620H820ZM880 -10H930L1120 620H1010ZM600 -10H640L380 620H300Z" fill={C.ray} />
  </>
);

export const ForestFar = sceneLayer(
  'ForestFar',
  <path d={pineRow(rng(31), { base: 560, minH: 150, maxH: 260, minW: 54, maxW: 92, spacing: [34, 66] })} fill={C.far} />
);

// Mist over the far trees' feet, the mid row (with a clearing for the path),
// the forest floor and the path winding into the wood.
const r = rng(32);
export const ForestMist = sceneLayer(
  'ForestMist',
  <>
    <path d={ridge(r, { y: 545, amp: 16, step: 150 })} fill={C.mist} />
    <path d={pineRow(r, { base: 712, minH: 230, maxH: 360, minW: 92, maxW: 140, spacing: [70, 130], gap: [690, 910] })} fill={C.mid} />
    <path d={ridge(r, { y: 700, amp: 8, step: 220 })} fill={C.mid} />
    <path d="M690 900C730 820 760 760 776 720C784 700 792 668 796 640H806C808 668 814 700 826 720C846 760 880 820 920 900Z" fill={C.path} />
  </>
);

// Two great trunks frame the path (they stay on screen on a narrow phone),
// more trunks at the sides of wide screens, a canopy along the top, ferns below.
const trunk = (x0: number, x1: number, lean: number) =>
  `M${x0 - 26} 900C${x0 - 4} 880 ${x0 + 2} 840 ${x0 + lean} 760L${x0 + lean * 0.4} -20H${x1 + lean * 0.4}L${x1 + lean} 760C${x1 - 2} 840 ${x1 + 4} 880 ${x1 + 26} 900Z`;
const TRUNKS = [trunk(568, 636, 6), trunk(966, 1034, -6), trunk(110, 200, 4), trunk(330, 372, -3), trunk(1250, 1300, 3), trunk(1420, 1520, -5)].join('');
const BRANCHES =
  'M636 300C700 280 740 250 770 214L778 222C750 262 712 296 640 324Z' +
  'M966 360C900 338 870 312 846 280L838 288C860 324 896 356 962 382Z';
const CANOPY = blobs([
  [600, 30, 120], [740, -30, 110], [880, -20, 120], [1010, 40, 110], [470, 10, 110], [1130, 0, 120],
  [260, 20, 140], [80, 60, 130], [1320, 30, 140], [1520, 50, 130], [680, 90, 60], [930, 100, 58],
]);
const FERN = (x: number, dir: 1 | -1) =>
  `M${x} 900C${x + dir * 30} 860 ${x + dir * 70} 840 ${x + dir * 120} 838C${x + dir * 80} 852 ${x + dir * 50} 870 ${x + dir * 40} 900Z` +
  `M${x} 900C${x + dir * 10} 850 ${x + dir * 40} 812 ${x + dir * 80} 798C${x + dir * 52} 826 ${x + dir * 30} 862 ${x + dir * 26} 900Z`;
const FERNS = [FERN(600, 1), FERN(1000, -1), FERN(560, -1), FERN(1040, 1), FERN(230, 1), FERN(1380, -1)].join('');

export const ForestNear = sceneLayer(
  'ForestNear',
  <>
    {/* separate paths: shapes wound in opposite directions must not share one */}
    {[TRUNKS, BRANCHES, CANOPY, FERNS].map((d, i) => (
      <path key={i} d={d} fill={C.near} />
    ))}
  </>
);
