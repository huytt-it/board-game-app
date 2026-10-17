// Bầy Sói thắng — đêm cuối. Cắt giấy 4 lớp (xa → gần): trời tím đen, trăng máu
// lớn (đỏ trầm, không chói) có mây cắt ngang; đồi đá giữa có hai con sói tru in
// bóng trước trăng; ngôi làng tắt hết đèn; bìa rừng. Đây là kết quả công khai
// của cả bàn, nên màu đỏ của phe Sói được phép ở cảnh này.
import type { ParticleGroup, ScenePalette } from '../types';
import { blobs, H, pill, pineRow, ridge, rng, scatter, sceneLayer, W } from '@/components/games/avalon/scenes/paper';
import { VILLAGE_BACK, VILLAGE_FRONT } from '../village';

const C = {
  sky: '#100a17',
  band1: '#160e20',
  band2: '#1d1127',
  band3: '#26132d',
  band4: '#32162f',
  star: '#c7b7d6',
  halo: '#2a1427',
  haloIn: '#3b182c',
  moon: '#b3504b',
  crater: '#9b4440',
  cloud: '#1a0f1f',
  hillsFar: '#1d1022',
  rock: '#120a16',
  villageBack: '#130b18',
  village: '#0b070f',
  front: '#07040a',
};

export const END_WOLVES_PALETTE: ScenePalette = { base: C.sky, accent: C.moon };

// Trăng và đồi đá lệch phải tháp chuông (x = 800) để sói không bị tháp che;
// điện thoại (x ≈ 590–1010) vẫn thấy cả hai.
const MOON = { x: 930, y: 360, r: 82 };

export const END_WOLVES_PARTICLES: readonly ParticleGroup[] = [{ kind: 'twinkle', count: 9, color: C.star, area: [80, 40, 1520, 380], size: 2 }];

const STARS = scatter(rng(121), 40, [0, 0, W, 460], [0.6, 1.8], { x: MOON.x, y: MOON.y, r: 230 });

const BANDS: [number, number, string][] = [
  [330, 34, C.band1],
  [440, 28, C.band2],
  [530, 22, C.band3],
  [600, 16, C.band4],
];

export const EndWolvesSky = sceneLayer(
  'EndWolvesSky',
  <>
    <rect width={W} height={H} fill={C.sky} />
    {BANDS.map(([y, amp, fill], i) => (
      <path key={i} d={ridge(rng(122 + i), { y, amp, step: 300 })} fill={fill} />
    ))}
    {STARS.map((s, i) => (
      <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={C.star} opacity={s.o * 0.7} />
    ))}
    <circle cx={MOON.x} cy={MOON.y} r={MOON.r * 2.4} fill={C.halo} />
    <circle cx={MOON.x} cy={MOON.y} r={MOON.r * 1.6} fill={C.haloIn} />
    <circle cx={MOON.x} cy={MOON.y} r={MOON.r} fill={C.moon} />
    <path
      d={blobs([
        [MOON.x - 26, MOON.y - 22, 14],
        [MOON.x + 24, MOON.y + 4, 19],
        [MOON.x - 6, MOON.y + 34, 9],
        [MOON.x + 30, MOON.y - 40, 7],
      ])}
      fill={C.crater}
    />
    <path d={pill(760, 318, 1010, 12) + pill(820, 334, 930, 7) + pill(980, 404, 1190, 10)} fill={C.cloud} />
  </>
);

// Sói ngồi tru, quay sang phải: đa giác cắt tay (đuôi → lưng → tai → mõm ngửa
// lên → ngực → chân trước → đùi), toạ độ so với chân (x, base), cao ~150·s.
const WOLF: readonly [number, number][] = [
  [-62, 0], [-50, -8], [-40, -4], [-42, -26], [-36, -50], [-24, -72], [-12, -92], [-8, -108],
  [-6, -120], [-2, -134], [4, -122], [10, -126], [22, -140], [30, -150], [32, -144], [24, -132],
  [22, -126], [18, -116], [18, -98], [20, -78], [16, -56], [18, -30], [20, 0], [10, 0],
  [8, -24], [4, -10], [2, 0], [-8, 0], [-14, -12], [-24, -6], [-30, 0],
];

function wolf(x: number, base: number, s: number, flip = false): string {
  const f = (v: number) => Math.round(v * 10) / 10;
  // Đảo thứ tự điểm khi lật gương để vẫn quấn ngược chiều kim đồng hồ.
  const pts = (flip ? [...WOLF].reverse() : WOLF).map(([px, py]) => [x + (flip ? -px : px) * s, base + py * s]);
  return `M${pts.map(([px, py]) => `${f(px)} ${f(py)}`).join('L')}Z`;
}

// Đồi đá sau làng: sói lớn ngồi tru trên đỉnh, in bóng trước nửa dưới trăng; sói nhỏ trên sườn trái.
const ROCK = 'M690 712L770 600L830 560L872 520L920 474L972 470L1010 506L1060 560L1140 610L1210 712Z';

export const EndWolvesHill = sceneLayer(
  'EndWolvesHill',
  <>
    <path d={ridge(rng(126), { y: 618, amp: 30, step: 200 })} fill={C.hillsFar} />
    <path d={ROCK + wolf(944, 474, 0.95) + wolf(858, 540, 0.62)} fill={C.rock} />
  </>
);

export const EndWolvesVillage = sceneLayer(
  'EndWolvesVillage',
  <>
    <path d={VILLAGE_BACK} fill={C.villageBack} />
    <path d={VILLAGE_FRONT} fill={C.village} />
  </>
);

const r = rng(127);
export const EndWolvesFront = sceneLayer(
  'EndWolvesFront',
  <>
    <path d={ridge(r, { y: 790, amp: 14, step: 150 })} fill={C.front} />
    <path d={pineRow(r, { base: 800, minH: 120, maxH: 260, minW: 46, maxW: 84, spacing: [32, 62], gap: [330, 1270] })} fill={C.front} />
  </>
);
