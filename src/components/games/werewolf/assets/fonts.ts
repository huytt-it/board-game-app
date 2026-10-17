import { Grenze } from 'next/font/google';

// Font tiêu đề của Ma Sói (chữ thân vẫn là Inter của app). Grenze: nét nửa
// Gô-tích, hợp không khí làng cổ, có subset `vietnamese` (dấu đọc rõ ở cỡ
// tiêu đề). Gắn `werewolfDisplayFont.variable` lên `.ww-root`, rồi dùng class
// `ww-display` (werewolf.css) cho tiêu đề.
export const werewolfDisplayFont = Grenze({
  subsets: ['latin', 'vietnamese'],
  weight: ['600', '700'],
  display: 'swap',
  variable: '--ww-font-display',
});
