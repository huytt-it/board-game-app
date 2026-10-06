import type { AvalonGameState, AvalonRole } from '../types';
import { ROLE_DESC_VI, ROLE_ICONS, ROLE_NAMES_VI, ROLE_TEAM } from '../constants';

export function PhaseChip({ phase }: { phase: AvalonGameState['phase'] }) {
  const map: Record<string, { emoji: string; text: string; cls: string }> = {
    'lineup-preview': { emoji: '🎭', text: 'Vai trong ván', cls: 'bg-fuchsia-500/20 text-fuchsia-300' },
    'role-reveal': { emoji: '🌙', text: 'Lộ vai', cls: 'bg-purple-500/20 text-purple-300' },
    'night-evils': { emoji: '🗡️', text: 'Đêm — Phe Quỷ', cls: 'bg-red-500/20 text-red-300' },
    'night-merlin': { emoji: '🧙', text: 'Đêm — Merlin', cls: 'bg-blue-500/20 text-blue-300' },
    'night-percival': { emoji: '🛡️', text: 'Đêm — Percival', cls: 'bg-indigo-500/20 text-indigo-300' },
    'team-build': { emoji: '⚔️', text: 'Chọn đội', cls: 'bg-amber-500/20 text-amber-300' },
    'team-vote': { emoji: '🗳️', text: 'Bỏ phiếu', cls: 'bg-cyan-500/20 text-cyan-300' },
    'team-vote-result': { emoji: '📊', text: 'Kết quả phiếu', cls: 'bg-cyan-500/20 text-cyan-300' },
    'quest-play': { emoji: '🎴', text: 'Chơi Quest', cls: 'bg-purple-500/20 text-purple-300' },
    'quest-result': { emoji: '📜', text: 'Kết quả Quest', cls: 'bg-purple-500/20 text-purple-300' },
    'discussion': { emoji: '💬', text: 'Thảo luận', cls: 'bg-emerald-500/20 text-emerald-300' },
    'lady-of-lake': { emoji: '🌊', text: 'Lady', cls: 'bg-cyan-500/20 text-cyan-300' },
    assassinate: { emoji: '🗡️', text: 'Ám sát', cls: 'bg-red-500/20 text-red-300' },
    end: { emoji: '🏁', text: 'Kết thúc', cls: 'bg-slate-500/20 text-slate-300' },
  };
  const cfg = map[phase] ?? map.end;
  return (
    <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${cfg.cls}`}>
      {cfg.emoji} {cfg.text}
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
        <span className="rounded-full bg-amber-500/30 border border-amber-400/40 px-1.5 py-0.5 text-[9px] font-black text-amber-200">
          👑 Leader
        </span>
      )}
      {isLady && (
        <span className="rounded-full bg-cyan-500/30 border border-cyan-400/40 px-1.5 py-0.5 text-[9px] font-black text-cyan-200">
          🌊 Lady
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
      <span className="text-base shrink-0 leading-none">{ROLE_ICONS[role]}</span>
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
        <div className="text-3xl shrink-0">{ROLE_ICONS[role]}</div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-black text-white truncate">{role}</p>
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
