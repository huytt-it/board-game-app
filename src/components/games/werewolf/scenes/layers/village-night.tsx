// Làng ban đêm — sảnh, xem vai, Đêm ①, Đêm ②. Cắt giấy 4 lớp (xa → gần): trời
// xanh tím có sao và trăng tròn bạc, đồi xa, ngôi làng sáng đèn, bìa rừng tối
// hai bên (có đôi mắt trong rừng, chỉ màn rộng mới thấy). Trăng đặt sau lưới
// người chơi / thẻ giữ ở điện thoại (không nằm sau chữ).
import type { ParticleGroup, ScenePalette } from '../types';
import { blobs, H, pineRow, ridge, rng, scatter, sceneLayer, W } from '@/components/games/avalon/scenes/paper';
import { VILLAGE_BACK, VILLAGE_FRONT, WINDOWS_ALL } from '../village';

const C = {
  sky: '#0b1026',
  skyLow: '#0f1534',
  skyHorizon: '#141b42',
  halo: '#151c40',
  haloIn: '#1b2350',
  star: '#cfd6ff',
  moon: '#e3e7f5',
  crater: '#c9cfe4',
  hillsFar: '#121937',
  hills: '#0e132d',
  villageBack: '#0c1027',
  village: '#070a1b',
  window: '#f0b85a',
  forest: '#05070f',
  eyes: '#f2e3a0',
};

export const VILLAGE_NIGHT_PALETTE: ScenePalette = { base: C.sky, accent: C.moon };

// Trăng tròn thấp sau tháp chuông: ở điện thoại nó nằm sau thẻ giữ (không sau
// chữ), ở màn rộng lộ ra giữa lưới người chơi và mái nhà.
const MOON = { x: 840, y: 520, r: 64 };

export const VILLAGE_NIGHT_PARTICLES: readonly ParticleGroup[] = [
  { kind: 'twinkle', count: 6, color: C.star, area: [560, 40, 1040, 420], size: 3 },
  { kind: 'twinkle', count: 5, color: C.star, area: [60, 40, 1540, 460], size: 3 },
  { kind: 'firefly', count: 4, color: '#efe3a6', area: [180, 640, 1420, 800], size: 3 },
  { kind: 'flicker', count: 1, color: C.window, area: [655, 696, 655, 696], size: 30 },
  { kind: 'flicker', count: 1, color: C.window, area: [800, 500, 800, 500], size: 24 },
];

const STARS = scatter(rng(31), 60, [0, 0, W, 560], [0.8, 2.2], { x: MOON.x, y: MOON.y, r: 190 });

export const NightSky = sceneLayer(
  'NightSky',
  <>
    <rect width={W} height={H} fill={C.sky} />
    {/* Trời sáng dần về phía chân trời: hai dải giấy lượn sóng. */}
    <path d={ridge(rng(32), { y: 400, amp: 40, step: 260 })} fill={C.skyLow} />
    <path d={ridge(rng(33), { y: 520, amp: 30, step: 220 })} fill={C.skyHorizon} />
    {STARS.map((s, i) => (
      <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={C.star} opacity={s.o} />
    ))}
    <path d="M300 120l4 14 14 4-14 4-4 14-4-14-14-4 14-4zM1290 90l3 11 11 3-11 3-3 11-3-11-11-3 11-3zM640 300l3 10 10 3-10 3-3 10-3-10-10-3 10-3z" fill={C.star} />
    <circle cx={MOON.x} cy={MOON.y} r={MOON.r * 2.6} fill={C.halo} />
    <circle cx={MOON.x} cy={MOON.y} r={MOON.r * 1.75} fill={C.haloIn} />
    <circle cx={MOON.x} cy={MOON.y} r={MOON.r} fill={C.moon} />
    <path
      d={blobs([
        [MOON.x - 18, MOON.y - 14, 11],
        [MOON.x + 20, MOON.y + 8, 15],
        [MOON.x - 8, MOON.y + 26, 7],
        [MOON.x + 14, MOON.y - 30, 5],
      ])}
      fill={C.crater}
    />
  </>
);

export const NightHills = sceneLayer(
  'NightHills',
  <>
    <path d={ridge(rng(34), { y: 615, amp: 34, step: 180 })} fill={C.hillsFar} />
    <path d={ridge(rng(35), { y: 668, amp: 20, step: 140 })} fill={C.hills} />
  </>
);

export const NightVillage = sceneLayer(
  'NightVillage',
  <>
    <path d={VILLAGE_BACK} fill={C.villageBack} />
    <path d={VILLAGE_FRONT} fill={C.village} />
    <path d={WINDOWS_ALL} fill={C.window} />
  </>
);

const r = rng(36);
export const NightFront = sceneLayer(
  'NightFront',
  <>
    <path d={ridge(r, { y: 790, amp: 14, step: 150 })} fill={C.forest} />
    {/* Bìa rừng hai bên, chừa khoảng giữa cho ngôi làng. */}
    <path d={pineRow(r, { base: 800, minH: 110, maxH: 250, minW: 46, maxW: 84, spacing: [34, 66], gap: [360, 1250] })} fill={C.forest} />
    <path d={pineRow(r, { base: 830, minH: 60, maxH: 120, minW: 30, maxW: 50, spacing: [60, 120], x0: 360, x1: 1250, gap: [520, 1080] })} fill={C.forest} />
    {/* Đôi mắt trong bìa rừng bên trái. */}
    <path d={blobs([[212, 772, 2.6], [226, 772, 2.6]])} fill={C.eyes} opacity={0.75} />
  </>
);
