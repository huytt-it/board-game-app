// Hang rồng — a quest location. Paper-cut, 4 layers (far → near): the dark
// inside of the cave with the dragon's head barely there, two red-orange eyes
// and its hoard glinting below; the rock face around the cave mouth, with
// stalactites; the mountainside and night sky above; boulders and old bones
// in front. Palette: ux-plan Phụ lục C.
import type { ParticleGroup, ScenePalette } from '../types';
import { blobs, H, pill, rng, scatter, sceneLayer, W } from '../paper';

const C = {
  sky: '#17110f',
  star: '#4a3a30',
  deep: '#0a0706',
  head: '#16100d',
  eye: '#e0663a',
  eyeLit: '#f2a541',
  pupil: '#120d0b',
  hoard: '#3e2f14',
  hoardLit: '#6e5320',
  gold: '#e3b341',
  rock: '#2a201a',
  rockDark: '#211915',
  rockLit: '#33271f',
  ground: '#0e0a08',
  bone: '#3a3028',
};

export const CAVE_PALETTE: ScenePalette = { base: C.sky, accent: C.gold };

const EYES = [
  { x: 744, y: 556, tilt: 0.16 },
  { x: 856, y: 556, tilt: -0.16 },
];

export const CAVE_PARTICLES: readonly ParticleGroup[] = [
  ...EYES.map((e): ParticleGroup => ({ kind: 'flicker', count: 1, color: C.eye, area: [e.x, e.y, e.x, e.y], size: 84 })),
  { kind: 'twinkle', count: 9, color: '#f5d77a', area: [640, 770, 960, 850], size: 3 },
  { kind: 'mote', count: 4, color: '#8a6a4a', area: [600, 420, 1000, 760], size: 3 },
];

const STARS = scatter(rng(81), 18, [0, 0, W, 200], [0.7, 1.5]);

// One almond eye with a slit pupil, tilted so the pair frowns.
function eye({ x, y, tilt }: (typeof EYES)[number]) {
  const t = `rotate(${(tilt * 180) / Math.PI} ${x} ${y})`;
  return (
    <g key={x} transform={t}>
      <path d={`M${x - 32} ${y}C${x - 14} ${y - 18} ${x + 14} ${y - 18} ${x + 32} ${y}C${x + 14} ${y + 14} ${x - 14} ${y + 14} ${x - 32} ${y}Z`} fill={C.eye} />
      <path d={`M${x - 14} ${y - 2}C${x - 6} ${y - 10} ${x + 6} ${y - 10} ${x + 14} ${y - 2}C${x + 6} ${y + 2} ${x - 6} ${y + 2} ${x - 14} ${y - 2}Z`} fill={C.eyeLit} />
      <path d={`M${x} ${y - 13}C${x + 5} ${y - 4} ${x + 5} ${y + 4} ${x} ${y + 11}C${x - 5} ${y + 4} ${x - 5} ${y - 4} ${x} ${y - 13}Z`} fill={C.pupil} />
    </g>
  );
}

// Inside the cave: the night sky (seen above the mountainside), the deep dark
// of the cave, the dragon's head just lighter than the dark, its eyes, and
// the hoard heaped on the cave floor.
// The head, facing out of the dark: a broad brow over the eyes, cheeks
// narrowing to a long snout, horns swept back. Brow ridges and nostrils are
// cut in the dark colour.
const HEAD =
  'M800 488C860 488 920 504 956 530C966 560 956 590 930 612C900 636 872 660 856 690C846 714 826 728 800 728C774 728 754 714 744 690C728 660 700 636 670 612C644 590 634 560 644 530C680 504 740 488 800 488Z' +
  'M676 520C650 478 618 440 570 418C606 452 630 488 648 530ZM924 520C950 478 982 440 1030 418C994 452 970 488 952 530Z';
const BROWS = 'M690 526L782 548L776 556L692 538ZM910 526L818 548L824 556L908 538Z';
const NOSTRILS = 'M776 700C782 690 790 688 794 694C788 698 782 702 776 700ZM824 700C818 690 810 688 806 694C812 698 818 702 824 700Z';
const HOARD = blobs([
  [800, 860, 150], [680, 878, 90], [920, 876, 96], [740, 830, 60], [860, 836, 64], [800, 812, 40],
]);
const COINS = scatter(rng(82), 26, [650, 790, 950, 860], [2.5, 5]);

