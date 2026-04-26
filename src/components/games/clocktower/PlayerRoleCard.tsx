'use client';

import {
  ClocktowerRole,
  ClocktowerTeam,
  ROLE_ICONS,
  ROLE_NAMES_VI,
  ROLE_TEAM_VI,
  ROLE_TEAMS,
  ROLE_FULL_DESC_VI,
  ROLE_TIPS_VI,
} from '@/types/games/clocktower';

// ─── Team colour config ─────────────────────────────────────────────────
const TEAM_STYLE: Record<ClocktowerTeam, {
  gradient: string; border: string; badge: string; dot: string; glow: string; teamText: string;
}> = {
  townsfolk: {
    gradient: 'from-blue-900/60 to-indigo-900/30',
    border: 'border-blue-500/30',
    badge: 'bg-blue-500/20 text-blue-300',
    dot: 'bg-blue-400',
    glow: 'shadow-blue-500/20',
    teamText: 'text-blue-300',
  },
  outsider: {
    gradient: 'from-purple-900/60 to-violet-900/30',
    border: 'border-purple-500/30',
    badge: 'bg-purple-500/20 text-purple-300',
    dot: 'bg-purple-400',
    glow: 'shadow-purple-500/20',
    teamText: 'text-purple-300',
  },
  minion: {
    gradient: 'from-orange-900/60 to-red-900/30',
    border: 'border-orange-500/30',
    badge: 'bg-orange-500/20 text-orange-300',
    dot: 'bg-orange-400',
    glow: 'shadow-orange-500/20',
    teamText: 'text-orange-300',
  },
  demon: {
    gradient: 'from-red-900/70 to-rose-900/40',
    border: 'border-red-500/40',
    badge: 'bg-red-500/20 text-red-300',
    dot: 'bg-red-500',
    glow: 'shadow-red-500/30',
    teamText: 'text-red-300',
  },
};

const TEAM_EMOJI: Record<ClocktowerTeam, string> = {
  townsfolk: '🌟',
  outsider: '🌀',
  minion: '🗡️',
  demon: '👹',
};

interface PlayerRoleCardProps {
  role: ClocktowerRole;
  /** True = drunk player seeing fake role; adds warning banner */
  isDrunk?: boolean;
  onClose: () => void;
}

export default function PlayerRoleCard({ role, isDrunk = false, onClose }: PlayerRoleCardProps) {
  const team = ROLE_TEAMS[role];
  const style = TEAM_STYLE[team];
  const tips = ROLE_TIPS_VI[role];

  return (
    /* Slide-up overlay */
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col rounded-t-3xl bg-slate-900 pb-safe max-h-[92dvh] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-4 pb-6 space-y-4">

          {/* Drunk warning */}
          {isDrunk && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
              <span className="text-2xl shrink-0">🍺</span>
              <div>
                <p className="text-sm font-black text-amber-300">Bạn đang Say Rượu!</p>
                <p className="text-xs text-amber-400/80 mt-0.5 leading-snug">
                  Đây là vai trò bạn <em>nghĩ</em> mình đang có. Thông tin Quản trò đưa cho bạn có thể không chính xác.
                </p>
              </div>
            </div>
          )}

          {/* Role hero card */}
          <div className={`rounded-3xl border ${style.border} bg-gradient-to-br ${style.gradient} p-5 shadow-xl ${style.glow}`}>
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <span className="text-7xl block animate-float">{ROLE_ICONS[role]}</span>
                <div className="absolute inset-0 -z-10 blur-2xl opacity-40 text-7xl flex items-center justify-center">
                  {ROLE_ICONS[role]}
                </div>
              </div>
            </div>

            {/* Names */}
            <div className="text-center mb-4">
              <h2 className="text-2xl font-black text-white">{role}</h2>
              <p className={`text-base font-bold ${style.teamText} mt-0.5`}>{ROLE_NAMES_VI[role]}</p>
            </div>

            {/* Team badge */}
            <div className="flex justify-center mb-4">
              <div className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-bold text-sm ${style.badge}`}>
                <span>{TEAM_EMOJI[team]}</span>
                <span>Phe {ROLE_TEAM_VI[team]}</span>
                <span className="opacity-60">· {team}</span>
              </div>
            </div>

            {/* Full description */}
            <div className="rounded-2xl bg-black/25 border border-white/8 px-4 py-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
                Kỹ năng
              </p>
              <p className="text-sm text-slate-100 leading-relaxed">{ROLE_FULL_DESC_VI[role]}</p>
            </div>
          </div>

          {/* Gameplay tips */}
          {tips.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3">
                💡 Gợi ý cách chơi
              </p>
              <div className="space-y-3">
                {tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                    <p className="text-sm text-slate-300 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-bold text-slate-400 active:bg-white/10 transition-all"
          >
            ✕ Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
