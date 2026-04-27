'use client';

import { useEffect, useState } from 'react';
import type { Player } from '@/types/player';
import { AvalonRole } from './types';
import { ROLE_DESC_VI, ROLE_ICONS, ROLE_NAMES_VI, ROLE_TEAM, TEAM_NAME_VI } from './constants';

interface RoleRevealProps {
  myRole: AvalonRole;
  myPlayerId: string;
  players: Player[];
  onDone: () => void;
}

export default function RoleReveal({ myRole, onDone }: RoleRevealProps) {
  const [step, setStep] = useState<'flip' | 'role'>('flip');
  const team = ROLE_TEAM[myRole];
  const isGood = team === 'good';

  useEffect(() => {
    const t = setTimeout(() => setStep('role'), 1200);
    return () => clearTimeout(t);
  }, []);

  if (step === 'flip') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 animate-fade-in">
        <div className="text-center">
          <div className="text-7xl mb-4 animate-pulse">⚜️</div>
          <p className="text-slate-300 font-bold tracking-widest text-sm uppercase">
            Đang lật bài...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 animate-fade-in ${
        isGood
          ? 'bg-gradient-to-br from-blue-950 via-slate-950 to-cyan-950'
          : 'bg-gradient-to-br from-red-950 via-slate-950 to-rose-950'
      }`}
    >
      <div
        className={`relative rounded-3xl border-2 p-8 shadow-2xl max-w-sm w-full text-center animate-scale-in ${
          isGood
            ? 'border-blue-500/60 bg-gradient-to-br from-blue-900/40 to-slate-900/60 shadow-blue-500/20'
            : 'border-red-500/60 bg-gradient-to-br from-red-900/40 to-slate-900/60 shadow-red-500/20'
        }`}
      >
        <span
          className={`inline-block rounded-full px-4 py-1 text-[11px] font-black uppercase tracking-[0.3em] ${
            isGood ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'
          }`}
        >
          {TEAM_NAME_VI[team]}
        </span>
        <div className="text-8xl my-5">{ROLE_ICONS[myRole]}</div>
        <h2 className="text-3xl font-black text-white">{myRole}</h2>
        <p className={`mt-1 text-sm font-bold ${isGood ? 'text-blue-300' : 'text-red-300'}`}>
          {ROLE_NAMES_VI[myRole]}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">{ROLE_DESC_VI[myRole]}</p>
        <p className="mt-3 text-[11px] text-slate-500 italic">
          Sau khi mọi người đọc xong, hệ thống sẽ lần lượt gọi: 🗡️ Phe Ác → 🧙 Merlin → 🛡️ Percival
        </p>
        <button
          onClick={onDone}
          className={`mt-5 w-full rounded-2xl py-4 text-base font-black text-white transition-all active:scale-[0.98] ${
            isGood
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'
              : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500'
          }`}
        >
          ✓ Đã đọc — Sẵn sàng
        </button>
      </div>
    </div>
  );
}
