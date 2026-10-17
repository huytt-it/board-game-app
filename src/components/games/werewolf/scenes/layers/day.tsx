// Làng ban ngày — Thảo luận, Bỏ phiếu, Thợ săn sau bình minh. Cắt giấy 4 lớp
// (xa → gần): trời chiều vàng ấm (dải giấy, đỉnh trời vẫn sẫm cho chữ tiêu đề),
// mặt trời ở rìa trái (chỉ màn rộng thấy, sau lưới người chơi), mây, chim; đồi;
// ngôi làng (không đèn) với hai tán cây; hàng rào và bìa rừng ở tiền cảnh.
import type { ParticleGroup, ScenePalette } from '../types';
import { bird, blobs, box, H, pill, pineRow, ridge, rng, sceneLayer, taper, W } from '@/components/games/avalon/scenes/paper';
import { GROUND, VILLAGE_BACK, VILLAGE_FRONT } from '../village';

const C = {
  sky: '#3a2e22',
  band1: '#46372a',
  band2: '#57432f',
  band3: '#6b5235',
  band4: '#84663d',
  band5: '#9f7d47',
  halo: '#5e4a31',
  haloIn: '#7c6140',
  sun: '#f1cf7e',
  cloud: '#8f7550',
  cloudLit: '#b39466',
  bird: '#2c2216',
  hillsFar: '#4a3b27',
  hills: '#3a2e1f',
  villageBack: '#30251a',
  village: '#211912',
  tree: '#1c160f',
  front: '#17110b',
};

export const DAY_PALETTE: ScenePalette = { base: C.sky, accent: C.sun };

const SUN = { x: 330, y: 170, r: 50 };

export const DAY_PARTICLES: readonly ParticleGroup[] = [{ kind: 'mote', count: 9, color: '#f3dca8', area: [380, 260, 1220, 640], size: 3 }];

const BANDS: [number, number, string][] = [
  [240, 34, C.band1],
  [330, 30, C.band2],
  [420, 26, C.band3],
  [500, 22, C.band4],
  [565, 16, C.band5],
];

export const DaySky = sceneLayer(
  'DaySky',
  <>
    <rect width={W} height={H} fill={C.sky} />
    {BANDS.map(([y, amp, fill], i) => (
      <path key={i} d={ridge(rng(61 + i), { y, amp, step: 320 })} fill={fill} />
    ))}
    <circle cx={SUN.x} cy={SUN.y} r={SUN.r * 2.6} fill={C.halo} />
    <circle cx={SUN.x} cy={SUN.y} r={SUN.r * 1.7} fill={C.haloIn} />
    <circle cx={SUN.x} cy={SUN.y} r={SUN.r} fill={C.sun} />
    <path d={pill(470, 300, 820, 18) + pill(560, 320, 760, 10) + pill(980, 250, 1380, 16) + pill(1060, 268, 1260, 10)} fill={C.cloud} />
    <path d={pill(620, 430, 860, 12) + pill(900, 404, 1150, 14) + pill(150, 380, 420, 12)} fill={C.cloudLit} />
    <path d={bird(880, 330, 16) + bird(915, 350, 11) + bird(1180, 300, 13) + bird(690, 360, 10)} fill={C.bird} />
  </>
);

export const DayHills = sceneLayer(
  'DayHills',
  <>
    <path d={ridge(rng(68), { y: 620, amp: 32, step: 200 })} fill={C.hillsFar} />
    <path d={ridge(rng(69), { y: 672, amp: 18, step: 150 })} fill={C.hills} />
  </>
);

// Hai cây tán tròn đứng giữa dãy nhà sau và dãy nhà trước.
const tree = (x: number, base: number, h: number) =>
  taper(x, base, x, base - h * 0.55, 14, 9) +
  blobs([
    [x, base - h * 0.72, h * 0.26],
    [x - h * 0.2, base - h * 0.58, h * 0.2],
    [x + h * 0.2, base - h * 0.6, h * 0.21],
    [x + h * 0.04, base - h * 0.92, h * 0.17],
  ]);

export const DayVillage = sceneLayer(
  'DayVillage',
  <>
    <path d={VILLAGE_BACK} fill={C.villageBack} />
    <path d={tree(600, GROUND, 150) + tree(1118, GROUND, 130)} fill={C.tree} />
    <path d={VILLAGE_FRONT} fill={C.village} />
  </>
);

// Hàng rào gỗ ở tiền cảnh: cọc nhọn + hai thanh ngang, chừa lối vào giữa.
function fence(x0: number, x1: number, base: number): string {
  let d = box(x0, base - 52, x1, base - 44) + box(x0, base - 26, x1, base - 18);
  for (let x = x0; x <= x1; x += 26) d += `M${x + 7} ${base}V${base - 66}L${x} ${base - 76}L${x - 7} ${base - 66}V${base}Z`;
  return d;
}

const r = rng(70);
export const DayFront = sceneLayer(
  'DayFront',
  <>
    <path d={ridge(r, { y: 788, amp: 12, step: 160 })} fill={C.front} />
    <path d={fence(300, 690, 800) + fence(910, 1300, 800)} fill={C.front} />
    <path d={pineRow(r, { base: 806, minH: 120, maxH: 240, minW: 46, maxW: 84, spacing: [34, 66], gap: [280, 1320] })} fill={C.front} />
  </>
);
