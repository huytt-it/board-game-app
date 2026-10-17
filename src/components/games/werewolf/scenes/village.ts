// Bóng ngôi làng, dùng chung cho mọi cảnh (đêm, bình minh, ngày… cùng một
// làng). Hình đặt tay, đối xứng quanh x = 800 để điện thoại dọc (chỉ thấy
// x ≈ 590–1010) vẫn thấy nhà thờ và mấy mái nhà; cối xay gió ở rìa trái chỉ
// hiện trên màn rộng. Mỗi hình quấn cùng chiều (nonzero) nên chồng lên nhau
// vẫn liền một khối. Hàm vẽ cắt giấy dùng lại của Avalon (scenes/paper.tsx).
import { blobs, box, taper } from '@/components/games/avalon/scenes/paper';

/** Mặt đất dưới chân làng (y). */
export const GROUND = 712;

interface House {
  x: number; // tâm
  w: number;
  h: number; // tường
  roof: number; // chiều cao mái
  base?: number;
  chimney?: -1 | 1; // ống khói bên trái / phải
}

// Nhà = tường + mái nhọn chìa ra hai bên (+ ống khói). Mọi hình quấn ngược chiều kim
// đồng hồ trên màn (như box / blobs / taper của paper.tsx).
function house({ x, w, h, roof, base = GROUND, chimney }: House): string {
  const l = x - w / 2;
  const r = x + w / 2;
  const top = base - h;
  let d = box(l, top, r, base);
  d += `M${l - 9} ${top + 1}L${r + 9} ${top + 1}L${x} ${top - roof}Z`;
  if (chimney) {
    const cx = x + chimney * w * 0.26;
    d += box(cx - 8, top - roof * 0.78, cx + 8, top - roof * 0.2);
  }
  return d;
}

const BACK: House[] = [
  { x: 585, w: 86, h: 52, roof: 30, base: 700 },
  { x: 690, w: 78, h: 60, roof: 34, base: 698, chimney: 1 },
  { x: 915, w: 82, h: 58, roof: 32, base: 698 },
  { x: 1020, w: 92, h: 54, roof: 30, base: 700, chimney: -1 },
];

const FRONT: House[] = [
  { x: 430, w: 84, h: 56, roof: 34 },
  { x: 535, w: 104, h: 66, roof: 40, chimney: -1 },
  { x: 655, w: 118, h: 80, roof: 48, chimney: 1 },
  { x: 950, w: 116, h: 84, roof: 46, chimney: -1 },
  { x: 1068, w: 102, h: 64, roof: 40, chimney: 1 },
  { x: 1172, w: 86, h: 58, roof: 34 },
];

// Nhà thờ: thân (mái dốc) + tháp chuông + chóp nhọn + thánh giá mảnh.
const CHURCH =
  box(738, 598, 862, GROUND) +
  'M730 599L870 599L800 548Z' +
  box(782, 470, 818, GROUND) +
  'M776 471L824 471L800 372Z' +
  box(798.5, 342, 801.5, 374) +
  box(791, 352, 809, 355);

/** Cối xay gió ở rìa trái (màn rộng mới thấy). */
const MILL_X = 300;
const WINDMILL =
  `M${MILL_X + 34} ${GROUND}L${MILL_X + 20} 560L${MILL_X - 20} 560L${MILL_X - 34} ${GROUND}Z` +
  `M${MILL_X - 26} 562L${MILL_X + 26} 562L${MILL_X} 532Z` +
  blobs([[MILL_X, 548, 7]]) +
  taper(MILL_X, 548, MILL_X - 92, 470, 10, 16) +
  taper(MILL_X, 548, MILL_X + 84, 462, 10, 16) +
  taper(MILL_X, 548, MILL_X + 90, 628, 10, 16) +
  taper(MILL_X, 548, MILL_X - 80, 636, 10, 16);

/** Dãy nhà phía sau (xa hơn: tô màu nhạt hơn một bậc) + cối xay. */
export const VILLAGE_BACK = BACK.map((h) => house(h)).join('') + WINDMILL;

/** Dãy nhà phía trước + nhà thờ. */
export const VILLAGE_FRONT = FRONT.map((h) => house(h)).join('') + CHURCH;

// Cửa sổ: ô chữ nhật nhỏ có vòm (ô cửa nhà thờ) hoặc ô vuông có song.
const win = (x: number, y: number, w = 12, h = 14) => box(x - w / 2, y, x + w / 2, y + h);
const arch = (x: number, y: number, h = 22) => `M${x - 5} ${y + h}V${y + 5}a5 5 0 0 1 10 0V${y + h}Z`;

/** Mọi cửa sổ (ban đêm đều sáng đèn). */
export const WINDOWS_ALL = [
  win(410, 676),
  win(520, 670),
  win(552, 670),
  win(632, 652),
  win(672, 652),
  win(655, 684, 14, 28), // cửa ra vào sáng đèn
  arch(760, 630),
  arch(840, 630),
  blobs([[800, 500, 8]]), // ô tròn trên tháp
  win(928, 650),
  win(968, 650),
  win(1050, 672),
  win(1086, 672),
  win(1172, 676),
  win(690, 660, 10, 12),
  win(1020, 664, 10, 12),
].join('');

/** Bình minh: chỉ vài nhà còn để đèn. */
export const WINDOWS_DAWN = [win(632, 652), arch(840, 630), win(1086, 672)].join('');

/** Ống khói còn bốc khói (toạ độ miệng ống, hướng khói nghiêng): hai nhà ở xa
 *  nhà thờ, để khói không bay ngang qua mặt trời. */
export const CHIMNEYS: readonly [number, number, -1 | 1][] = [
  [535 - 104 * 0.26, GROUND - 66 - 40 * 0.78, -1],
  [1068 + 102 * 0.26, GROUND - 64 - 40 * 0.78, 1],
];
