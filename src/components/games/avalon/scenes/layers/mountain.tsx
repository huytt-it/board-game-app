// Đèo núi tuyết — a quest location. Paper-cut, 4 layers (far → near): night
// sky with a low moon, a far snowy range whose tallest peak stands in the
// middle, the pass between two great slopes with a trail climbing into it, a
// near ledge with pines, rocks and a cairn. Palette: ux-plan Phụ lục C.
import type { ParticleGroup, ScenePalette } from '../types';
import { blobs, H, mountainPath, pineRow, ridge, rng, scatter, sceneLayer, W } from '../paper';

const C = {
  sky: '#1f2833',
  halo: '#26313e',
  moon: '#c9d2db',
  star: '#8a96a6',
  far: '#3a4756',
  farSnow: '#8d99a7', // the far snow in moonlight, kept dim (#c9d2db at ~45%)
  mid: '#222b36',
  midSnow: '#4a5664',
  slope: '#18202a',
  slopeSnow: '#46525f',
  field: '#212a35',
  trail: '#36424f',
  near: '#121921',
  nearSnow: '#323d49',
  flake: '#e8eef4',
};

export const MOUNTAIN_PALETTE: ScenePalette = { base: C.sky, accent: C.flake };

const MOON = { x: 945, y: 150 };

export const MOUNTAIN_PARTICLES: readonly ParticleGroup[] = [
  { kind: 'snow', count: 13, color: C.flake, area: [570, -20, 1030, 640], size: 3 },
  { kind: 'snow', count: 5, color: C.flake, area: [80, -20, 1520, 600], size: 3 },
];

const STARS = scatter(rng(41), 28, [0, 0, W, 360], [0.7, 1.6], { x: MOON.x, y: MOON.y, r: 100 });

export const MountainSky = sceneLayer(
  'MountainSky',
  <>
    <rect width={W} height={H} fill={C.sky} />
    {STARS.map((s, i) => (
      <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={C.star} opacity={s.o} />
    ))}
    <circle cx={MOON.x} cy={MOON.y} r={92} fill={C.halo} />
    <circle cx={MOON.x} cy={MOON.y} r={34} fill={C.moon} />
  </>
);

// The far range, hand-placed so its tallest peak rises in the middle of the
// pass (x = 800) and reads on a narrow phone too.
const FAR = mountainPath(
  rng(43),
  [
    [-60, 470], [60, 380], [150, 432], [262, 300], [362, 402], [452, 336], [560, 424],
    [662, 326], [736, 280], [800, 212], [872, 300], [930, 330], [1010, 286], [1110, 402],
    [1222, 318], [1330, 424], [1432, 330], [1530, 410], [1660, 360],
  ],
  { caps: 0.34 }
);

// A nearer ridge inside the pass hides the foot of the great peak.
const MID = mountainPath(
  rng(47),
  [[560, 660], [628, 548], [690, 478], [748, 520], [792, 556], [846, 498], [904, 436], [966, 506], [1040, 660]],
  { caps: 0.26 }
);

export const MountainFar = sceneLayer(
  'MountainFar',
  <>
    <path d={FAR.d} fill={C.far} />
    <path d={FAR.caps} fill={C.farSnow} />
    <path d={MID.d} fill={C.mid} />
    <path d={MID.caps} fill={C.midSnow} />
  </>
);

// Two great slopes fall towards the middle and leave a V-shaped pass; snow
// lies along their ledges. A snowfield fills the floor of the pass and a
// trail winds up it.
const LEFT: [number, number][] = [
  [-60, 262], [110, 232], [258, 302], [372, 282], [500, 382], [602, 432], [690, 522], [742, 600], [776, 646],
];
const RIGHT: [number, number][] = [
  [824, 646], [866, 596], [916, 532], [1002, 434], [1098, 380], [1222, 292], [1348, 302], [1482, 240], [1660, 254],
];
const slope = (pts: [number, number][], side: 'left' | 'right') =>
  side === 'left'
    ? `M-60 ${H}` + pts.map(([x, y]) => `L${x} ${y}`).join('') + `L800 690L800 ${H}Z`
    : `M800 ${H}L800 690` + pts.map(([x, y]) => `L${x} ${y}`).join('') + `L1660 ${H}Z`;

// Snow on a ledge: follows the slope's top edge and hangs down 8–20 units.
function ledgeSnow(pts: [number, number][], seed: number) {
  const r = rng(seed);
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    if (r() < 0.35) continue;
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const t0 = 0.05 + r() * 0.2;
    const t1 = 0.65 + r() * 0.3;
    const p = (t: number) => [ax + (bx - ax) * t, ay + (by - ay) * t] as const;
    const [x0, y0] = p(t0);
    const [x1, y1] = p(t1);
    const [xm, ym] = p((t0 + t1) / 2);
    const drop = 10 + r() * 12;
    d += `M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}L${(xm + 6).toFixed(1)} ${(ym + drop).toFixed(1)}L${(xm - 10).toFixed(1)} ${(ym + drop * 0.55).toFixed(1)}Z`;
  }
  return d;
}

export const MountainPass = sceneLayer(
  'MountainPass',
  <>
    <path d={slope(LEFT, 'left')} fill={C.slope} />
    <path d={slope(RIGHT, 'right')} fill={C.slope} />
    <path d={ledgeSnow(LEFT, 44)} fill={C.slopeSnow} />
    <path d={ledgeSnow(RIGHT, 45)} fill={C.slopeSnow} />
    <path d="M770 652C790 646 812 646 830 652C880 700 940 742 1010 780C1070 812 1120 860 1150 900H450C480 856 530 812 590 782C660 746 720 700 770 652Z" fill={C.field} />
    <path d="M796 650H806C812 676 790 702 800 732C812 770 858 808 846 900H748C772 834 756 790 770 752C780 724 800 690 796 650Z" fill={C.trail} />
  </>
);

// Near ledge: a snowy lip, pines on both flanks (clear in the middle so the
// trail stays open), rocks and a stone cairn marking the way.
const r = rng(46);
// Flat stones stacked a little askew.
const CAIRN = [
  [662, 840, 34, 12], [666, 818, 27, 11], [659, 798, 21, 10], [664, 781, 14, 8], [661, 768, 8, 6],
]
  .map(([cx, cy, rx, ry]) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`)
  .join('');
export const MountainNear = sceneLayer(
  'MountainNear',
  <>
    <path d={ridge(r, { y: 826, amp: 12, step: 180 })} fill={C.nearSnow} />
    <path d={ridge(r, { y: 852, amp: 8, step: 160 })} fill={C.near} />
    <path d={pineRow(r, { base: 862, minH: 120, maxH: 260, minW: 50, maxW: 92, spacing: [40, 78], gap: [600, 1000] })} fill={C.near} />
    <path d={blobs([[560, 900, 70], [620, 912, 54], [1010, 906, 66], [1070, 900, 48]])} fill={C.near} />
    <path d={CAIRN} fill={C.near} />
  </>
);
