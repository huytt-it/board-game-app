import type { CSSProperties, ReactNode } from 'react';
import type { AvalonGameState, AvalonRole } from '../types';
import { ROLE_NAMES_VI } from '../constants';
import AvIcon, { type IconName } from '../assets/AvIcon';
import RoleEmblem from '../ui/RoleEmblem';

// The phase chip of PlayerPanel's top bar, which is a size container
// (`@container`). One neutral style for every phase — the icon tells the
// phases apart — and gold while the table waits for the viewer (`turn`, the
// same signal as the dock's edge; never at night). With `compact` (the bar
// also carries "Vai của tôi" and "⋯") a phase with a `short` label uses it
// below 22rem of bar (a phone up to ~380px). The full label is always in the
// tooltip / for screen readers.
//
// Never an ellipsis: the chip is one 24px line that wraps and clips, so a
// label that does not fit beside the icon drops to the (hidden) second line
// and the chip shows the icon alone.
export function PhaseChip({
  phase,
  compact = false,
  turn = false,
}: {
  phase: AvalonGameState['phase'];
  compact?: boolean;
  turn?: boolean;
}) {
  const map: Record<string, { icon: IconName; text: string; short?: string }> = {
    'lineup-preview': { icon: 'roles', text: 'Vai trong ván' },
    'role-reveal': { icon: 'seal', text: 'Lộ vai' },
    'night-evils': { icon: 'night', text: 'Đêm — Phe Quỷ', short: 'Đêm' },
    'night-merlin': { icon: 'night', text: 'Đêm — Merlin', short: 'Đêm' },
    'night-percival': { icon: 'night', text: 'Đêm — Percival', short: 'Đêm' },
    'team-build': { icon: 'team', text: 'Chọn đội' },
    'team-vote': { icon: 'vote', text: 'Bỏ phiếu' },
    'team-vote-result': { icon: 'vote', text: 'Kết quả phiếu', short: 'Kết quả' },
    'quest-play': { icon: 'card-play', text: 'Chơi Quest', short: 'Quest' },
    'quest-result': { icon: 'quest', text: 'Kết quả Quest', short: 'Kết quả' },
    'discussion': { icon: 'discussion', text: 'Thảo luận' },
    'lady-of-lake': { icon: 'lady', text: 'Lady' },
    assassinate: { icon: 'assassinate', text: 'Ám sát' },
    end: { icon: 'end', text: 'Kết thúc' },
  };
  const cfg = map[phase] ?? map.end;
  const short = compact && cfg.short;
  return (
    <span
      className={`flex h-6 min-w-0 flex-wrap items-center justify-center gap-x-1 overflow-hidden whitespace-nowrap rounded-full px-2.5 text-xs font-semibold leading-6 ${
        turn ? 'bg-(--av-gold)/15 text-(--av-gold)' : 'bg-white/6 text-(--av-text-2)'
      }`}
      title={cfg.text}
      aria-label={cfg.text}
      data-phase-chip={phase}
      data-turn={turn ? '' : undefined}
    >
      <AvIcon name={cfg.icon} size={14} />
      {short && <span className="@[22rem]:hidden">{cfg.short}</span>}
      <span className={short ? 'hidden @[22rem]:inline' : ''}>{cfg.text}</span>
    </span>
  );
}

// Glow colour of "time is running out" (--av-evil, which doubles as the warning colour), for `av-pulse-ring`.
export const LOW_TIME_GLOW = { '--av-pulse': 'var(--av-evil)' } as CSSProperties;

// A phase countdown. When time is short it throbs through a glow around it —
// not by fading the digits (animate-pulse would drop them below 4.5:1).
export function LowTimeClock({ low, className = '', children }: { low: boolean; className?: string; children: ReactNode }) {
  return (
    <span
      className={`relative inline-flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 text-xs font-bold tabular-nums ${low ? 'av-pulse-ring' : ''} ${className}`}
      style={low ? LOW_TIME_GLOW : undefined}
      data-low-time={low ? '' : undefined}
    >
      <AvIcon name="clock" /> {children}
    </span>
  );
}

export function TokenBadges({
  playerId,
  state,
  inline = false,
}: {
  playerId: string;
  state: AvalonGameState;
  inline?: boolean;
}) {
  const isLeader = state.currentLeaderId === playerId;
  const isLady = state.ladyHolderId === playerId;
  if (!isLeader && !isLady) return null;
  return (
    <div className={`flex gap-1 ${inline ? '' : 'mt-0.5'} flex-wrap`}>
      {isLeader && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-(--av-gold)/25 border border-(--av-gold)/45 px-1.5 py-0.5 text-[9px] font-black text-amber-100">
          <AvIcon name="leader" className="text-(--av-gold)" /> Leader
        </span>
      )}
      {isLady && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-(--av-lady)/25 border border-(--av-lady)/45 px-1.5 py-0.5 text-[9px] font-black text-teal-100">
          <AvIcon name="lady" className="text-(--av-lady)" /> Lady
        </span>
      )}
    </div>
  );
}

// A role of the line-up (public). `surface="parchment"`: ink on the light
// scroll of lineup-preview, the team in the darker "-ink" shades.
export function RoleLineChip({
  role,
  count,
  tone,
  surface = 'glass',
}: {
  role: AvalonRole;
  count: number;
  tone: 'good' | 'evil';
  surface?: 'glass' | 'parchment';
}) {
  const paper = surface === 'parchment';
  const frame = paper
    ? tone === 'good'
      ? 'border-(--av-good-ink)/35 bg-(--av-good-ink)/10'
      : 'border-(--av-evil-ink)/35 bg-(--av-evil-ink)/10'
    : tone === 'good'
      ? 'border-(--av-good)/30 bg-(--av-good)/10'
      : 'border-(--av-evil)/30 bg-(--av-evil)/10';
  const badge = paper
    ? tone === 'good'
      ? 'bg-(--av-good-ink) text-(--av-parchment)'
      : 'bg-(--av-evil-ink) text-(--av-parchment)'
    : tone === 'good'
      ? 'bg-(--av-good)/30 text-(--av-good-light)'
      : 'bg-(--av-evil)/30 text-(--av-evil-light)';
  return (
    <div className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 ${frame}`} title={ROLE_NAMES_VI[role]}>
      <RoleEmblem role={role} size="xs" />
      <span className={`flex-1 min-w-0 text-[11px] font-black truncate ${paper ? 'text-(--av-ink)' : 'text-white'}`}>
        {role}
      </span>
      {count > 1 && <span className={`shrink-0 rounded-full px-1.5 py-px text-[9px] font-black ${badge}`}>×{count}</span>}
    </div>
  );
}
