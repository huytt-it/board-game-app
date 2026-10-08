// Đầm lầy sương — a quest location. Paper-cut, 4 layers (far → near): a pale
// moon low in a misty sky, the far bank with dead trees, the black water with
// a dead tree on a hummock, a rotten boardwalk and low mist, reeds and
// cattails framing the view. Will-o'-the-wisps drift over the water.
// Palette: ux-plan Phụ lục C.
import type { ParticleGroup, ScenePalette } from '../types';
import { blobs, deadTree, H, pill, reeds, ridge, rng, sceneLayer, W } from '../paper';

const C = {
  sky: '#1a2420',
  halo: '#1f2b26',
  moon: '#8fa596',
  far: '#141d19',
  mist: '#2c3a33',
  mistLight: '#34443c',
  water: '#121b17',
  sheen: '#22302a',
  hummock: '#0f1714',
  plank: '#1c2621',
  reed: '#0c1310',
  pad: '#111b16',
  wisp: '#9fe3c8',
};

export const MARSH_PALETTE: ScenePalette = { base: C.sky, accent: C.wisp };

const MOON = { x: 905, y: 250 };

export const MARSH_PARTICLES: readonly ParticleGroup[] = [
  { kind: 'firefly', count: 9, color: C.wisp, area: [610, 560, 990, 800], size: 6 },
  { kind: 'firefly', count: 4, color: C.wisp, area: [100, 560, 1500, 800], size: 5 },
  { kind: 'mote', count: 5, color: '#6f8a7e', area: [560, 600, 1040, 760], size: 4 },
];

export const MarshSky = sceneLayer(
  'MarshSky',
  <>
    <rect width={W} height={H} fill={C.sky} />
    <circle cx={MOON.x} cy={MOON.y} r={88} fill={C.halo} />
    <circle cx={MOON.x} cy={MOON.y} r={30} fill={C.moon} />
    <path d={pill(760, 262, 1060, 10) + pill(820, 278, 980, 8)} fill={C.mist} />
  </>
);

// The far bank: a low line of hummocks and bare trees, mist at its foot.
const fr = rng(71);
const FAR_TREES =
  deadTree(fr, 180, 580, 170, { depth: 3 }) +
  deadTree(fr, 430, 582, 120, { depth: 3 }) +
  deadTree(fr, 1180, 578, 150, { depth: 3 }) +
  deadTree(fr, 1430, 584, 190, { depth: 3 }) +
  deadTree(fr, 960, 586, 110, { depth: 3, lean: 0.12 });
export const MarshFar = sceneLayer(
  'MarshFar',
  <>
    <path d={ridge(rng(72), { y: 580, amp: 10, step: 150 })} fill={C.far} />
    <path d={FAR_TREES} fill={C.far} />
    <path d={ridge(rng(78), { y: 572, amp: 9, step: 140, bottom: 604 })} fill={C.mist} />
  </>
);

// The water: sheen streaks and the moon's broken reflection, a hummock with
// a dead tree left of centre, a sunken boardwalk leading out towards it, and
// mist lying low over everything.
const SHEEN = [
  [120, 640, 420, 3], [1000, 630, 1240, 3], [1240, 664, 1500, 4], [880, 700, 1120, 4],
]
  .map(([x0, y, x1, h]) => pill(x0, y, x1, h))
  .join('');
const MOON_PATH = [
  [612, 40, 4], [628, 30, 4], [646, 44, 5], [668, 26, 5], [694, 36, 6],
]
  .map(([y, w, h]) => pill(MOON.x - w / 2, y, MOON.x + w / 2, h))
  .join('');
