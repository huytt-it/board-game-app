// Bình minh Camelot — Phe Người wins. Paper-cut, 4 layers (far → near): a
// dawn sky in flat warm bands with the sun rising and long rays, far hills
// in morning haze, Camelot whole and standing against the light, a meadow
// with pennants and birds. Palette: ux-plan Phụ lục C.
import type { ParticleGroup, ScenePalette } from '../types';
import { bird, H, pill, ridge, rng, sceneLayer, taper, W } from '../paper';
import { camelot, CAMELOT_GATE } from './camelot';

const C = {
  sky: '#5d6a8c',
  band1: '#78779a',
  band2: '#a68c86',
  dawn: '#d9a86a',
  dawnLight: '#f2c879',
  sun: '#ffd98a',
  cloud: '#8b84a2',
  cloudLit: '#d8b07c',
  hillsFar: '#4a4c6c',
  hills: '#33364f',
  castle: '#1a1d2b',
  window: '#c99a4a',
  meadow: '#22253a',
  pennant: '#b8923f',
  bird: '#3a3d58',
};

export const END_GOOD_PALETTE: ScenePalette = { base: C.sky, accent: C.sun };

const SUN = { x: 930, y: 600, r: 78 };

export const END_GOOD_PARTICLES: readonly ParticleGroup[] = [
  { kind: 'mote', count: 10, color: '#ffe2a0', area: [560, 300, 1040, 780], size: 3 },
  { kind: 'twinkle', count: 4, color: '#fff1c8', area: [860, 470, 1010, 590], size: 3 },
];

// Long thin rays fanning out from the sun.
const RAYS = Array.from({ length: 9 }, (_, i) => {
  const a = Math.PI * (1.08 + i * 0.105);
  const len = 900;
  return taper(SUN.x, SUN.y, SUN.x + Math.cos(a) * len, SUN.y + Math.sin(a) * len, 6, 60);
}).join('');

export const DawnSky = sceneLayer(
  'DawnSky',
  <>
    <rect width={W} height={H} fill={C.sky} />
    <path d={ridge(rng(111), { y: 290, amp: 14, step: 240 })} fill={C.band1} />
    <path d={ridge(rng(112), { y: 400, amp: 12, step: 240 })} fill={C.band2} />
    <path d={ridge(rng(113), { y: 492, amp: 10, step: 260 })} fill={C.dawn} />
    <path d={ridge(rng(114), { y: 566, amp: 8, step: 260 })} fill={C.dawnLight} />
    <path d={RAYS} fill={C.dawnLight} opacity={0.18} />
    <circle cx={SUN.x} cy={SUN.y} r={SUN.r + 30} fill={C.sun} opacity={0.25} />
    <circle cx={SUN.x} cy={SUN.y} r={SUN.r} fill={C.sun} />
    <path d={pill(-40, 180, 520, 24) + pill(1060, 150, 1680, 22) + pill(380, 236, 760, 16)} fill={C.cloud} />
    <path d={pill(520, 444, 880, 14) + pill(1000, 420, 1400, 14) + pill(120, 470, 460, 12)} fill={C.cloudLit} />
  </>
);

export const DawnHills = sceneLayer(
  'DawnHills',
  <>
    <path d={ridge(rng(115), { y: 640, amp: 22, step: 200 })} fill={C.hillsFar} />
    <path d={ridge(rng(116), { y: 690, amp: 16, step: 170 })} fill={C.hills} />
  </>
);

const CASTLE = camelot(false);
export const DawnCastle = sceneLayer(
  'DawnCastle',
  <>
    <path d="M240 900C420 730 600 700 800 694C1000 700 1180 730 1360 900Z" fill={C.castle} />
    <path d={CASTLE.body} fill={C.castle} />
    <path d={CASTLE.windows} fill={C.window} />
    <path d={CAMELOT_GATE} fill={C.window} opacity={0.45} />
  </>
);

// Meadow in front with pennants on tall poles either side; birds wheeling.
const POLES: [number, number][] = [[560, 690], [1060, 700], [180, 660], [1420, 650]];
const SHAFTS = POLES.map(([x, top]) => `M${x - 3} 900V${top}H${x + 3}V900Z`).join('');
const PENNANTS = POLES.map(([x, top]) => `M${x + 3} ${top + 4}L${x + 70} ${top + 22}L${x + 3} ${top + 40}Z`).join('');
const BIRDS = bird(700, 330, 16) + bird(748, 360, 11) + bird(1110, 300, 14) + bird(420, 380, 12);

export const DawnMeadow = sceneLayer(
  'DawnMeadow',
  <>
    <path d={ridge(rng(117), { y: 840, amp: 12, step: 200 })} fill={C.meadow} />
    <path d={SHAFTS} fill={C.meadow} />
    <path d={PENNANTS} fill={C.pennant} />
    <path d={BIRDS} fill={C.bird} />
  </>
);
