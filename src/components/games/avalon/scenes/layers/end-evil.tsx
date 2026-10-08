// Camelot chìm lửa — Phe Quỷ wins. Paper-cut, 4 layers (far → near): a black
// sky lit red along the horizon, columns of smoke rolling up and away, the
// same Camelot as at dawn but broken and burning, scorched ground with a
// fallen banner and broken spears. Palette: ux-plan Phụ lục C.
import type { ParticleGroup, ScenePalette } from '../types';
import { blobs, H, ridge, rng, sceneLayer, taper, W } from '../paper';
import { camelot, CAMELOT_GATE } from './camelot';

const C = {
  sky: '#140a0a',
  glow1: '#1c0d0c',
  glow2: '#26100e',
  glow3: '#331411',
  smoke: '#2a1a1a',
  smokeDark: '#1f1414',
  hills: '#0d0606',
  castle: '#050303',
  fire: '#a8321f',
  fireCore: '#e0663a',
  window: '#e0663a',
  ground: '#080404',
  banner: '#2a1a1a',
};

export const END_EVIL_PALETTE: ScenePalette = { base: C.sky, accent: C.fireCore };

export const END_EVIL_PARTICLES: readonly ParticleGroup[] = [
  { kind: 'flicker', count: 1, color: C.fire, area: [800, 470, 800, 470], size: 360 },
  { kind: 'flicker', count: 1, color: C.fireCore, area: [1000, 420, 1000, 420], size: 120 },
  { kind: 'ember', count: 12, color: C.fireCore, area: [600, 420, 1020, 640], size: 3 },
  { kind: 'ember', count: 4, color: C.fireCore, area: [300, 520, 1300, 700], size: 3 },
];

// Smoke: columns of round puffs rising from the fires and leaning left with
// the wind.
const column = (x: number, y: number, n: number, r: number, seed: number) => {
  const rand = rng(seed);
  const c: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = i / n;
    c.push([x - t * t * 380 + (rand() - 0.5) * 40, y - i * 58, r * (0.7 + t * 0.9) * (0.85 + rand() * 0.3)]);
  }
  return blobs(c);
};

export const BurnSky = sceneLayer(
  'BurnSky',
  <>
    <rect width={W} height={H} fill={C.sky} />
    <path d={ridge(rng(121), { y: 400, amp: 18, step: 220 })} fill={C.glow1} />
    <path d={ridge(rng(122), { y: 490, amp: 14, step: 220 })} fill={C.glow2} />
    <path d={ridge(rng(123), { y: 570, amp: 10, step: 240 })} fill={C.glow3} />
    <path d={column(1000, 380, 8, 40, 124) + column(640, 420, 7, 34, 125)} fill={C.smokeDark} />
    <path d={column(820, 220, 9, 46, 126)} fill={C.smoke} />
  </>
);

export const BurnHills = sceneLayer(
  'BurnHills',
  <>
    <path d={ridge(rng(127), { y: 660, amp: 20, step: 200 })} fill={C.hills} />
    <ellipse cx={800} cy={560} rx={420} ry={190} fill={C.fire} opacity={0.1} />
  </>
);

// Flames: three-tongued fires on the walls, the keep and the broken towers.
const flame = (x: number, base: number, h: number) =>
  `M${x - h * 0.34} ${base}C${x - h * 0.46} ${base - h * 0.4} ${x - h * 0.2} ${base - h * 0.6} ${x - h * 0.12} ${base - h * 0.86}` +
  `C${x - h * 0.06} ${base - h * 0.6} ${x + h * 0.02} ${base - h * 0.62} ${x + h * 0.04} ${base - h}` +
  `C${x + h * 0.16} ${base - h * 0.7} ${x + h * 0.26} ${base - h * 0.62} ${x + h * 0.22} ${base - h * 0.78}` +
  `C${x + h * 0.44} ${base - h * 0.5} ${x + h * 0.42} ${base - h * 0.24} ${x + h * 0.34} ${base}Z`;
const FIRES: [number, number, number][] = [
  [800, 262, 70], [1000, 418, 60], [760, 400, 50], [870, 400, 44], [560, 560, 46], [660, 560, 38], [960, 560, 52], [1060, 560, 40],
  [1234, 574, 36], [430, 612, 30],
];
const CASTLE = camelot(true);

export const BurnCastle = sceneLayer(
  'BurnCastle',
  <>
    <path d={FIRES.map(([x, b, h]) => flame(x, b + 6, h)).join('')} fill={C.fire} />
    <path d={FIRES.map(([x, b, h]) => flame(x, b + 6, h * 0.55)).join('')} fill={C.fireCore} />
    <path d="M240 900C420 730 600 700 800 694C1000 700 1180 730 1360 900Z" fill={C.castle} />
    <path d={CASTLE.body} fill={C.castle} />
    <path d={CASTLE.windows} fill={C.window} />
    <path d={CAMELOT_GATE} fill={C.fire} />
  </>
);

// Scorched ground, a torn banner lying on it, broken spears stuck at angles.
const SPEARS = taper(470, 900, 530, 760, 7, 5) + taper(1120, 900, 1060, 780, 7, 5) + taper(1180, 900, 1210, 800, 6, 5) + taper(400, 900, 380, 820, 6, 5);
const BANNER = 'M600 878L760 860L780 880L752 884L772 900H610Z';
export const BurnFront = sceneLayer(
  'BurnFront',
  <>
    <path d={ridge(rng(128), { y: 846, amp: 14, step: 180 })} fill={C.ground} />
    <path d={SPEARS} fill={C.ground} />
    <path d={BANNER} fill={C.banner} />
  </>
);
