// Đêm Camelot — the night reveals. Paper-cut, 4 layers (far → near): starry
// sky with a crescent moon, rolling hills, Camelot on its mound with a few lit
// windows, a dark foreground with pines. Palette: ux-plan Phụ lục C.
import type { ParticleGroup, ScenePalette } from '../types';
import { H, pineRow, ridge, rng, scatter, sceneLayer, W } from '../paper';

const C = {
  sky: '#0e1326',
  halo: '#111730',
  haloIn: '#131a35',
  star: '#cfd6ff',
  moon: '#e8e3c9',
  hills: '#0a0f20',
  hillsNear: '#080c1a',
  castle: '#05070f',
  window: '#f2c14e',
  front: '#03050b',
};

export const NIGHT_PALETTE: ScenePalette = { base: C.sky, accent: C.moon };

const MOON = { x: 905, y: 165 };

export const NIGHT_PARTICLES: readonly ParticleGroup[] = [
  { kind: 'twinkle', count: 5, color: C.star, area: [600, 40, 1000, 330], size: 3 },
  { kind: 'twinkle', count: 5, color: C.star, area: [80, 40, 1520, 430], size: 3 },
  { kind: 'flicker', count: 1, color: C.window, area: [800, 452, 800, 452], size: 26 },
  { kind: 'flicker', count: 1, color: C.window, area: [575, 470, 575, 470], size: 22 },
];

const STARS = scatter(rng(11), 46, [0, 0, W, 560], [0.8, 2.2], { x: MOON.x, y: MOON.y, r: 110 });

export const NightSky = sceneLayer(
  'NightSky',
  <>
    <rect width={W} height={H} fill={C.sky} />
    {STARS.map((s, i) => (
      <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={C.star} opacity={s.o} />
    ))}
    <path d="M330 110l4 14 14 4-14 4-4 14-4-14-14-4 14-4zM1240 80l3 11 11 3-11 3-3 11-3-11-11-3 11-3zM690 300l3 10 10 3-10 3-3 10-3-10-10-3 10-3z" fill={C.star} />
    <circle cx={MOON.x} cy={MOON.y} r={130} fill={C.halo} />
    <circle cx={MOON.x} cy={MOON.y} r={85} fill={C.haloIn} />
    <circle cx={MOON.x} cy={MOON.y} r={46} fill={C.moon} />
    <circle cx={MOON.x + 22} cy={MOON.y - 13} r={40} fill={C.haloIn} />
  </>
);

export const NightHills = sceneLayer(
  'NightHills',
  <>
    <path d={ridge(rng(12), { y: 610, amp: 28, step: 160 })} fill={C.hills} />
    <path d={ridge(rng(13), { y: 665, amp: 18, step: 130 })} fill={C.hillsNear} />
  </>
);

// Camelot, symmetrical around x = 800 so it reads on a narrow phone too.
const merlons = (x0: number, x1: number, top: number) => {
  let d = '';
  for (let x = x0; x + 18 <= x1; x += 34) d += `M${x} ${top}v-16h18v16z`;
  return d;
};
const tower = (x: number, w: number, top: number, roofH: number) =>
  `M${x - w / 2} 650V${top}H${x + w / 2}V650Z` +
  `M${x - w / 2 - 10} ${top}L${x} ${top - roofH}L${x + w / 2 + 10} ${top}Z` +
  `M${x - 1.5} ${top - roofH}v-34h3v34z` +
  `M${x + 1.5} ${top - roofH - 34}l26 8-26 8z`;
const CASTLE =
  'M300 900C520 650 640 615 800 610C960 615 1080 650 1300 900Z' + // mound
  'M560 650V520H1040V650Z' + // curtain wall
  merlons(562, 1040, 520) +
  'M700 650V400H900V650Z' + // keep
  merlons(702, 900, 400) +
  tower(800, 70, 290, 110) + // spire
  tower(575, 60, 410, 90) +
  tower(1025, 60, 430, 85) +
  'M690 410V362H720V410ZM880 410V362H910V410ZM683 362L705 330L727 362ZM873 362L895 330L917 362Z' +
  'M380 660V565H560V660ZM1040 660V565H1220V660Z' + // outer walls
  merlons(382, 560, 565) +
  merlons(1042, 1220, 565) +
  tower(385, 50, 505, 70) +
  tower(1215, 50, 505, 70);

// Lit windows: small round-headed slits.
const win = (x: number, y: number, h = 16) => `M${x - 4} ${y + h}V${y + 4}a4 4 0 0 1 8 0V${y + h}Z`;
const WINDOWS = [
  win(800, 320),
  win(770, 440),
  win(830, 440),
  win(800, 452, 18),
  win(740, 500),
  win(860, 500),
  win(575, 462),
  win(1025, 480),
  win(650, 560),
  win(950, 560),
].join('');

export const NightCastle = sceneLayer(
  'NightCastle',
  <>
    <path d={CASTLE} fill={C.castle} />
    <path d={WINDOWS} fill={C.window} />
    <path d="M776 650V618a24 24 0 0 1 48 0V650Z" fill="#0c0f1c" />
  </>
);

const r = rng(14);
export const NightFront = sceneLayer(
  'NightFront',
  <>
    <path d={ridge(r, { y: 800, amp: 16, step: 140 })} fill={C.front} />
    <path d={pineRow(r, { base: 812, minH: 90, maxH: 210, minW: 40, maxW: 70, spacing: [36, 70], gap: [560, 1040] })} fill={C.front} />
  </>
);
