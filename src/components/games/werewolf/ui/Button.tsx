'use client';

import type { ComponentProps } from 'react';
import WwIcon, { type IconName } from '../assets/WwIcon';

// Nút duy nhất của Ma Sói (GĐ3a, học AvButton của Avalon GĐ7). Cao ≥ 44px.
// - `primary`: nền đèn lồng đặc, chữ mực — việc chính của màn (một nút mỗi màn).
//   Khoá: mặt nổi trung tính, chữ --ww-text-3 (không mờ đục màu nhấn).
// - `secondary`: mặt nổi, viền mảnh, chữ ánh trăng.
// - `danger`: viền + chữ màu Sói, không nền đỏ đặc (xoá phòng, bắn…).
// - `ghost`: không khung; chỉ icon thì là nút tròn 44px (thanh trên).
// Cỡ: `md` (44px), `lg` (52px, thanh nút đáy). Vòng tiêu điểm: werewolf.css.
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-(--ww-accent) text-(--ww-ink) shadow-lg shadow-black/30 enabled:hover:brightness-110 disabled:bg-(--ww-raised) disabled:text-(--ww-text-3) disabled:shadow-none',
  secondary: 'border border-(--ww-line) bg-(--ww-raised) text-(--ww-text) enabled:hover:bg-(--ww-raised-hi) disabled:opacity-40',
  ghost: 'text-(--ww-text-2) enabled:hover:bg-white/10 enabled:hover:text-(--ww-text) disabled:opacity-40',
  danger: 'border border-(--ww-wolf)/60 bg-(--ww-raised) text-(--ww-wolf-light) enabled:hover:border-(--ww-wolf) disabled:opacity-40',
};

const SIZE: Record<Size, string> = {
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-13 px-5 text-base',
};

export default function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  block = false,
  className = '',
  type = 'button',
  children,
  ...rest
}: ComponentProps<'button'> & { variant?: Variant; size?: Size; icon?: IconName; block?: boolean }) {
  // Nút ghost chỉ có icon: tròn, vuông 44px.
  const iconOnly = variant === 'ghost' && !children;
  const sized = iconOnly ? 'size-11 rounded-full' : `${SIZE[size]} rounded-xl`;
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 font-semibold leading-tight transition select-none enabled:active:scale-[0.98] disabled:cursor-not-allowed ${sized} ${VARIANT[variant]} ${block ? 'w-full' : ''} ${className}`}
      data-ww-button={variant}
      {...rest}
    >
      {icon && <WwIcon name={icon} size={iconOnly ? 22 : size === 'lg' ? 20 : 18} />}
      {children}
    </button>
  );
}
