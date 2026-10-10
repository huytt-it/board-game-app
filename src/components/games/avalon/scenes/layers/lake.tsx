// Hồ Avalon — the Lady of the Lake. Paper-cut, 4 layers (far → near): a misty
// night sky with a pale moon, the far shore and the Isle of Avalon in the
// mist, the still lake with an arm rising from it to hold up Excalibur, the
// near shore with reeds and stones. Palette: ux-plan Phụ lục C.
import type { ParticleGroup, ScenePalette } from '../types';
import { blobs, H, pill, reeds, ridge, rng, scatter, sceneLayer, W } from '../paper';

const C = {
  sky: '#132a33',
  star: '#5f8a95',
  halo: '#17313b',
  moon: '#c8d8dc',
  far: '#173540',
  isle: '#14303a',
  mist: '#1f4450',
  mistLight: '#2a5560',
  water: '#0d222a',
  sheen: '#123039',
  reflection: '#1a3a44',
  ripple: '#3f7280',
  blade: '#d6dee3',
  fuller: '#a9b8bf',
  hilt: '#b8a24a',
  grip: '#6b5a2a',
  samite: '#9fb3bb',
  samiteShade: '#7e949d',
  shore: '#0a1a20',
  reed: '#081519',
};

export const LAKE_PALETTE: ScenePalette = { base: C.sky, accent: C.blade };

const MOON = { x: 948, y: 132 };
const WATERLINE = 708;
const SWORD = { x: 800, tip: 268, guard: 566 };

export const LAKE_PARTICLES: readonly ParticleGroup[] = [
  { kind: 'twinkle', count: 2, color: '#ffffff', area: [797, 300, 803, 520], size: 4 },
  { kind: 'mote', count: 8, color: '#6f9aa5', area: [560, 540, 1040, 700], size: 4 },
  { kind: 'twinkle', count: 4, color: '#6fa3ae', area: [640, 712, 960, 770], size: 3 },
];

const STARS = scatter(rng(91), 26, [0, 0, W, 420], [0.7, 1.6], { x: MOON.x, y: MOON.y, r: 90 });

export const LakeSky = sceneLayer(
  'LakeSky',
  <>
    <rect width={W} height={H} fill={C.sky} />
    {STARS.map((s, i) => (
      <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={C.star} opacity={s.o} />
    ))}
    <circle cx={MOON.x} cy={MOON.y} r={80} fill={C.halo} />
    <circle cx={MOON.x} cy={MOON.y} r={28} fill={C.moon} />
  </>
);

// The far shore, low hills and the Isle of Avalon with its tower rising out
// of the mist on the right; banks of mist across the water's far edge.
const ISLE =
  'M1040 612C1090 560 1150 540 1210 538C1270 540 1330 566 1380 612Z' +
  'M1196 548V470L1210 452L1224 470V548Z' + 'M1190 470L1210 430L1230 470Z';
export const LakeFar = sceneLayer(
  'LakeFar',
  <>
    <path d={ridge(rng(92), { y: 596, amp: 18, step: 180 })} fill={C.far} />
    <path d={ISLE} fill={C.isle} />
    <path d={pill(-40, 580, 720, 22) + pill(560, 592, 1200, 18) + pill(1100, 584, 1680, 24)} fill={C.mist} />
    <path d={pill(200, 604, 900, 12) + pill(980, 600, 1500, 10)} fill={C.mistLight} opacity={0.6} />
  </>
);

// The lake: sheen and the moon's reflection, low mist; in the middle an arm
// in white samite rises from the water, holding Excalibur blade-up, with
// rings spreading round it and its reflection below.
const SHEEN = [
  [60, 640, 520, 4], [660, 634, 1000, 3], [1080, 650, 1560, 4], [200, 690, 560, 5], [1040, 700, 1400, 5], [100, 780, 480, 6], [1150, 800, 1520, 6],
]
  .map(([x0, y, x1, h]) => pill(x0, y, x1, h))
  .join('');
const MOON_PATH = [
  [618, 36, 4], [636, 26, 4], [656, 40, 5], [680, 24, 5],
]
  .map(([y, w, h]) => pill(MOON.x - w / 2, y, MOON.x + w / 2, h))
  .join('');
