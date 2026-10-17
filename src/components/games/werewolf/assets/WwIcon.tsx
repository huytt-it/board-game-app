import type { CSSProperties } from 'react';
import { ICONS, type AssetSource, type IconName } from './registry';

export type { IconName };

// Icon của Ma Sói theo tên trong registry: SVG tô bằng `currentColor` (đổi màu
// như chữ), hoặc ảnh nếu tên đó đã được thay bằng file ảnh (ảnh giữ màu riêng).
export default function WwIcon({
  name,
  size = '1em',
  className = '',
  style,
  title,
}: {
  name: IconName;
  /** Rộng = cao. Số là px; mặc định `1em` theo cỡ chữ. */
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  /** Nhãn cho trình đọc màn hình. Không có thì icon chỉ để trang trí. */
  title?: string;
}) {
  const src: AssetSource = ICONS[name];
  const cls = `ww-icon ${className}`;
  if (src.kind === 'image') {
    return (
      // Icon là file tĩnh nhỏ, cỡ theo em: next/image không thêm được gì.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src.src}
        alt={title ?? src.alt ?? ''}
        draggable={false}
        className={`${cls} object-contain`}
        style={{ width: size, height: size, ...style }}
        {...(title ? {} : { 'aria-hidden': true })}
      />
    );
  }
  const Svg = src.Component;
  const a11y = title ? ({ role: 'img', 'aria-label': title } as const) : ({ 'aria-hidden': true } as const);
  return <Svg width={size} height={size} className={cls} style={style} {...a11y} />;
}
