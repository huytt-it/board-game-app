import { AvalonRole } from '../types';
import { ROLE_TEAM } from '../constants';
import { ROLE_ICON_NAME } from '../presentation';
import AvIcon from '../assets/AvIcon';

// Heater shield in a 100×112 box; the inner line is a thin gilded inlay.
const SHIELD = 'M50 4 93 17v37c0 28-19 46-43 54C26 100 7 82 7 54V17z';
const SHIELD_INLAY = 'M50 12.5 85 23v31c0 23-15 38-35 45-20-7-35-22-35-45V23z';

// Shield width in px; the height is 1.12× the width.
const WIDTH = { xs: 22, sm: 30, md: 44, lg: 64, xl: 104 } as const;

export type RoleEmblemSize = keyof typeof WIDTH;

interface RoleEmblemProps {
  role: AvalonRole;
  size?: RoleEmblemSize;
  className?: string;
  /** Accessible label. Leave empty when the role name is already written next to it. */
  title?: string;
}

// The role's icon on a shield whose rim carries the team colour.
export default function RoleEmblem({ role, size = 'md', className = '', title }: RoleEmblemProps) {
  const color = ROLE_TEAM[role] === 'good' ? 'var(--av-good)' : 'var(--av-evil)';
  const w = WIDTH[size];
  const small = size === 'xs' || size === 'sm';
  const a11y = title
    ? ({ role: 'img', 'aria-label': title, title } as const)
    : ({ 'aria-hidden': true } as const);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: w, height: Math.round(w * 1.12) }}
      {...a11y}
    >
      <svg viewBox="0 0 100 112" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path
          d={SHIELD}
          strokeWidth={small ? 8 : 5}
          strokeLinejoin="round"
          style={{ fill: `color-mix(in srgb, ${color} 22%, var(--av-ink))`, stroke: color }}
        />
        {!small && (
          <path
            d={SHIELD_INLAY}
            fill="none"
            strokeWidth={1.5}
            style={{ stroke: 'var(--av-gold)', strokeOpacity: 0.5 }}
          />
        )}
      </svg>
      <AvIcon
        name={ROLE_ICON_NAME[role]}
        size={Math.round(w * (small ? 0.6 : 0.54))}
        className="relative -translate-y-[5%] text-(--av-parchment)"
      />
    </span>
  );
}
