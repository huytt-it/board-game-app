// Lửa trại — discussion between quests. Paper-cut, 4 layers (far → near):
// night sky, a dark tree line, tents lit by the fire's glow, the campfire.
// Palette: ux-plan Phụ lục C.
import type { ParticleGroup, ScenePalette } from '../types';
import { H, pineRow, ridge, rng, scatter, sceneLayer, W } from '../paper';

const C = {
  sky: '#140f0c',
  star: '#4a3a2c',
  trees: '#0d0907',
  glow: '#e0663a',
  tent: '#2b211a',
  tentLit: '#3a2b1f',
  door: '#120d0a',
  doorLit: '#4a2c16',
  pennant: '#4a3420',
  ground: '#1f1712',
  groundLit: '#271c14',
  stone: '#2b211a',
  log: '#120c09',
  fire: '#e0663a',
  fireCore: '#f2c14e',
  spark: '#f2a541',
};

export const CAMP_PALETTE: ScenePalette = { base: C.sky, accent: C.fireCore };

const FIRE = { x: 800, y: 838 };

export const CAMP_PARTICLES: readonly ParticleGroup[] = [
  { kind: 'flicker', count: 1, color: C.fire, area: [FIRE.x, FIRE.y - 40, FIRE.x, FIRE.y - 40], size: 230 },
  { kind: 'ember', count: 9, color: C.spark, area: [772, 700, 828, 790], size: 3 },
];

const STARS = scatter(rng(21), 24, [0, 0, W, 480], [0.8, 1.8]);

export const CampSky = sceneLayer(
  'CampSky',
  <>
    <rect width={W} height={H} fill={C.sky} />
    {STARS.map((s, i) => (
      <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={C.star} opacity={s.o} />
    ))}
  </>
);

export const CampTreeline = sceneLayer(
  'CampTreeline',
  <path d={pineRow(rng(22), { base: 612, minH: 70, maxH: 170, minW: 46, maxW: 80, spacing: [30, 62] })} fill={C.trees} />
);

// A tent: dark body, the side facing the fire lit, a door slit.
function tent(apexX: number, apexY: number, left: number, right: number, base: number, litSide: 'left' | 'right', open: boolean) {
  const doorW = (right - left) * 0.28;
  const lit =
    litSide === 'right'
      ? `M${apexX} ${apexY}L${right} ${base}L${apexX + (right - apexX) * 0.3} ${base}Z`
      : `M${apexX} ${apexY}L${left} ${base}L${apexX - (apexX - left) * 0.3} ${base}Z`;
  return (
    <g key={apexX}>
      <path d={`M${apexX} ${apexY}L${right} ${base}H${left}Z`} fill={C.tent} />
      <path d={lit} fill={C.tentLit} />
      <path
        d={`M${apexX} ${apexY + (base - apexY) * 0.3}L${apexX + doorW / 2} ${base}H${apexX - doorW / 2}Z`}
        fill={open ? C.doorLit : C.door}
      />
      <path d={`M${apexX - 1.5} ${apexY}v-40h3v40zM${apexX + 1.5} ${apexY - 40}l24 7-24 7z`} fill={C.pennant} />
    </g>
  );
}

// Ground, the fire's glow on it (translucent rings), and the tents around it.
export const CampTents = sceneLayer(
  'CampTents',
  <>
    <path d={ridge(rng(23), { y: 770, amp: 8, step: 200 })} fill={C.ground} />
    <ellipse cx={FIRE.x} cy={FIRE.y} rx={520} ry={120} fill={C.groundLit} />
    <ellipse cx={FIRE.x} cy={FIRE.y - 40} rx={660} ry={330} fill={C.glow} opacity={0.035} />
    <ellipse cx={FIRE.x} cy={FIRE.y - 30} rx={440} ry={220} fill={C.glow} opacity={0.045} />
    <ellipse cx={FIRE.x} cy={FIRE.y - 20} rx={260} ry={140} fill={C.glow} opacity={0.055} />
    {tent(330, 640, 228, 432, 792, 'right', false)}
    {tent(640, 592, 545, 735, 800, 'right', false)}
    {tent(965, 602, 870, 1060, 800, 'left', true)}
    {tent(1280, 632, 1170, 1390, 792, 'left', false)}
  </>
);

// Stones in a ring, crossed logs, a three-tongued flame; log seats; grass tufts.
const STONES = Array.from({ length: 9 }, (_, i) => {
  const a = Math.PI * (i / 8);
  return [FIRE.x - Math.cos(a) * 72, FIRE.y + 4 + Math.sin(a) * 9] as const;
});
const TUFTS = [40, 110, 190, 1420, 1500, 1570]
  .map((x) => `M${x - 26} 900L${x - 14} 860L${x - 6} 896L${x} 846L${x + 8} 896L${x + 16} 866L${x + 26} 900Z`)
  .join('');

export const CampFire = sceneLayer(
  'CampFire',
  <>
    <path d="M590 872h130a11 11 0 0 1 0 22H590a11 11 0 0 1 0-22ZM880 876h130a11 11 0 0 1 0 22H880a11 11 0 0 1 0-22Z" fill={C.stone} />
    <path d="M592 872h126a9 9 0 0 1 9 6H583a9 9 0 0 1 9-6ZM882 876h126a9 9 0 0 1 9 6H873a9 9 0 0 1 9-6Z" fill={C.tentLit} />
    <path d="M744 846 852 818 858 832 750 860ZM748 818 856 846 850 860 742 832Z" fill={C.log} />
    <path
      d="M762 842C744 802 764 772 776 750C780 772 790 778 792 762C794 737 806 716 812 692C822 722 836 744 830 770C842 762 846 750 848 740C862 774 860 814 838 842Z"
      fill={C.fire}
    />
    <path d="M782 842C772 816 784 796 792 782C796 796 804 794 806 776C818 794 826 816 818 842Z" fill={C.fireCore} />
    {STONES.map(([x, y], i) => (
      <ellipse key={i} cx={x} cy={y} rx={13} ry={8} fill={C.stone} />
    ))}
    <path d={TUFTS} fill={C.log} />
  </>
);
