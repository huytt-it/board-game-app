import type { ComponentPropsWithRef } from 'react';
import AvIcon, { type IconName } from '../assets/AvIcon';

// The one button of Avalon (ux-plan 8b). Every action button in the panels,
// the top bar, the lobby and the modals is an AvButton; only the seats on the
// table and the quest tiles draw their own.
//
// - `primary`: solid gold, ink text — the phase's main action (one per screen).
// - `secondary`: glass with the thin line edge, parchment text.
// - `danger`: an --av-evil edge and text, no solid red.
// - `ghost`: no frame, for the top bar; compact (36px), its touch area still
//   44px. With `block` it is a full-width 44px row (a menu item); `danger`
//   turns that row's text and icon red (Xoá phòng), still without a frame.
// - `choice`: a large neutral card (Approve / Reject, the quest cards, the
//   night card), solid (readable over a bright scene on a desktop), without
//   an edge (it sits in the dock / a panel: no frame in a frame). Both cards
//   of a choice look the same — neither invites the tap more than the other;
//   `selected` gives the picked one a gold edge.
// - `bare`: no look and no size of its own — a drawn object that is pressed
//   (the sealed role letter); it keeps the shared focus ring and disabled state.
//
// Sizes: `md` ≥ 44px, `lg` 56px (the dock). Disabled is the same for all: dimmed,
// no hover. The focus ring is avalon.css's (every button in .avalon-root).
export type AvButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'choice' | 'bare';
export type AvButtonSize = 'md' | 'lg';

const VARIANT: Record<AvButtonVariant, string> = {
  primary: 'rounded-xl bg-(--av-gold) text-(--av-ink) shadow-lg shadow-black/30 enabled:hover:brightness-110',
  secondary: 'rounded-xl border border-(--av-line) bg-(color:--av-glass-bg) text-(--av-text) enabled:hover:border-(--av-text-3)',
  danger: 'rounded-xl border border-(--av-evil)/60 bg-(color:--av-glass-bg) text-(--av-evil-light) enabled:hover:border-(--av-evil)',
  ghost: 'text-(--av-text-2) enabled:hover:bg-white/10 enabled:hover:text-(--av-text)',
  choice: 'rounded-xl border border-transparent bg-(--av-raised) text-(--av-text) shadow-lg shadow-black/30 enabled:hover:brightness-125',
  bare: '',
};
const GHOST_DANGER = 'text-(--av-evil-light) enabled:hover:bg-(--av-evil)/10';

const SIZE: Record<AvButtonSize, string> = {
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-14 px-5 text-base',
};

interface AvButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: AvButtonVariant;
  size?: AvButtonSize;
  icon?: IconName;
  /** `choice` only: the picked card. */
  selected?: boolean;
  /** Fill the container's width. */
  block?: boolean;
  /** Content alignment; a full-width ghost (a menu row) starts at the left. */
  align?: 'start' | 'center';
  /** `ghost` only: a destructive row (red text, no frame). */
  danger?: boolean;
}

export default function AvButton({
  variant = 'secondary',
  size = 'md',
  icon,
  selected = false,
  block = false,
  align = variant === 'ghost' && block ? 'start' : 'center',
  danger = false,
  type = 'button',
  className = '',
  children,
  ...rest
}: AvButtonProps) {
  const bare = variant === 'bare';
  const sized = bare
    ? ''
    : variant !== 'ghost'
      ? SIZE[size]
      : block
        ? 'h-11 rounded-xl px-3 text-sm'
        : 'av-hit [--av-hit-x:-4px] [--av-hit-y:-4px] h-9 min-w-9 rounded-full px-2 text-xs';
  const look = variant === 'ghost' && danger ? GHOST_DANGER : VARIANT[variant];
  const picked = variant === 'choice' && selected ? 'border-(--av-gold) bg-(--av-gold)/10 ring-1 ring-(--av-gold)' : '';
  const base = bare
    ? 'relative block select-none disabled:cursor-not-allowed disabled:opacity-40'
    : `relative inline-flex items-center ${align === 'start' ? 'justify-start' : 'justify-center'} gap-2 font-semibold leading-tight transition select-none enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40`;
  return (
    <button
      type={type}
      className={`${base} ${look} ${sized} ${picked} ${block ? 'w-full' : ''} ${className}`}
      data-av-button={variant}
      aria-pressed={variant === 'choice' && selected ? true : undefined}
      {...rest}
    >
      {icon && <AvIcon name={icon} size={variant === 'ghost' ? 16 : size === 'lg' ? 22 : 18} className="shrink-0" />}
      {children}
    </button>
  );
}
