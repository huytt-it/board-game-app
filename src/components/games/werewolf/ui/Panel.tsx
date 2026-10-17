import type { ComponentProps } from 'react';

// Khung của Ma Sói: kính tối (không blur — cảnh phía sau có hạt chuyển động)
// với MỘT viền mảnh, bo 2xl. Không lồng khung có viền trong khung: bên trong
// tách bằng khoảng trống hoặc đường kẻ.
// - `neutral` (mặc định): viền --ww-line.
// - `accent`: viền đèn lồng — khung đang chờ bạn làm gì đó.
// - `wolf` / `village`: kết quả CÔNG KHAI theo phe (màn kết thúc, GĐ3b). Không
//   bao giờ cho thứ chỉ người xem biết.
export type PanelTone = 'neutral' | 'accent' | 'wolf' | 'village';

const EDGE: Record<PanelTone, string> = {
  neutral: 'border-(--ww-line)',
  accent: 'border-(--ww-accent)/60',
  wolf: 'border-(--ww-wolf)/50',
  village: 'border-(--ww-village)/50',
};

export default function Panel({ tone = 'neutral', className = '', children, ...rest }: ComponentProps<'div'> & { tone?: PanelTone }) {
  return (
    <div className={`rounded-2xl border bg-(color:--ww-glass-bg) shadow-lg shadow-black/30 ${EDGE[tone]} ${className}`} {...rest}>
      {children}
    </div>
  );
}
