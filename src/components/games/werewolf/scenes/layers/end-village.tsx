// Dân làng thắng — buổi sáng sau cùng của ván. Cắt giấy 4 lớp (xa → gần): trời
// sáng xanh dịu chuyển vàng ở chân trời (đỉnh vẫn sẫm cho chữ), mặt trời đã lên
// thấp sau tháp chuông, chim; đồi xanh xám; ngôi làng treo dây cờ hội giữa các mái
// nhà; đồng cỏ có hoa. Màu xanh xám chỉ là nền (kết quả công khai), không phải
// mảng xanh lá bão hoà.
import type { ParticleGroup, ScenePalette } from '../types';
import { bird, blobs, H, pineRow, ridge, rng, sceneLayer, taper, W } from '@/components/games/avalon/scenes/paper';
import { VILLAGE_BACK, VILLAGE_FRONT } from '../village';

const C = {
  sky: '#212d44',
  band1: '#2b3a52',
  band2: '#3a4d62',
  band3: '#526570',
  band4: '#73817a',
  band5: '#a39f78',
  band6: '#cdb67c',
  halo: '#5d6f78',
  haloIn: '#8a948a',
  sun: '#f6dc95',
  bird: '#1d2532',
  hillsFar: '#38463f',
  hills: '#2c3832',
  villageBack: '#26302b',
  village: '#1a221e',
  rope: '#2c3832',
  flagA: '#d9b36a',
  flagB: '#9fb8a0',
  flagC: '#e6d6b0',
  front: '#141a17',
  flower: '#d9c27a',
};

export const END_VILLAGE_PALETTE: ScenePalette = { base: C.sky, accent: C.sun };

// Mặt trời thấp sau tháp chuông, quầng nhỏ: ở điện thoại nó nằm sau lưới vai, không sau
// tiêu đề / câu lý do của màn kết thúc.
const SUN = { x: 800, y: 440, r: 64 };

export const END_VILLAGE_PARTICLES: readonly ParticleGroup[] = [{ kind: 'mote', count: 10, color: '#f6e4b4', area: [380, 260, 1220, 660], size: 3 }];

const BANDS: [number, number, string][] = [
  [240, 34, C.band1],
  [330, 30, C.band2],
  [420, 26, C.band3],
  [500, 22, C.band4],
  [565, 18, C.band5],
  [615, 12, C.band6],
];

export const EndVillageSky = sceneLayer(
  'EndVillageSky',
  <>
    <rect width={W} height={H} fill={C.sky} />
    {BANDS.map(([y, amp, fill], i) => (
      <path key={i} d={ridge(rng(101 + i), { y, amp, step: 300 })} fill={fill} />
    ))}
    <circle cx={SUN.x} cy={SUN.y} r={SUN.r * 2.1} fill={C.halo} />
    <circle cx={SUN.x} cy={SUN.y} r={SUN.r * 1.45} fill={C.haloIn} />
    <circle cx={SUN.x} cy={SUN.y} r={SUN.r} fill={C.sun} />
    <path d={bird(640, 250, 16) + bird(675, 272, 11) + bird(1000, 230, 14) + bird(1040, 252, 9)} fill={C.bird} />
  </>
);

// Dây cờ hội: một sợi dây võng (taper nối các đoạn) và cờ tam giác treo xen ba màu.
function bunting(x0: number, y0: number, x1: number, y1: number, sag: number, n: number): { rope: string; flags: [string, string, string] } {
  const at = (t: number): [number, number] => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + sag * 4 * t * (1 - t)];
  let rope = '';
  const flags: [string, string, string] = ['', '', ''];
  const f = (v: number) => Math.round(v * 10) / 10;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = at(i / n);
    const [bx, by] = at((i + 1) / n);
    rope += taper(ax, ay, bx, by, 2.4, 2.4);
    const [mx, my] = at((i + 0.5) / n);
    const w = Math.abs(bx - ax) * 0.42;
    // Tam giác: trái → mũi dưới → phải (ngược chiều kim đồng hồ trên màn).
    flags[i % 3] += `M${f(mx - w)} ${f(my)}L${f(mx)} ${f(my + w * 1.5)}L${f(mx + w)} ${f(my)}Z`;
  }
  return { rope, flags };
}

// Nối đỉnh mái các nhà (village.ts) với tháp chuông.
const LINES = [
  bunting(655, 584, 782, 522, 34, 7),
  bunting(818, 522, 950, 582, 34, 7),
  bunting(535, 606, 655, 584, 22, 5),
  bunting(950, 582, 1068, 608, 22, 5),
  bunting(430, 622, 535, 606, 16, 4),
  bunting(1068, 608, 1172, 620, 16, 4),
];

export const EndVillageTown = sceneLayer(
  'EndVillageTown',
  <>
    <path d={ridge(rng(108), { y: 622, amp: 30, step: 200 })} fill={C.hillsFar} />
    <path d={ridge(rng(109), { y: 674, amp: 18, step: 150 })} fill={C.hills} />
    <path d={VILLAGE_BACK} fill={C.villageBack} />
    <path d={VILLAGE_FRONT} fill={C.village} />
    <path d={LINES.map((l) => l.rope).join('')} fill={C.rope} />
    <path d={LINES.map((l) => l.flags[0]).join('')} fill={C.flagA} />
    <path d={LINES.map((l) => l.flags[1]).join('')} fill={C.flagB} />
    <path d={LINES.map((l) => l.flags[2]).join('')} fill={C.flagC} />
  </>
);

// Đồng cỏ: hoa nhỏ rải trước làng.
const FLOWERS = (() => {
  const rand = rng(110);
  const out: [number, number, number][] = [];
  for (let i = 0; i < 26; i++) out.push([Math.round(300 + rand() * 1000), Math.round(770 + rand() * 60), 3 + Math.round(rand() * 2)]);
  return out;
})();

const r = rng(111);
export const EndVillageFront = sceneLayer(
  'EndVillageFront',
  <>
    <path d={ridge(r, { y: 786, amp: 12, step: 160 })} fill={C.front} />
    <path d={blobs(FLOWERS)} fill={C.flower} opacity={0.8} />
    <path d={pineRow(r, { base: 806, minH: 120, maxH: 240, minW: 46, maxW: 84, spacing: [34, 66], gap: [300, 1300] })} fill={C.front} />
  </>
);
