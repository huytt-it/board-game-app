// Phế tích — a quest location. Paper-cut, 4 layers (far → near): a clouded
// night sky with the moon half hidden, a far hill with broken towers, the
// ruin itself — two pillars under a vault that has fallen in, a gutted wall
// with an empty window — and rubble in front. Palette: ux-plan Phụ lục C.
import type { ParticleGroup, ScenePalette } from '../types';
import { archPath, H, pill, reeds, ridge, rng, sceneLayer, W } from '../paper';

const C = {
  sky: '#1c1a26',
  halo: '#221f2d',
  moon: '#4a4560',
  cloud: '#2c2838',
  cloudDark: '#25222f',
  far: '#15131d',
  ruin: '#0b0a10',
  ruinLit: '#14121b',
  ground: '#0e0d14',
  near: '#08070c',
  mote: '#8a83a6',
};

export const RUINS_PALETTE: ScenePalette = { base: C.sky, accent: C.moon };

export const RUINS_PARTICLES: readonly ParticleGroup[] = [
  { kind: 'mote', count: 10, color: C.mote, area: [600, 300, 1000, 780], size: 3 },
  { kind: 'mote', count: 4, color: C.mote, area: [100, 320, 1500, 760], size: 3 },
];

// A cloud bank: a few long strips of torn paper stacked with an offset.
const cloud = (x0: number, x1: number, y: number, h: number) =>
  pill(x0, y, x1, h) + pill(x0 + (x1 - x0) * 0.18, y - h * 0.7, x1 - (x1 - x0) * 0.3, h) + pill(x0 - 40, y + h * 0.75, x0 + (x1 - x0) * 0.6, h * 0.8);

export const RuinsSky = sceneLayer(
  'RuinsSky',
  <>
    <rect width={W} height={H} fill={C.sky} />
    <circle cx={700} cy={190} r={130} fill={C.halo} />
    <circle cx={700} cy={190} r={38} fill={C.moon} />
    <path d={cloud(600, 1180, 206, 30) + cloud(-40, 480, 112, 34) + cloud(1120, 1700, 150, 32)} fill={C.cloud} />
    <path d={cloud(260, 820, 318, 22) + cloud(960, 1560, 352, 20)} fill={C.cloudDark} />
  </>
);

// A far hill with the stumps of towers and a lone arch.
export const RuinsFar = sceneLayer(
  'RuinsFar',
  <>
    <path d={ridge(rng(61), { y: 640, amp: 26, step: 190 })} fill={C.far} />
    <path
      d={
        'M300 660V560L312 548L322 562L334 540L346 556V660Z' +
        'M420 660V590L432 578L446 594V660Z' +
        'M1180 650V548L1192 536L1204 552L1216 528L1230 546V650Z' +
        'M1330 660V580L1346 570L1360 592V660Z'
      }
      fill={C.far}
    />
    <path d={'M1250 660V600A40 40 0 0 1 1330 600V660H1314V604A24 24 0 0 0 1266 604V660Z'} fill={C.far} />
  </>
);

// The vault: an arch band on two pillars whose crown has fallen in, leaving
// a ragged gap. Each half: points along the outer edge, a broken end, back
// along the inner edge.
const ARCH = { cx: 800, cy: 384, outer: 184, inner: 124 };
const at = (rad: number, deg: number) =>
  `${(ARCH.cx + rad * Math.cos((deg * Math.PI) / 180)).toFixed(1)} ${(ARCH.cy - rad * Math.sin((deg * Math.PI) / 180)).toFixed(1)}`;
function archHalf(from: number, to: number, broken: [number, number][]) {
  const pts: string[] = [];
  const step = from < to ? 9 : -9;
  for (let a = from; step > 0 ? a <= to : a >= to; a += step) pts.push(at(ARCH.outer, a));
  for (const [rad, a] of broken) pts.push(at(rad, a));
  for (let a = to; step > 0 ? a >= from : a <= from; a -= step) pts.push(at(ARCH.inner, a));
  return `M${pts.join('L')}Z`;
}
const VAULT =
  archHalf(180, 108, [[172, 102], [160, 110], [146, 100], [134, 106]]) +
  archHalf(0, 63, [[174, 70], [160, 64], [148, 72], [134, 66]]);

const PILLARS =
  // two pillars with capitals and bases
  'M622 384H682V780H622Z' + 'M608 372H696V392H608Z' + 'M608 760H696V784H608Z' +
  'M918 384H978V780H918Z' + 'M904 372H992V392H904Z' + 'M904 760H992V784H904Z' +
  // a taller fragment of wall on the far left
  'M410 784V318L428 300L446 322L462 296L478 314V784Z';
// A gutted wall on the right with an empty window (the sky shows through).
const WALL = 'M1048 784V452L1070 430L1092 446L1120 414L1150 438L1176 408L1206 432L1232 422V784Z' + archPath(1140, 56, 520, 640, 0.9);

export const RuinsMid = sceneLayer(
  'RuinsMid',
  <>
    <path d={ridge(rng(62), { y: 772, amp: 8, step: 200 })} fill={C.ground} />
    <path d={PILLARS} fill={C.ruin} />
    <path d={VAULT} fill={C.ruin} />
    <path d={WALL} fill={C.ruin} fillRule="evenodd" />
    {/* the lit edge of the standing pillar */}
    <path d="M674 392H682V760H674ZM970 392H978V760H970Z" fill={C.ruinLit} />
  </>
);

// Rubble: a fallen column lying in pieces, scattered blocks, a broken
// capital and tufts of grass in front.
const DRUMS = 'M720 800H790V766H720ZM798 802H866V770H798ZM874 806H912V774H874Z';
const BLOCKS = 'M560 820L600 800L632 820L612 842L568 838ZM1000 826L1036 806L1070 822L1060 848L1010 846Z';
const GRASS = reeds(rng(63), { x0: 520, x1: 1080, base: 900, minH: 20, maxH: 60, count: 26, w: 6, lean: 0.4 });
export const RuinsNear = sceneLayer(
  'RuinsNear',
  <>
    <path d={DRUMS + BLOCKS} fill={C.ruin} />
    <path d={ridge(rng(64), { y: 868, amp: 10, step: 170 })} fill={C.near} />
    <path d="M520 900V858H612V870H600V900ZM1300 900V840L1330 826L1366 846L1380 900Z" fill={C.near} />
    <path d={GRASS.d} fill={C.near} />
  </>
);
