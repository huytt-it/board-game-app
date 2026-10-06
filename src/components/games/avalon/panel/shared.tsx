import type { AvalonGameState, AvalonRole } from '../types';
import { ROLE_DESC_VI, ROLE_NAMES_VI, ROLE_TEAM } from '../constants';
import AvIcon, { type IconName } from '../assets/AvIcon';
import RoleEmblem from '../ui/RoleEmblem';

export function PhaseChip({ phase }: { phase: AvalonGameState['phase'] }) {
  const map: Record<string, { icon: IconName; text: string; cls: string }> = {
    'lineup-preview': { icon: 'roles', text: 'Vai trong ván', cls: 'bg-fuchsia-500/20 text-fuchsia-300' },
    'role-reveal': { icon: 'seal', text: 'Lộ vai', cls: 'bg-purple-500/20 text-purple-300' },
    'night-evils': { icon: 'night', text: 'Đêm — Phe Quỷ', cls: 'bg-(--av-evil)/20 text-(--av-evil)' },
    'night-merlin': { icon: 'night', text: 'Đêm — Merlin', cls: 'bg-(--av-good)/20 text-(--av-good)' },
    'night-percival': { icon: 'night', text: 'Đêm — Percival', cls: 'bg-indigo-500/20 text-indigo-300' },
    'team-build': { icon: 'team', text: 'Chọn đội', cls: 'bg-amber-500/20 text-amber-300' },
    'team-vote': { icon: 'vote', text: 'Bỏ phiếu', cls: 'bg-cyan-500/20 text-cyan-300' },
    'team-vote-result': { icon: 'vote', text: 'Kết quả phiếu', cls: 'bg-cyan-500/20 text-cyan-300' },
    'quest-play': { icon: 'card-play', text: 'Chơi Quest', cls: 'bg-purple-500/20 text-purple-300' },
    'quest-result': { icon: 'quest', text: 'Kết quả Quest', cls: 'bg-purple-500/20 text-purple-300' },
    'discussion': { icon: 'discussion', text: 'Thảo luận', cls: 'bg-emerald-500/20 text-emerald-300' },
    'lady-of-lake': { icon: 'lady', text: 'Lady', cls: 'bg-(--av-lady)/20 text-(--av-lady)' },
    assassinate: { icon: 'assassinate', text: 'Ám sát', cls: 'bg-(--av-evil)/20 text-(--av-evil)' },
    end: { icon: 'end', text: 'Kết thúc', cls: 'bg-slate-500/20 text-slate-300' },
  };
  const cfg = map[phase] ?? map.end;
  return (
    <span className={`flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-black ${cfg.cls}`}>
      <AvIcon name={cfg.icon} size={14} /> {cfg.text}
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
        ? 'border-blue-500/30 bg-blue-500/10'
        : 'border-red-500/30 bg-red-500/10'
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
            ? 'bg-blue-500/30 text-blue-200'
            : 'bg-red-500/30 text-red-200'
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
    <div
      className={`rounded-2xl border-2 p-3 ${compact ? '' : 'sm:p-4'} ${isGood
        ? 'border-blue-500/50 bg-blue-500/10'
        : 'border-red-500/50 bg-red-500/10'
        }`}
    >
      <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">
        {heading}
      </p>
      <div className="mt-1 flex items-center gap-3">
        <RoleEmblem role={role} size="md" />
        <div className="flex-1 min-w-0">
          <p className="av-display text-xl leading-tight text-white truncate">{role}</p>
          <p
            className={`text-[11px] font-semibold ${isGood ? 'text-blue-300' : 'text-red-300'
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
    </div>
  );
}
