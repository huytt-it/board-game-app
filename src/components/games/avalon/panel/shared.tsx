import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
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

// A phase countdown. Parchment, red when time is short; it then also throbs
// through a glow around it (`throb`) — not by fading the digits (animate-pulse
// would drop them below 4.5:1). Leave `throb` off while the dock's "your turn"
// edge blinks: one thing blinks at a time.
export function LowTimeClock({
  low,
  throb = low,
  className = '',
  children,
}: {
  low: boolean;
  throb?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`relative inline-flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 text-xs font-bold tabular-nums ${
        low ? 'text-(--av-evil-light)' : 'text-(--av-text-2)'
      } ${low && throb ? 'av-pulse-ring' : ''} ${className}`}
      style={low && throb ? LOW_TIME_GLOW : undefined}
      data-low-time={low ? '' : undefined}
    >
      <AvIcon name="clock" /> {children}
    </span>
  );
}

// The head of a phase panel (ux-plan 8b, "one sentence, one action"): the
// title (the screen's one display line, ≤ 6 words) and, on the right, the
// phase clock.
export function PanelHead({ title, clock, id }: { title: ReactNode; clock?: ReactNode; id?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 id={id} className="av-display min-w-0 text-xl leading-tight text-(--av-text)">
        {title}
      </h3>
      {clock}
    </div>
  );
}

// The panel's one sentence of status or instruction (≤ 2 lines at 375px).
export function PanelLine({ className = '', ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`mt-2 text-sm leading-relaxed text-(--av-text-2) ${className}`} {...rest} />;
}

// A quiet fact under the sentence ("Đã bầu 3/7", "Sẵn sàng 2/7").
export function PanelNote({ className = '', ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`mt-1 text-xs text-(--av-text-3) ${className}`} {...rest} />;
}

// The two-fail rule, as one line — only in the panels of the quest that has it.
export function TwoFailNote() {
  return (
    <p className="mt-2 flex items-start gap-1.5 text-xs text-(--av-evil-light)" data-two-fail-note="">
      <AvIcon name="warning" className="mt-px shrink-0" />
      Cần 2 lá Phe Quỷ mới thất bại.
    </p>
  );
}

// What the dock shows once the viewer has done their part (ready, card
// played…): a quiet solid strip with an icon, not a dimmed button.
export function DockStatus({ icon, title, note }: { icon: IconName; title: ReactNode; note?: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-xl bg-(--av-raised) px-4 py-2 shadow-lg shadow-black/40" data-dock-status="">
      <AvIcon name={icon} size={22} className="shrink-0 text-(--av-gold)" />
      <div className="min-w-0 flex-1 text-left">
        <p className="text-sm font-semibold text-(--av-text)">{title}</p>
        {note && <p className="text-xs text-(--av-text-3)">{note}</p>}
      </div>
    </div>
  );
}

// A role of the line-up (public), on the light parchment scroll of
// lineup-preview: ink text, the team in the darker "-ink" shades. A tint,
// no frame.
export function RoleLineChip({ role, count, tone }: { role: AvalonRole; count: number; tone: 'good' | 'evil' }) {
  const tint = tone === 'good' ? 'bg-(--av-good-ink)/10' : 'bg-(--av-evil-ink)/10';
  const badge = tone === 'good' ? 'bg-(--av-good-ink)' : 'bg-(--av-evil-ink)';
  return (
    <div className={`flex items-center gap-1.5 rounded-xl px-2 py-1.5 ${tint}`} title={ROLE_NAMES_VI[role]}>
      <RoleEmblem role={role} size="xs" />
      <span className="min-w-0 flex-1 truncate text-xs font-bold text-(--av-ink)">{role}</span>
      {count > 1 && (
        <span className={`shrink-0 rounded-full px-1.5 text-xs font-bold text-(--av-parchment) ${badge}`}>×{count}</span>
      )}
    </div>
  );
}