const { x, tip, guard } = SWORD;
const BLADE = `M${x} ${tip}L${x + 13} ${tip + 46}L${x + 12} ${guard}H${x - 12}L${x - 13} ${tip + 46}Z`;
const FULLER = `M${x - 2.5} ${tip + 60}H${x + 2.5}V${guard - 8}H${x - 2.5}Z`;
const GUARD = `M${x - 58} ${guard}C${x - 40} ${guard - 6} ${x + 40} ${guard - 6} ${x + 58} ${guard}C${x + 40} ${guard + 10} ${x - 40} ${guard + 10} ${x - 58} ${guard}Z`;
const POMMEL = blobs([[x, guard + 58, 8]]);
// A slender forearm in a samite sleeve rises from the water, slightly
// slanted, the fist closed round the grip (knuckles towards the viewer).
const ARM =
  `M${x - 22} ${WATERLINE + 4}C${x - 20} ${WATERLINE - 50} ${x - 14} ${guard + 90} ${x - 12} ${guard + 48}` +
  `H${x + 12}C${x + 13} ${guard + 90} ${x + 17} ${WATERLINE - 50} ${x + 22} ${WATERLINE + 4}Z`;
const SLEEVE_SHADE =
  `M${x + 3} ${guard + 52}H${x + 12}C${x + 13} ${guard + 90} ${x + 17} ${WATERLINE - 50} ${x + 22} ${WATERLINE + 4}H${x + 9}` +
  `C${x + 7} ${WATERLINE - 50} ${x + 4} ${guard + 90} ${x + 3} ${guard + 52}Z`;
const HAND =
  `M${x - 15} ${guard + 12}C${x - 19} ${guard + 18} ${x - 19} ${guard + 40} ${x - 12} ${guard + 50}H${x + 12}` +
  `C${x + 17} ${guard + 42} ${x + 18} ${guard + 20} ${x + 13} ${guard + 12}C${x + 6} ${guard + 8} ${x - 8} ${guard + 8} ${x - 15} ${guard + 12}Z`;
const KNUCKLES = `M${x - 14} ${guard + 22}H${x + 14}V${guard + 24}H${x - 14}ZM${x - 15} ${guard + 32}H${x + 15}V${guard + 34}H${x - 15}Z`;
const RINGS: [number, number, number][] = [
  [66, 9, 0.7], [118, 15, 0.5], [180, 21, 0.35], [252, 28, 0.22],
];

export const LakeWater = sceneLayer(
  'LakeWater',
  <>
    <rect y={600} width={W} height={H - 600} fill={C.water} />
    <path d={SHEEN} fill={C.sheen} />
    <path d={MOON_PATH} fill={C.moon} opacity={0.22} />
    <path d={`M${x - 26} ${WATERLINE + 8}H${x + 26}L${x + 8} ${WATERLINE + 150}H${x - 8}Z`} fill={C.reflection} />
    {RINGS.map(([rx, ry, o]) => (
      <ellipse key={rx} cx={x} cy={WATERLINE + 2} rx={rx} ry={ry} fill="none" stroke={C.ripple} strokeWidth={3} opacity={o} />
    ))}
    <path d={BLADE} fill={C.blade} />
    <path d={FULLER} fill={C.fuller} />
    <path d={ARM} fill={C.samite} />
    <path d={SLEEVE_SHADE} fill={C.samiteShade} />
    <rect x={x - 6} y={guard + 4} width={12} height={50} rx={3} fill={C.grip} />
    <path d={GUARD} fill={C.hilt} />
    <path d={HAND} fill={C.samite} />
    <path d={KNUCKLES} fill={C.samiteShade} />
    <path d={POMMEL} fill={C.hilt} />
    <path d={pill(-40, 744, 600, 18) + pill(1000, 736, 1680, 20)} fill={C.mist} opacity={0.55} />
  </>
);

// The near shore: a dark bank with stones and reeds on both sides, open in
// the middle so the sword stays clear.
const LEFT = reeds(rng(93), { x0: 380, x1: 640, base: 905, minH: 90, maxH: 250, count: 26, w: 7, lean: 0.2, heads: 0.15 });
const RIGHT = reeds(rng(94), { x0: 960, x1: 1240, base: 905, minH: 90, maxH: 240, count: 26, w: 7, lean: 0.2, heads: 0.15 });
export const LakeShore = sceneLayer(
  'LakeShore',
  <>
    <path d="M-60 920V836C200 852 420 870 600 880C720 886 880 886 1000 880C1180 870 1400 852 1660 836V920Z" fill={C.shore} />
    <path d={blobs([[560, 890, 30], [604, 900, 22], [1010, 896, 26], [1046, 904, 18], [240, 860, 40], [1380, 862, 44]])} fill={C.shore} />
    <path d={LEFT.d + RIGHT.d} fill={C.reed} />
    <path d={LEFT.heads + RIGHT.heads} fill={C.reed} />
  </>
);
