'use client';

import { useState } from 'react';
import {
  ClocktowerRole,
  ClocktowerTeam,
  ROLE_ICONS,
  ROLE_NAMES_VI,
  ROLE_TEAM_VI,
  ROLE_TEAMS,
  ROLE_SHORT_DESC,
  ROLE_FULL_DESC_VI,
  ROLE_TIPS_VI,
} from '@/types/games/clocktower';

// ─── Team style config ──────────────────────────────────────────────────
const TEAM_STYLE: Record<ClocktowerTeam, {
  bg: string; border: string; dot: string; badge: string; header: string;
}> = {
  townsfolk: {
    bg: 'bg-blue-900/20',
    border: 'border-blue-500/30',
    dot: 'bg-blue-400',
    badge: 'bg-blue-500/20 text-blue-300',
    header: 'text-blue-300',
  },
  outsider: {
    bg: 'bg-purple-900/20',
    border: 'border-purple-500/30',
    dot: 'bg-purple-400',
    badge: 'bg-purple-500/20 text-purple-300',
    header: 'text-purple-300',
  },
  minion: {
    bg: 'bg-orange-900/20',
    border: 'border-orange-500/30',
    dot: 'bg-orange-400',
    badge: 'bg-orange-500/20 text-orange-300',
    header: 'text-orange-300',
  },
  demon: {
    bg: 'bg-red-900/25',
    border: 'border-red-500/40',
    dot: 'bg-red-500',
    badge: 'bg-red-500/20 text-red-300',
    header: 'text-red-300',
  },
};

const TEAM_WIN_CONDITION: Record<ClocktowerTeam, string> = {
  townsfolk: 'Xử tử Quỷ bằng bỏ phiếu. Chiến thắng khi Quỷ bị loại!',
  outsider: 'Về phe Thiện nhưng có đặc điểm phức tạp. Sống sót và hỗ trợ làng.',
  minion: 'Giúp Quỷ sinh tồn. Chiến thắng khi Quỷ thống trị làng.',
  demon: 'Giết người mỗi đêm. Chiến thắng khi số người ác ≥ số người thiện.',
};

const TEAM_ORDER: ClocktowerTeam[] = ['townsfolk', 'outsider', 'minion', 'demon'];

const ROLES_BY_TEAM: Record<ClocktowerTeam, ClocktowerRole[]> = {
  townsfolk: [
    ClocktowerRole.Washerwoman, ClocktowerRole.Librarian, ClocktowerRole.Investigator,
    ClocktowerRole.Chef, ClocktowerRole.Empath, ClocktowerRole.FortuneTeller,
    ClocktowerRole.Undertaker, ClocktowerRole.Monk, ClocktowerRole.Ravenkeeper,
    ClocktowerRole.Virgin, ClocktowerRole.Slayer, ClocktowerRole.Soldier, ClocktowerRole.Mayor,
  ],
  outsider: [ClocktowerRole.Butler, ClocktowerRole.Drunk, ClocktowerRole.Recluse, ClocktowerRole.Saint],
  minion: [ClocktowerRole.Poisoner, ClocktowerRole.Spy, ClocktowerRole.ScarletWoman, ClocktowerRole.Baron],
  demon: [ClocktowerRole.Imp],
};

// ─── Single role card (expandable) ─────────────────────────────────────
function RoleCard({ role, team, defaultOpen = false }: {
  role: ClocktowerRole;
  team: ClocktowerTeam;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const style = TEAM_STYLE[team];
  const tips = ROLE_TIPS_VI[role];

  return (
    <div className={`rounded-2xl border ${style.border} ${style.bg} overflow-hidden transition-all`}>
      {/* Header row — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="text-2xl shrink-0">{ROLE_ICONS[role]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-white text-sm leading-tight">{role}</span>
            <span className="text-[10px] text-slate-400 font-medium">·</span>
            <span className={`text-xs font-bold ${style.header}`}>{ROLE_NAMES_VI[role]}</span>
          </div>
          {!open && (
            <p className="text-[11px] text-slate-500 leading-snug mt-0.5 line-clamp-1">
              {ROLE_SHORT_DESC[role]}
            </p>
          )}
        </div>
        <span className={`shrink-0 text-slate-500 text-xs transition-transform ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {/* Official ability text */}
          <div className="rounded-xl bg-black/20 border border-white/5 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
              Kỹ năng
            </p>
            <p className="text-sm text-slate-200 leading-relaxed">{ROLE_FULL_DESC_VI[role]}</p>
          </div>

          {/* Tips */}
          {tips.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                💡 Gợi ý chơi
              </p>
              {tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
                  <p className="text-xs text-slate-300 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Handbook component ────────────────────────────────────────────
interface RoleHandbookProps {
  onClose: () => void;
  /** If set, that role's card is auto-expanded and scrolled to */
  highlightRole?: ClocktowerRole;
}

export default function RoleHandbook({ onClose, highlightRole }: RoleHandbookProps) {
  const [activeTeam, setActiveTeam] = useState<ClocktowerTeam | 'all'>('all');

  const shownTeams = activeTeam === 'all' ? TEAM_ORDER : [activeTeam];

  return (
    /* Full-screen overlay */
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 animate-slide-up">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-slate-950/98 px-4 py-3 backdrop-blur-md pt-safe">
        <span className="text-xl">📖</span>
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-white text-base leading-tight">Sách Hướng Dẫn</h2>
          <p className="text-[11px] text-slate-500">Blood on the Clocktower · Trouble Brewing</p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-bold text-slate-300 active:bg-white/10"
        >
          ✕ Đóng
        </button>
      </div>

      {/* Team filter tabs */}
      <div className="shrink-0 flex gap-2 overflow-x-auto px-4 py-3 border-b border-white/5 no-scrollbar">
        {(['all', ...TEAM_ORDER] as const).map((t) => {
          const isActive = activeTeam === t;
          const style = t !== 'all' ? TEAM_STYLE[t] : null;
          return (
            <button
              key={t}
              onClick={() => setActiveTeam(t)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                isActive
                  ? style
                    ? `${style.badge} ring-1 ring-white/20`
                    : 'bg-white/15 text-white ring-1 ring-white/20'
                  : 'bg-white/5 text-slate-400 hover:bg-white/8'
              }`}
            >
              {t === 'all' ? 'Tất cả' : `${ROLE_TEAM_VI[t]}`}
            </button>
          );
        })}
      </div>

      {/* Scrollable role list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-safe">
        {shownTeams.map((team) => {
          const style = TEAM_STYLE[team];
          const roles = ROLES_BY_TEAM[team];
          return (
            <section key={team}>
              {/* Team header */}
              <div className={`flex items-center gap-2 rounded-xl border ${style.border} ${style.bg} px-4 py-3 mb-3`}>
                <div className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-black text-sm ${style.header}`}>{ROLE_TEAM_VI[team]}</span>
                    <span className="text-slate-600 text-xs">({team})</span>
                    <span className={`ml-auto text-[10px] rounded-full px-2 py-0.5 font-bold ${style.badge}`}>
                      {roles.length} vai
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {TEAM_WIN_CONDITION[team]}
                  </p>
                </div>
              </div>

              {/* Role cards */}
              <div className="space-y-2">
                {roles.map((role) => (
                  <RoleCard
                    key={role}
                    role={role}
                    team={team}
                    defaultOpen={role === highlightRole}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
