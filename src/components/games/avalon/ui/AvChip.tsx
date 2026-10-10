import type { HTMLAttributes } from 'react';
import AvIcon, { type IconName } from '../assets/AvIcon';

// A small label (ux-plan 8b). Use few: `neutral` for a quiet fact, `accent`
// (gold) only for what needs attention now.
export type AvChipTone = 'neutral' | 'accent';

const TONE: Record<AvChipTone, string> = {
  neutral: 'bg-white/6 text-(--av-text-2)',
  accent: 'bg-(--av-gold)/15 text-(--av-gold)',
};

interface AvChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: AvChipTone;
  icon?: IconName;
}

export default function AvChip({ tone = 'neutral', icon, className = '', children, ...rest }: AvChipProps) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold ${TONE[tone]} ${className}`}
      data-av-chip={tone}
      {...rest}
    >
      {icon && <AvIcon name={icon} size={14} className="shrink-0" />}
      {children}
    </span>
  );
}