export const CaveDeep = sceneLayer(
  'CaveDeep',
  <>
    <rect width={W} height={H} fill={C.sky} />
    {STARS.map((s, i) => (
      <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={C.star} opacity={s.o} />
    ))}
    <ellipse cx={800} cy={640} rx={300} ry={360} fill={C.deep} />
    <path d={HEAD} fill={C.head} />
    <path d={BROWS + NOSTRILS} fill={C.deep} />
    {EYES.map(eye)}
    <ellipse cx={800} cy={830} rx={260} ry={90} fill={C.gold} opacity={0.06} />
    <path d={HOARD} fill={C.hoard} />
    {COINS.map((c, i) => (
      <circle key={i} cx={c.x} cy={c.y} r={c.r} fill={i % 3 ? C.hoardLit : C.gold} opacity={i % 3 ? 1 : 0.8} />
    ))}
    {/* a goblet and a crown half buried in the gold */}
    <path d="M700 812h22l-4 12h-4v10h8v4h-22v-4h8v-10h-4zM880 820l6-12 6 8 6-10 6 10 6-8 6 12z" fill={C.hoardLit} />
  </>
);

// The rock face: the mountainside under the sky, a jagged mouth cut out of it
// (the dark inside shows through), stalactites hanging from the mouth's lip,
// darker strata and a lit rim along the mouth.
const MOUTH =
  'M556 920L580 760L560 640L598 520L640 432L700 372L760 344L830 338L900 362L958 420L1000 500L1030 600L1020 720L1044 920Z';
const FACE = 'M-60 920V180L120 150L260 120L420 140L560 96L700 110L800 78L930 104L1060 92L1200 126L1340 110L1480 150L1660 140V920Z';
const STALACTITES =
  'M688 380L700 446L712 372ZM736 352L744 430L756 346ZM790 340L798 400L810 340ZM846 342L852 420L864 346ZM906 366L916 432L926 378Z' +
  'M960 424L968 470L978 444Z';
const STRATA =
  'M-60 300L300 270L520 304L300 290L-60 322Z' + 'M1080 274L1360 246L1660 272V292L1360 266Z' +
  'M60 560L360 520L500 556L360 540L60 584Z' + 'M1120 556L1420 512L1660 540V566L1420 534Z';
const RIM = 'M580 760L560 640L598 520L640 432L700 372L760 344L830 338L900 362L958 420L1000 500L1030 600L1020 720L1044 920H1056L1032 720L1042 600L1012 496L968 412L906 350L830 324L756 332L692 360L628 424L586 516L546 640L566 760L544 920H556Z';

export const CaveRock = sceneLayer(
  'CaveRock',
  <>
    <path d={FACE + MOUTH} fill={C.rock} fillRule="evenodd" />
    <path d={STRATA} fill={C.rockDark} />
    <path d={RIM} fill={C.rockLit} />
    <path d={STALACTITES} fill={C.rock} />
  </>
);

// Foreground: dark ground, boulders either side, a skull and a few bones, a
// knight's sword lying in front of the mouth.
const BOULDERS = blobs([
  [520, 900, 80], [600, 916, 56], [1080, 904, 76], [1010, 918, 50], [140, 880, 110], [1480, 884, 120],
]);
const BONES =
  'M712 872a14 12 0 1 1 28 0v8h-6v6h-16v-6h-6z' + // skull
  pill(760, 880, 812, 6) +
  pill(842, 874, 884, 5) +
  'M760 877a5 5 0 1 0 0 12zM812 877a5 5 0 1 1 0 12z';
const SWORD = 'M884 892L960 862L962 866L886 896ZM952 854L960 872L956 874L948 856Z';

export const CaveFront = sceneLayer(
  'CaveFront',
  <>
    <path d="M-60 920V872C200 860 400 856 560 864C700 870 900 870 1040 864C1200 856 1400 860 1660 872V920Z" fill={C.ground} />
    <path d={BOULDERS} fill={C.ground} />
    <path d={BONES} fill={C.bone} />
    <path d={SWORD} fill={C.bone} />
  </>
);
