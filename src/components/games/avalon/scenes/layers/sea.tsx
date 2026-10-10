// Biển Tintagel — a quest location. Paper-cut, 4 layers (far → near): a
// sunset sky in flat bands with the sun on the horizon, the sea with the sun's
// path on it and a far headland, the Tintagel cliff crowned by a ruined
// castle, surf and rocks with gulls. Palette: ux-plan Phụ lục C.
import type { ParticleGroup, ScenePalette } from '../types';
import { archPath, bird, blobs, H, pill, ridge, rng, sceneLayer, W } from '../paper';

const C = {
  sky: '#2b2140',
  cloud: '#33264a',
  band: '#4a2f3e',
  horizon: '#7a4a2c',
  sun: '#e0913a',
  sea: '#12304a',
  seaFar: '#183650',
  wave: '#2a5170',
  glint: '#e0913a',
  headland: '#1d1a2e',
  stack: '#121620',
  cliff: '#0b0f14',
  cliffLit: '#161b25',
  foam: '#3d6482',
  gull: '#120d1c',
};

export const SEA_PALETTE: ScenePalette = { base: C.sky, accent: C.sun };

const HORIZON = 600;
const SUN = { x: 905, y: HORIZON - 4, r: 62 };

export const SEA_PARTICLES: readonly ParticleGroup[] = [
  { kind: 'twinkle', count: 7, color: '#f2b56a', area: [860, 612, 950, 800], size: 3 },
  { kind: 'mote', count: 6, color: '#8fb0c4', area: [820, 760, 990, 880], size: 3 },
];

// Sky in flat bands, darkest at the top; a few long cloud streaks, two of
// them crossing the sun.
export const SeaSky = sceneLayer(
  'SeaSky',
  <>
    <rect width={W} height={H} fill={C.sky} />
    <path d={pill(-40, 250, 760, 26) + pill(980, 200, 1700, 22) + pill(420, 330, 1180, 18)} fill={C.cloud} />
    <path d={ridge(rng(51), { y: 430, amp: 14, step: 220 })} fill={C.band} />
    <path d={ridge(rng(52), { y: 528, amp: 10, step: 260 })} fill={C.horizon} />
    <circle cx={SUN.x} cy={SUN.y} r={SUN.r} fill={C.sun} />
    <path d={pill(780, 548, 1060, 10) + pill(840, 568, 1000, 8) + pill(250, 500, 640, 12) + pill(1150, 482, 1520, 12)} fill={C.band} />
  </>
);

// The sea from the horizon down, a far headland on the right, the sun's path
// (short dashes widening towards the viewer) and long low wave crests.
const GLINTS: [number, number, number][] = [
  [606, 112, 5], [618, 86, 5], [632, 104, 6], [650, 74, 6], [672, 92, 7], [700, 62, 7], [734, 80, 8], [776, 48, 8], [826, 64, 9],
];
const WAVES = (() => {
  const r = rng(53);
  let d = '';
  for (let i = 0; i < 26; i++) {
    const y = HORIZON + 20 + Math.pow(r(), 1.4) * 270;
    const len = 60 + (y - HORIZON) * 0.9 * (0.6 + r() * 0.6);
    const x = r() * (W + 200) - 100;
    if (Math.abs(x + len / 2 - SUN.x) < 70) continue; // keep the sun's path clear
    d += pill(x, y, x + len, 3 + (y - HORIZON) / 90);
  }
  return d;
})();

export const SeaWater = sceneLayer(
  'SeaWater',
  <>
    <rect y={HORIZON} width={W} height={H - HORIZON} fill={C.sea} />
    <rect y={HORIZON} width={W} height={26} fill={C.seaFar} />
    <path d="M1360 604C1400 572 1440 560 1500 556C1560 552 1620 566 1680 560V610H1360Z" fill={C.headland} />
    <path d={WAVES} fill={C.wave} />
    {GLINTS.map(([y, w, h], i) => (
      <rect key={i} x={SUN.x - w / 2 + (i % 2 ? 8 : -6)} y={y} width={w} height={h} rx={h / 2} fill={C.glint} opacity={0.55 - i * 0.04} />
    ))}
  </>
);

// The Tintagel headland: a plateau that ends in a sheer face over the sea,
// crowned by a castle in ruins — a snapped tower with an empty window, broken
// walls. A sea stack stands off the coast on wide screens.
const CLIFF =
  'M-60 900V430L80 410L200 442L330 420L450 456L556 470L640 462L740 470L800 482' +
  'L814 524L826 600L838 700L846 800L872 900Z';
const CLIFF_LIT =
  'M800 482L814 524L826 600L838 700L846 800L872 900H858L834 802L824 702L812 602L800 528Z' +
  // strata on the cliff face, visible on wide screens
  'M120 560L420 540L560 572L552 580L420 552L120 572Z' + 'M60 700L330 680L520 716L512 724L330 692L60 712Z' + 'M300 820L600 800L760 836L752 844L600 812L300 832Z';
const TOWER =
  'M652 468V332L664 318L676 328L690 300L704 316L716 304L730 322L744 318V468Z' +
  archPath(698, 22, 368, 410, 0.9);
const WALLS =
  // left wall with merlons, broken off at the right
  'M572 470V420H586V408H600V420H614V408H628V420H646V470Z' +
  // right stump of wall, jagged
  'M752 470V414L764 406L772 420L786 410L794 432V470Z' +
  // the far tower on the left of wide screens
  'M222 444V330L236 316L250 334L262 322V444Z';
const STACK = 'M1226 900L1240 760L1232 700L1252 652L1262 616L1284 606L1296 590L1312 604L1324 640L1318 690L1340 760L1352 900Z';

export const SeaCliff = sceneLayer(
  'SeaCliff',
  <>
    <path d={STACK} fill={C.stack} />
    <path d={CLIFF} fill={C.cliff} />
    <path d={CLIFF_LIT} fill={C.cliffLit} />
    <path d={TOWER} fill={C.cliff} fillRule="evenodd" />
    <path d={WALLS} fill={C.cliff} />
  </>
);

// Surf along the foot of the cliff and the stack, rocks in front, gulls.
const FOAM = [
  [846, 884, 930, 6], [862, 872, 900, 4], [884, 894, 1010, 5], [1212, 888, 1290, 5], [1330, 892, 1400, 5], [1226, 876, 1262, 4],
]
  .map(([x0, y, x1, h]) => pill(x0, y, x1, h))
  .join('');
const ROCKS = blobs([
  [1060, 912, 46], [1112, 920, 40], [1480, 906, 60], [1560, 916, 70], [-20, 910, 60], [540, 924, 44],
]);
const GULLS = bird(986, 368, 18) + bird(1040, 410, 13) + bird(938, 440, 11) + bird(1180, 300, 15);

export const SeaFront = sceneLayer(
  'SeaFront',
  <>
    <path d={FOAM} fill={C.foam} opacity={0.7} />
    <path d={ROCKS} fill={C.cliff} />
    <path d={GULLS} fill={C.gull} />
  </>
);
