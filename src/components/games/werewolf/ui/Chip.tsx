import type { HTMLAttributes } from 'react';
import WwIcon, { type IconName } from '../assets/WwIcon';

// Nhãn nhỏ. Dùng ít: `neutral` cho một sự thật yên lặng, `accent` (đèn lồng)
// chỉ cho thứ cần chú ý bây giờ.
export type ChipTone = 'neutral' | 'accent';

const TONE: Record<ChipTone, string> = {
  neutral: 'bg-white/8 text-(--ww-text-2)',
  accent: 'bg-(--ww-accent)/15 text-(--ww-accent)',
};

export default function Chip({
  tone = 'neutral',
  icon,
  className = '',
  children,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: ChipTone; icon?: IconName }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap ${TONE[tone]} ${className}`}
      data-ww-chip={tone}
      {...rest}
    >
      {icon && <WwIcon name={icon} size={14} />}
      {children}
    </span>
  );
}
