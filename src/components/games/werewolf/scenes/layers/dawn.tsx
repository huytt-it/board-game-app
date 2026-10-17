// Bình minh — công bố đêm qua. Cùng ngôi làng với cảnh đêm, cắt giấy 4 lớp
// (xa → gần): trời tím chuyển cam ấm (dải giấy, không gradient), mặt trời nhô
// nửa vành sau đồi, mây mảnh; đồi; ngôi làng đã tắt gần hết đèn, khói bếp; bìa
// rừng và dải sương. Đỉnh trời vẫn tối (chữ tiêu đề nằm trên đó); màu ấm chỉ ở
// nửa dưới và không có mảng đỏ bão hoà (đỏ là màu phe Sói).
import type { ParticleGroup, ScenePalette } from '../types';
import { bird, blobs, H, pill, pineRow, ridge, rng, sceneLayer, W } from '@/components/games/avalon/scenes/paper';
import { CHIMNEYS, GROUND, VILLAGE_BACK, VILLAGE_FRONT, WINDOWS_DAWN } from '../village';

const C = {
  sky: '#181a3b',
  band1: '#25234d',
  band2: '#3a2c58',
  band3: '#55355d',
  band4: '#77425e',
  band5: '#9b5a5e',
  glow: '#c27c5f',
  halo: '#d9945f',
  sun: '#f4cd7d',
  cloud: '#5e3c62',
  cloudLit: '#c4806a',
  hillsFar: '#3a2846',
  hills: '#2b1e37',
  villageBack: '#241a31',
  village: '#170f22',
  window: '#e9a85a',
  smoke: '#7d6080',
  front: '#100a17',
  mist: '#8a6378',
  bird: '#22172d',
};

export const DAWN_PALETTE: ScenePalette = { base: C.sky, accent: C.sun };

const SUN = { x: 800, y: 640, r: 84 };

export const DAWN_PARTICLES: readonly ParticleGroup[] = [
  { kind: 'mote', count: 7, color: '#f6d9a8', area: [420, 360, 1180, 600], size: 3 },
];

// Dải trời: mỗi dải là một tờ giấy lượn sóng nhẹ, càng gần chân trời càng ấm.
const BANDS: [number, number, string][] = [
  [250, 40, C.band1],
  [350, 36, C.band2],
  [440, 30, C.band3],
  [515, 26, C.band4],
  [575, 20, C.band5],
  [618, 14, C.glow],
];

export const DawnSky = sceneLayer(
  'DawnSky',
  <>
    <rect width={W} height={H} fill={C.sky} />
    {BANDS.map(([y, amp, fill], i) => (
      <path key={i} d={ridge(rng(41 + i), { y, amp, step: 300 })} fill={fill} />
    ))}
  </>
);

// Quầng và mặt trời (nửa dưới bị đồi che): lớp riêng để "lên" lúc bình minh bắt
// đầu (GĐ4: registry đánh dấu `motion: 'rise'`; khung tĩnh = vị trí cuối).
export const DawnSun = sceneLayer(
  'DawnSun',
  <>
    <circle cx={SUN.x} cy={SUN.y} r={SUN.r * 2.1} fill={C.glow} />
    <circle cx={SUN.x} cy={SUN.y} r={SUN.r * 1.45} fill={C.halo} />
    <circle cx={SUN.x} cy={SUN.y} r={SUN.r} fill={C.sun} />
  </>
);

// Mây mảnh và chim, trước mặt trời.
export const DawnClouds = sceneLayer(
  'DawnClouds',
  <>
    {/* Mây mảnh: dải tối phía trên, viền sáng phía dưới. */}
    <path d={pill(380, 300, 760, 16) + pill(470, 318, 640, 10) + pill(930, 262, 1290, 14) + pill(1010, 280, 1180, 9)} fill={C.cloud} />
    <path d={pill(560, 452, 760, 12) + pill(870, 430, 1120, 13) + pill(940, 446, 1060, 8)} fill={C.cloudLit} />
    <path d={bird(700, 380, 16) + bird(735, 398, 11) + bird(1010, 352, 13)} fill={C.bird} />
  </>
);

export const DawnHills = sceneLayer(
  'DawnHills',
  <>
    <path d={ridge(rng(48), { y: 628, amp: 30, step: 200 })} fill={C.hillsFar} />
    <path d={ridge(rng(49), { y: 676, amp: 18, step: 150 })} fill={C.hills} />
  </>
);

// Khói bếp: hai cột khói xiên nhẹ, mỗi cột vài cụm tròn.
const SMOKE = CHIMNEYS.map(([x, y, lean]) =>
  blobs([
    [x, y - 12, 8],
    [x + lean * 6, y - 30, 11],
    [x + lean * 16, y - 52, 13],
    [x + lean * 30, y - 78, 15],
    [x + lean * 48, y - 104, 13],
  ])
).join('');

export const DawnVillage = sceneLayer(
  'DawnVillage',
  <>
    <path d={SMOKE} fill={C.smoke} opacity={0.45} />
    <path d={VILLAGE_BACK} fill={C.villageBack} />
    <path d={VILLAGE_FRONT} fill={C.village} />
    <path d={WINDOWS_DAWN} fill={C.window} opacity={0.8} />
  </>
);

const r = rng(50);
export const DawnFront = sceneLayer(
  'DawnFront',
  <>
    <path d={pill(-40, GROUND + 18, 520, 22) + pill(1060, GROUND + 26, 1640, 20) + pill(380, GROUND + 52, 1220, 14)} fill={C.mist} opacity={0.35} />
    <path d={ridge(r, { y: 792, amp: 14, step: 150 })} fill={C.front} />
    <path d={pineRow(r, { base: 802, minH: 110, maxH: 240, minW: 46, maxW: 84, spacing: [34, 66], gap: [360, 1250] })} fill={C.front} />
  </>
);
