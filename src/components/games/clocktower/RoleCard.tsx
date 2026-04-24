'use client';

import {
  ClocktowerRole,
  ROLE_TEAMS,
  ROLE_ABILITIES,
  ROLE_ICONS,
  ROLE_SHORT_DESC,
  type ClocktowerTeam,
} from '@/types/games/clocktower';

interface RoleCardProps {
  role: ClocktowerRole;
  isRevealed: boolean;
  compact?: boolean;
}

const TEAM_COLORS: Record<ClocktowerTeam, {
  bg: string; border: string; text: string; badge: string; glow: string;
}> = {
  townsfolk: {
    bg: 'from-blue-900/40 to-blue-800/20',
    border: 'border-blue-500/30',
    text: 'text-blue-300',
    badge: 'bg-blue-500/20 text-blue-300',
    glow: 'rgba(59, 130, 246, 0.25)',
  },
  outsider: {
    bg: 'from-teal-900/40 to-teal-800/20',
    border: 'border-teal-500/30',
    text: 'text-teal-300',
    badge: 'bg-teal-500/20 text-teal-300',
    glow: 'rgba(20, 184, 166, 0.25)',
  },
  minion: {
    bg: 'from-orange-900/40 to-orange-800/20',
    border: 'border-orange-500/30',
    text: 'text-orange-300',
    badge: 'bg-orange-500/20 text-orange-300',
    glow: 'rgba(249, 115, 22, 0.25)',
  },
  demon: {
    bg: 'from-red-900/40 to-red-800/20',
    border: 'border-red-500/30',
    text: 'text-red-300',
    badge: 'bg-red-500/20 text-red-300',
    glow: 'rgba(239, 68, 68, 0.3)',
  },
};

export default function RoleCard({ role, isRevealed, compact = false }: RoleCardProps) {
  const team = ROLE_TEAMS[role];
  const colors = TEAM_COLORS[team];
  const ability = ROLE_ABILITIES[role];
  const icon = ROLE_ICONS[role];
  const shortDesc = ROLE_SHORT_DESC[role];

  if (!isRevealed) {
    return (
      <div className={`rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 ${compact ? 'p-3' : 'p-6'} text-center`}>
        <div className={`${compact ? 'text-3xl' : 'text-5xl'} mb-2`}>❓</div>
        <p className="text-sm text-slate-500">Role Hidden</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 rounded-xl border ${colors.border} bg-gradient-to-r ${colors.bg} p-3 animate-role-glow`}
        style={{ '--glow-color': colors.glow } as React.CSSProperties}
      >
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-bold ${colors.text}`}>{role}</p>
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${colors.badge} rounded-full px-2 py-0.5`}>
              {team}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate">{shortDesc}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border ${colors.border} bg-gradient-to-br ${colors.bg} p-6 animate-role-glow`}
      style={{ '--glow-color': colors.glow } as React.CSSProperties}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-4xl">{icon}</span>
        <span className={`rounded-full ${colors.badge} px-3 py-1 text-xs font-bold uppercase tracking-wider`}>
          {team}
        </span>
      </div>
      <h3 className={`mb-1 text-xl font-bold ${colors.text}`}>{role}</h3>
      <p className="mb-3 text-xs text-slate-400 font-medium">{shortDesc}</p>
      <div className="h-px bg-white/10 mb-3" />
      <p className="text-sm leading-relaxed text-slate-300">{ability}</p>
    </div>
  );
}
