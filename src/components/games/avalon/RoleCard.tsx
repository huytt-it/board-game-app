'use client';

import { AvalonRole } from './types';
import { ROLE_DESC_VI, ROLE_ICONS, ROLE_NAMES_VI, ROLE_TEAM, TEAM_NAME_VI } from './constants';

interface RoleCardProps {
  role: AvalonRole;
  onClose: () => void;
}

export default function RoleCard({ role, onClose }: RoleCardProps) {
  const team = ROLE_TEAM[role];
  const isGood = team === 'good';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-3xl border-2 p-6 shadow-2xl ${
          isGood
            ? 'border-blue-500/50 bg-gradient-to-br from-blue-950/95 to-slate-950/95'
            : 'border-red-500/50 bg-gradient-to-br from-red-950/95 to-slate-950/95'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          ✕
        </button>

        <div className="text-center">
          <div className="text-7xl mb-3">{ROLE_ICONS[role]}</div>
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${
              isGood ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'
            }`}
          >
            {TEAM_NAME_VI[team]}
          </span>
          <h2 className="mt-3 text-2xl font-black text-white">{role}</h2>
          <p className={`mt-1 text-sm font-semibold ${isGood ? 'text-blue-300' : 'text-red-300'}`}>
            {ROLE_NAMES_VI[role]}
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
          <p className="text-sm leading-relaxed text-slate-200">{ROLE_DESC_VI[role]}</p>
        </div>

        <button
          onClick={onClose}
          className={`mt-5 w-full rounded-2xl py-3.5 text-base font-black text-white transition-all active:scale-[0.98] ${
            isGood
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'
              : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500'
          }`}
        >
          ✓ Đã rõ
        </button>
      </div>
    </div>
  );
}
