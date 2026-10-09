import type { CSSProperties, ReactNode } from 'react';
import type { AvalonGameState, AvalonRole } from '../types';
import { ROLE_DESC_VI, ROLE_NAMES_VI, ROLE_TEAM } from '../constants';
import AvIcon, { type IconName } from '../assets/AvIcon';
import GlassPanel from '../ui/GlassPanel';
import RoleEmblem from '../ui/RoleEmblem';

// The phase chip of PlayerPanel's top bar, which is a size container
// (`@container`). The bar also carries the role, reject and leave buttons, so
// with `compact` the words adapt to the bar's content width: none below
// 19.25rem (a 360px phone while the room page still pads the game — the
// section's own heading names the phase), a short label up to 40rem (a 375px
// phone fits every one), the full one beyond. The full label is always in the
// tooltip / for screen readers.
export function PhaseChip({ phase, compact = false }: { phase: AvalonGameState['phase']; compact?: boolean }) {
  // `short`: the label below `sm`, where the top bar also carries the role,
  // reject and leave buttons (the full one stays in the tooltip).
  const map: Record<string, { icon: IconName; text: string; short?: string; cls: string }> = {
    'lineup-preview': { icon: 'roles', text: 'Vai trong ván', cls: 'bg-fuchsia-500/20 text-fuchsia-300' },
    'role-reveal': { icon: 'seal', text: 'Lộ vai', cls: 'bg-purple-500/20 text-purple-300' },
    'night-evils': { icon: 'night', text: 'Đêm — Phe Quỷ', short: 'Đêm', cls: 'bg-(--av-evil)/20 text-(--av-evil-light)' },
    'night-merlin': { icon: 'night', text: 'Đêm — Merlin', short: 'Đêm', cls: 'bg-(--av-good)/20 text-(--av-good-light)' },
    'night-percival': { icon: 'night', text: 'Đêm — Percival', short: 'Đêm', cls: 'bg-indigo-500/20 text-indigo-300' },
    'team-build': { icon: 'team', text: 'Chọn đội', cls: 'bg-amber-500/20 text-amber-300' },
    'team-vote': { icon: 'vote', text: 'Bỏ phiếu', cls: 'bg-(--av-parchment)/15 text-(--av-parchment)' },
    'team-vote-result': { icon: 'vote', text: 'Kết quả phiếu', short: 'Kết quả', cls: 'bg-(--av-parchment)/15 text-(--av-parchment)' },
    'quest-play': { icon: 'card-play', text: 'Chơi Quest', short: 'Quest', cls: 'bg-purple-500/20 text-purple-300' },
    'quest-result': { icon: 'quest', text: 'Kết quả Quest', short: 'Kết quả', cls: 'bg-purple-500/20 text-purple-300' },
    'discussion': { icon: 'discussion', text: 'Thảo luận', cls: 'bg-emerald-500/20 text-emerald-300' },
    'lady-of-lake': { icon: 'lady', text: 'Lady', cls: 'bg-(--av-lady)/20 text-(--av-lady)' },
    assassinate: { icon: 'assassinate', text: 'Ám sát', cls: 'bg-(--av-evil)/20 text-(--av-evil-light)' },
    end: { icon: 'end', text: 'Kết thúc', cls: 'bg-slate-500/20 text-slate-300' },
  };
  const cfg = map[phase] ?? map.end;
  const full = !compact ? 'truncate' : cfg.short ? 'hidden truncate @[40rem]:inline' : 'hidden truncate @[19.25rem]:inline';
  return (
    <span
      className={`flex min-w-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-black sm:px-2.5 ${cfg.cls}`}
      title={cfg.text}
      aria-label={cfg.text}
    >
      <AvIcon name={cfg.icon} size={14} />
      {compact && cfg.short && <span className="hidden truncate @[19.25rem]:inline @[40rem]:hidden">{cfg.short}</span>}
      <span className={full}>{cfg.text}</span>
    </span>
  );
}

// Glow colour of "time is running out" (orange-400), for `av-pulse-ring`.
export const LOW_TIME_GLOW = { '--av-pulse': 'rgb(251 146 60)' } as CSSProperties;

// A phase countdown. When time is short it throbs through a glow around it —
// not by fading the digits (animate-pulse would drop them below 4.5:1).
export function LowTimeClock({ low, className = '', children }: { low: boolean; className?: string; children: ReactNode }) {
  return (
    <span
      className={`relative inline-flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 text-xs font-black tabular-nums ${low ? 'av-pulse-ring' : ''} ${className}`}
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
        <span className="inline-flex items-center gap-0.5 rounded-full bg-(--av-leader)/25 border border-(--av-leader)/45 px-1.5 py-0.5 text-[9px] font-black text-amber-100">
          <AvIcon name="leader" className="text-(--av-leader)" /> Leader
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

export function RoleLineChip({
  role,
  count,
  tone,
}: {
  role: AvalonRole;
  count: number;
  tone: 'good' | 'evil';
}) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 ${tone === 'good'
        ? 'border-(--av-good)/30 bg-(--av-good)/10'
        : 'border-(--av-evil)/30 bg-(--av-evil)/10'
        }`}
      title={ROLE_NAMES_VI[role]}
    >
      <RoleEmblem role={role} size="xs" />
      <span className="flex-1 min-w-0 text-[11px] font-black text-white truncate">
        {role}
      </span>
      {count > 1 && (
        <span
          className={`shrink-0 rounded-full px-1.5 py-px text-[9px] font-black ${tone === 'good'
            ? 'bg-(--av-good)/30 text-(--av-good-light)'
            : 'bg-(--av-evil)/30 text-(--av-evil-light)'
            }`}
        >
          ×{count}
        </span>
      )}
    </div>
  );
}

// Card "Bạn là <Role>" + mô tả ngắn — hiển thị đầu mỗi night phase để
// người chơi không phải mở RoleCard. variant="self" cho người đang lộ vai,
// variant="other" để giải thích role nào đang lộ diện cho người chờ.
// Khung và huy hiệu trung tính với mọi vai (ux-plan 2.9, 2.11): phe chỉ hiện ở
// dòng chữ nhỏ — thẻ "self" không được tô màu theo phe của người xem.
export function RoleIntroCard({
  role,
  variant,
  compact,
}: {
  role: AvalonRole;
  variant: 'self' | 'other';
  compact?: boolean;
}) {
  const team = ROLE_TEAM[role];
  const isGood = team === 'good';
  const heading =
    variant === 'self'
      ? 'Bạn là'
      : `Vai đang lộ diện: ${ROLE_NAMES_VI[role]}`;
  return (
    <GlassPanel tone="gold" className={`p-3 ${compact ? '' : 'sm:p-4'}`}>
      <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">
        {heading}
      </p>
      <div className="mt-1 flex items-center gap-3">
        <RoleEmblem role={role} size="md" tone="neutral" />
        <div className="flex-1 min-w-0">
          <p className="av-display text-xl leading-tight text-white truncate">{role}</p>
          <p
            className={`text-[11px] font-semibold ${isGood ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'
              }`}
          >
            {ROLE_NAMES_VI[role]}
          </p>
        </div>
      </div>
      {!compact && (
        <p className="mt-2 text-xs leading-relaxed text-slate-200/90">
          {ROLE_DESC_VI[role]}
        </p>
      )}
    </GlassPanel>
  );
}
