// Giàn treo — Kết quả phiếu, Thợ săn sau khi treo. Cắt giấy 4 lớp (xa → gần):
// trời chạng vạng tím xám (u ám, không mặt trời), mây dải; đồi và ngôi làng
// lên vài ngọn đèn; giá treo trên bục gỗ giữa quảng trường, hai cây đuốc, quạ;
// đám đông lặng lẽ ở tiền cảnh (bóng đầu và vai). Không có mảng đỏ.
import type { ParticleGroup, ScenePalette } from '../types';
import { bird, blobs, box, H, pill, ridge, rng, sceneLayer, taper, W } from '@/components/games/avalon/scenes/paper';
import { VILLAGE_BACK, VILLAGE_FRONT } from '../village';

const C = {
  sky: '#1d1b29',
  band1: '#25223a',
  band2: '#2f2a44',
  band3: '#3b324c',
  band4: '#4a3c55',
  band5: '#5b495d',
  cloud: '#2a2637',
  hillsFar: '#282133',
  hills: '#201a2a',
  villageBack: '#1d1726',
  village: '#15101d',
  window: '#d99a55',
  gallows: '#100c15',
  rope: '#3a3142',
  crowd: '#0b0810',
  torch: '#e8a24f',
};

export const GALLOWS_PALETTE: ScenePalette = { base: C.sky, accent: C.torch };

export const GALLOWS_PARTICLES: readonly ParticleGroup[] = [
  { kind: 'flicker', count: 1, color: C.torch, area: [612, 588, 612, 588], size: 46 },
  { kind: 'flicker', count: 1, color: C.torch, area: [988, 588, 988, 588], size: 46 },
  { kind: 'mote', count: 5, color: '#b9a7c4', area: [520, 380, 1080, 640], size: 2 },
];

const BANDS: [number, number, string][] = [
  [250, 36, C.band1],
  [350, 30, C.band2],
  [440, 26, C.band3],
  [520, 20, C.band4],
  [585, 14, C.band5],
];

export const GallowsSky = sceneLayer(
  'GallowsSky',
  <>
    <rect width={W} height={H} fill={C.sky} />
    {BANDS.map(([y, amp, fill], i) => (
      <path key={i} d={ridge(rng(81 + i), { y, amp, step: 300 })} fill={fill} />
    ))}
    <path d={pill(300, 290, 760, 18) + pill(420, 310, 620, 10) + pill(880, 340, 1340, 16) + pill(980, 360, 1200, 9) + pill(560, 470, 900, 12)} fill={C.cloud} />
  </>
);

// Vài nhà còn thắp đèn lúc chạng vạng.
const lamp = (x: number, y: number) => box(x - 6, y, x + 6, y + 14);

export const GallowsVillage = sceneLayer(
  'GallowsVillage',
  <>
    <path d={ridge(rng(87), { y: 625, amp: 30, step: 200 })} fill={C.hillsFar} />
    <path d={ridge(rng(88), { y: 676, amp: 16, step: 150 })} fill={C.hills} />
    <path d={VILLAGE_BACK} fill={C.villageBack} />
    <path d={VILLAGE_FRONT} fill={C.village} />
    <path d={lamp(520, 670) + lamp(968, 650) + lamp(1086, 672) + lamp(410, 676)} fill={C.window} opacity={0.75} />
  </>
);

// Bục gỗ + bậc lên, cột, xà ngang, thanh chống, hai cây đuốc. Mọi hình quấn
// ngược chiều kim đồng hồ (box / taper), dây và thòng lọng vẽ bằng nét.
const PLATFORM =
  box(630, 700, 970, 716) + // mặt bục
  box(640, 716, 654, 790) +
  box(946, 716, 960, 790) +
  box(792, 716, 808, 790) + // chân bục
  box(580, 742, 630, 752) +
  box(600, 722, 630, 732); // bậc lên
const GIBBET =
  box(712, 468, 730, 700) + // cột
  box(700, 456, 900, 472) + // xà
  taper(721, 540, 790, 466, 12, 10) + // thanh chống
  box(606, 596, 618, 790) +
  box(982, 596, 994, 790); // cán đuốc
const TORCH_HEADS = blobs([
  [612, 590, 9],
  [988, 590, 9],
]);

export const GallowsStage = sceneLayer(
  'GallowsStage',
  <>
    <path d={PLATFORM + GIBBET + TORCH_HEADS} fill={C.gallows} />
    <path d="M880 472V560" stroke={C.rope} strokeWidth={5} />
    <circle cx={880} cy={576} r={15} fill="none" stroke={C.rope} strokeWidth={5} />
    <path d={bird(760, 430, 14) + bird(790, 412, 10)} fill={C.gallows} />
  </>
);

// Đám đông: đầu (tròn) + vai (bầu dục) theo hai hàng, chừa khoảng trước bục.
function crowd(seed: number, y: number, x0: number, x1: number, gap: [number, number], scale: number): string {
  const rand = rng(seed);
  let d = '';
  for (let x = x0; x < x1; x += (34 + rand() * 18) * scale) {
    if (x > gap[0] && x < gap[1]) continue;
    const s = scale * (0.85 + rand() * 0.3);
    const hy = y - 58 * s + rand() * 8;
    const f = (v: number) => Math.round(v * 10) / 10;
    d += blobs([[x, hy, 15 * s]]);
    // Vai: quấn ngược chiều kim đồng hồ như đầu (blobs), để chồng lên nhau vẫn liền khối.
    d += `M${f(x + 30 * s)} ${H}V${f(hy + 40 * s)}Q${f(x + 30 * s)} ${f(hy + 18 * s)} ${f(x)} ${f(hy + 18 * s)}Q${f(x - 30 * s)} ${f(hy + 18 * s)} ${f(x - 30 * s)} ${f(hy + 40 * s)}V${H}Z`;
  }
  return d;
}

export const GallowsCrowd = sceneLayer(
  'GallowsCrowd',
  <>
    <path d={crowd(91, 830, 260, 1360, [700, 900], 1)} fill={C.crowd} />
    <path d={crowd(92, 900, 200, 1420, [740, 860], 1.25)} fill={C.crowd} />
  </>
);
