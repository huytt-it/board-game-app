// Đại sảnh Camelot — lobby, lineup and role reveal. Paper-cut, 4 layers
// (far → near): back wall with lancet windows, the arcade with banners and
// torches, the floor, the Round Table. Palette: ux-plan Phụ lục C.
import type { ParticleGroup, ScenePalette } from '../types';
import { archPath, H, sceneLayer, W } from '../paper';

const C = {
  wall: '#23170f',
  arch: '#3a2a1c',
  capital: '#2c1f14',
  glass: '#4a3624',
  banner: '#9a7024',
  bannerInk: '#6e5019',
  torch: '#f2a541',
  torchCore: '#ffd9a0',
  floor: '#1a110b',
  floorEdge: '#2a1c12',
  shade: '#150e09',
  chair: '#2b1d12',
  table: '#5a3a1e',
  tableTop: '#7c5229',
  tableInlay: '#6a4524',
};

export const HALL_PALETTE: ScenePalette = { base: C.wall, accent: C.torch };

// Torch flames sit at these points (flame base), shared with the flicker glows.
const TORCHES = [560, 640, 960, 1040] as const;
const TORCH_Y = 520;

export const HALL_PARTICLES: readonly ParticleGroup[] = [
  ...TORCHES.map(
    (x): ParticleGroup => ({ kind: 'flicker', count: 1, color: C.torch, area: [x, TORCH_Y - 16, x, TORCH_Y - 16], size: 120 })
  ),
  { kind: 'mote', count: 8, color: '#f2c88a', area: [600, 180, 1000, 660], size: 3 },
];

// Back wall, seen through the arches: three lancet windows and a rose window.
const lancets = [740, 800, 860].map((cx) => archPath(cx, 38, 250, 470, 0.9)).join('');
export const HallBack = sceneLayer(
  'HallBack',
  <>
    <rect width={W} height={H} fill={C.wall} />
    <path d={lancets} fill={C.glass} />
    <circle cx={800} cy={195} r={30} fill={C.glass} />
    <path d="M800 171v48M776 195h48M783 178l34 34M817 178l-34 34" stroke={C.wall} strokeWidth={5} />
    {/* side windows, seen through the side arches on wide screens */}
    <path d={[262, 428, 1172, 1338].map((cx) => archPath(cx, 40, 340, 540, 0.9)).join('')} fill={C.glass} opacity={0.7} />
  </>
);

// One banner hanging from a rod, swallow-tailed, with a cross.
function banner(x: number, top: number, bottom: number) {
  const w = 62;
  return (
    <g key={x}>
      <rect x={x - 40} y={top - 9} width={80} height={8} rx={3} fill={C.floor} />
      <path d={`M${x - w / 2} ${top}H${x + w / 2}V${bottom}L${x} ${bottom - 26}L${x - w / 2} ${bottom}Z`} fill={C.banner} />
      <path d={`M${x - 4} ${top + 50}h8v62h-8zM${x - 19} ${top + 70}h38v8h-38z`} fill={C.bannerInk} />
    </g>
  );
}

function torch(x: number) {
  const y = TORCH_Y;
  return (
    <g key={x}>
      <circle cx={x} cy={y - 18} r={64} fill={C.torch} opacity={0.08} />
      <path d={`M${x - 14} ${y + 46}h28l-6 14h-16z`} fill={C.floor} />
      <rect x={x - 5} y={y} width={10} height={52} rx={3} fill={C.floor} />
      <path d={`M${x} ${y - 44}C${x + 17} ${y - 24} ${x + 14} ${y - 2} ${x} ${y + 4}C${x - 14} ${y - 2} ${x - 17} ${y - 24} ${x} ${y - 44}Z`} fill={C.torch} />
      <path d={`M${x} ${y - 24}C${x + 8} ${y - 12} ${x + 7} ${y - 1} ${x} ${y + 2}C${x - 7} ${y - 1} ${x - 8} ${y - 12} ${x} ${y - 24}Z`} fill={C.torchCore} />
    </g>
  );
}

// The arcade: a lit stone wall with three pointed openings (the back wall shows
// through), capitals on the pillars, banners and torches.
const ARCADE =
  `M-20 -20H${W + 20}V720H-20Z` +
  archPath(800, 400, 400, 720) +
  archPath(345, 350, 430, 720) +
  archPath(1255, 350, 430, 720);
export const HallArcade = sceneLayer(
  'HallArcade',
  <>
    <path d={ARCADE} fill={C.arch} fillRule="evenodd" />
    <path d="M505 392h110v14H505zM985 392h110v14H985zM150 422h40v12h-40zM1410 422h40v12h-40z" fill={C.capital} />
    {[690, 910, 345, 1255].map((x) => banner(x, x === 690 || x === 910 ? 230 : 300, x === 690 || x === 910 ? 440 : 480))}
    {TORCHES.map(torch)}
  </>
);

// Floor with a lighter lip and perspective joints, framed by dark pillars on wide screens.
export const HallFloor = sceneLayer(
  'HallFloor',
  <>
    <rect y={705} width={W} height={H - 705} fill={C.floor} />
    <rect y={700} width={W} height={12} fill={C.floorEdge} />
    <path d="M800 712V900M640 712 520 900M960 712 1080 900M480 712 240 900M1120 712 1360 900M300 712 -40 900M1300 712 1640 900" stroke={C.floorEdge} strokeWidth={3} />
    <path d={`M-20 0H150V${H}H-20ZM${W - 150} 0H${W + 20}V${H}H${W - 150}Z`} fill={C.shade} />
  </>
);

// High-backed chairs behind the Round Table, two candles on it.
const CHAIRS = [520, 660, 800, 940, 1080]
  .map((x) => `M${x - 34} 820V712L${x} 676L${x + 34} 712V820Z`)
  .join('');
export const HallTable = sceneLayer(
  'HallTable',
  <>
    <path d={CHAIRS} fill={C.chair} />
    <rect x={370} y={840} width={860} height={70} fill={C.table} />
    <ellipse cx={800} cy={840} rx={430} ry={68} fill={C.tableTop} />
    <ellipse cx={800} cy={840} rx={370} ry={50} fill={C.tableInlay} />
    {[690, 910].map((x) => (
      <g key={x}>
        <rect x={x - 5} y={800} width={10} height={26} rx={2} fill="#e8d9b8" />
        <path d={`M${x} 784c6 7 6 13 0 16c-6-3-6-9 0-16Z`} fill={C.torch} />
      </g>
    ))}
  </>
);
