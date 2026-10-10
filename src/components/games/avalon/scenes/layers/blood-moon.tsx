// Trăng máu — the assassination. Paper-cut, 4 layers (far → near): a great
// red moon in a dark sky, low hills, a dead tree reaching across the moon
// with crows on and around it, the ground with a crooked fence and dry grass.
// Palette: ux-plan Phụ lục C.
import type { ParticleGroup, ScenePalette } from '../types';
import { bird, deadTree, H, reeds, ridge, rng, scatter, sceneLayer, taper, W } from '../paper';

const C = {
  sky: '#1a0d10',
  star: '#5a3a40',
  haloFar: '#1e0f13',
  halo: '#241116',
  moon: '#8f2a2a',
  mare: '#7d2427',
  hills: '#120809',
  ground: '#0a0506',
  crow: '#050203',
  ash: '#a35a50',
};

export const BLOOD_MOON_PALETTE: ScenePalette = { base: C.sky, accent: C.moon };

const MOON = { x: 812, y: 300, r: 148 };

export const BLOOD_MOON_PARTICLES: readonly ParticleGroup[] = [
  { kind: 'mote', count: 8, color: C.ash, area: [560, 200, 1040, 760], size: 3 },
  { kind: 'twinkle', count: 4, color: '#7a5a60', area: [100, 40, 1500, 300], size: 2 },
];

const STARS = scatter(rng(101), 30, [0, 0, W, 480], [0.7, 1.5], { x: MOON.x, y: MOON.y, r: 230 });
const MARE: [number, number, number][] = [
  [770, 262, 34], [836, 318, 44], [866, 236, 22], [760, 352, 20], [892, 370, 16],
];

export const BloodSky = sceneLayer(
  'BloodSky',
  <>
    <rect width={W} height={H} fill={C.sky} />
    {STARS.map((s, i) => (
      <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={C.star} opacity={s.o} />
    ))}
    <circle cx={MOON.x} cy={MOON.y} r={MOON.r + 120} fill={C.haloFar} />
    <circle cx={MOON.x} cy={MOON.y} r={MOON.r + 54} fill={C.halo} />
    <circle cx={MOON.x} cy={MOON.y} r={MOON.r} fill={C.moon} />
    {MARE.map(([cx, cy, r], i) => (
      <circle key={i} cx={cx} cy={cy} r={r} fill={C.mare} />
    ))}
  </>
);

export const BloodHills = sceneLayer(
  'BloodHills',
  <path d={ridge(rng(102), { y: 650, amp: 34, step: 210 })} fill={C.hills} />
);

// The dead tree stands left of centre and spreads its branches over the moon;
// a mound under it; crows perched along a limb and circling.
const TREE = deadTree(rng(103), 690, 760, 560, { width: 46, depth: 6, spread: 0.62, lean: 0.14 });
// A perched crow facing left or right: body, head, beak, tail.
function crow(x: number, y: number, s: number, dir: 1 | -1) {
  const k = (v: number) => x + v * s * dir;
  return (
    `M${k(-10)} ${y}C${k(-12)} ${y - 9 * s} ${k(-2)} ${y - 15 * s} ${k(6)} ${y - 15 * s}C${k(10)} ${y - 15 * s} ${k(12)} ${y - 18 * s} ${k(16)} ${y - 18 * s}` +
    `L${k(24)} ${y - 15 * s}L${k(16)} ${y - 13 * s}C${k(16)} ${y - 6 * s} ${k(10)} ${y} ${k(2)} ${y + 2 * s}L${k(-14)} ${y + 8 * s}L${k(-12)} ${y + 2 * s}Z`
  );
}
const CROWS_R = [crow(980, 690, 1.3, -1), crow(1046, 698, 1.1, 1)].join('');
const CROWS_L = [crow(560, 744, 1.2, 1)].join('');
const FLYING = bird(930, 214, 22) + bird(990, 260, 16) + bird(700, 160, 14) + bird(1120, 190, 12);

export const BloodTree = sceneLayer(
  'BloodTree',
  <>
    <path d="M440 800C540 744 640 730 720 734C820 738 900 760 980 800Z" fill={C.ground} />
    <path d={TREE} fill={C.ground} />
    <path d={FLYING} fill={C.crow} />
  </>
);

// Ground, a crooked fence on the right with two crows on it, dry grass.
const FENCE =
  taper(968, 900, 976, 694, 12, 9) + taper(1052, 900, 1040, 702, 12, 9) + taper(1140, 900, 1150, 724, 12, 9) +
  taper(960, 760, 1150, 790, 8, 8) + taper(964, 820, 1150, 836, 8, 8);
const GRASS = reeds(rng(104), { x0: 380, x1: 1220, base: 905, minH: 24, maxH: 90, count: 40, w: 5, lean: 0.45 });
export const BloodFront = sceneLayer(
  'BloodFront',
  <>
    <path d={ridge(rng(105), { y: 820, amp: 16, step: 180 })} fill={C.ground} />
    <path d={FENCE} fill={C.ground} />
    <path d={CROWS_R + CROWS_L} fill={C.crow} />
    <path d={GRASS.d} fill={C.ground} />
  </>
);