const TREE = deadTree(rng(73), 676, 694, 300, { depth: 5, spread: 0.6, lean: -0.08 });
// A rotten boardwalk running out from the near bank to the hummock: planks
// between two rails that converge with distance; some planks are gone.
const WALK = { near: { y: 920, x: 840, w: 210 }, far: { y: 724, x: 724, w: 34 } };
const walkAt = (t: number) => {
  const { near, far } = WALK;
  const e = 1 - Math.pow(1 - t, 1.8); // planks crowd together with distance
  return { y: near.y + (far.y - near.y) * e, x: near.x + (far.x - near.x) * e, w: near.w + (far.w - near.w) * e };
};
const PLANKS = Array.from({ length: 11 }, (_, i) => i)
  .filter((i) => i !== 3 && i !== 7)
  .map((i) => {
    const a = walkAt(i / 11);
    const b = walkAt(i / 11 + 0.045);
    const tilt = i === 5 ? 5 : i === 8 ? -3 : 0;
    return `M${(a.x - a.w / 2).toFixed(1)} ${(a.y + tilt).toFixed(1)}L${(a.x + a.w / 2).toFixed(1)} ${(a.y - tilt).toFixed(1)}L${(b.x + b.w / 2).toFixed(1)} ${(b.y - tilt).toFixed(1)}L${(b.x - b.w / 2).toFixed(1)} ${(b.y + tilt).toFixed(1)}Z`;
  })
  .join('');
const POSTS = [0.08, 0.3, 0.52, 0.74]
  .map((t) => {
    const p = walkAt(t);
    const h = 14 + p.w * 0.22;
    const pw = 3 + p.w * 0.03;
    return `M${(p.x - p.w / 2 - pw).toFixed(1)} ${(p.y + 4).toFixed(1)}h${pw.toFixed(1)}v${(-h).toFixed(1)}h${(-pw).toFixed(1)}zM${(p.x + p.w / 2).toFixed(1)} ${(p.y + 4).toFixed(1)}h${pw.toFixed(1)}v${(-h).toFixed(1)}h${(-pw).toFixed(1)}z`;
  })
  .join('');

export const MarshWater = sceneLayer(
  'MarshWater',
  <>
    <rect y={600} width={W} height={H - 600} fill={C.water} />
    <path d={SHEEN} fill={C.sheen} />
    <path d={MOON_PATH} fill={C.moon} opacity={0.25} />
    <path d={blobs([[660, 716, 70], [720, 722, 50], [590, 724, 44]])} fill={C.hummock} />
    <path d={TREE} fill={C.hummock} />
    <path d={blobs([[1240, 700, 60], [1300, 708, 44], [300, 690, 54], [250, 700, 40]])} fill={C.hummock} />
    <path d={PLANKS} fill={C.plank} />
    <path d={POSTS} fill={C.hummock} />
    <path d={ridge(rng(79), { y: 730, amp: 10, step: 160, bottom: 760 })} fill={C.mist} opacity={0.55} />
    <path d={ridge(rng(80), { y: 800, amp: 8, step: 200, bottom: 822, x0: 300, x1: 1300 })} fill={C.mistLight} opacity={0.35} />
  </>
);

// Reeds and cattails on both sides; lily pads on the water in between.
const LEFT = reeds(rng(74), { x0: 360, x1: 660, base: 905, minH: 110, maxH: 320, count: 28, w: 8, lean: 0.18, heads: 0.3 });
const RIGHT = reeds(rng(75), { x0: 940, x1: 1260, base: 905, minH: 110, maxH: 300, count: 28, w: 8, lean: 0.18, heads: 0.3 });
const EDGES = reeds(rng(76), { x0: -40, x1: 260, base: 905, minH: 80, maxH: 220, count: 14, w: 8, heads: 0.2 });
const EDGES_R = reeds(rng(77), { x0: 1360, x1: 1640, base: 905, minH: 80, maxH: 220, count: 14, w: 8, heads: 0.2 });
const PADS = [
  [700, 862, 26, 7], [742, 880, 20, 6], [868, 852, 22, 6], [912, 874, 28, 8],
]
  .map(([cx, cy, rx, ry]) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`)
  .join('');

export const MarshReeds = sceneLayer(
  'MarshReeds',
  <>
    <path d={PADS} fill={C.pad} />
    <path d={LEFT.d + RIGHT.d + EDGES.d + EDGES_R.d} fill={C.reed} />
    <path d={LEFT.heads + RIGHT.heads + EDGES.heads + EDGES_R.heads} fill={C.reed} />
  </>
);
