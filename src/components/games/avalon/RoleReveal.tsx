'use client';

import { useEffect, useState } from 'react';
import type { Player } from '@/types/player';
import { AvalonRole } from './types';
import { ROLE_DESC_VI, ROLE_NAMES_VI, ROLE_TEAM, TEAM_NAME_VI } from './constants';
import AvIcon from './assets/AvIcon';
import { TEAM_ICON_NAME } from './presentation';
import GlassPanel from './ui/GlassPanel';
import RoleEmblem from './ui/RoleEmblem';

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

  // Neutral on purpose: the full screen, the frame and the button look the same
  // for every role, so a neighbour learns nothing from colour or brightness.
  // The team shows only in a small label and the emblem's rim (ux-plan 2.9).
  // The scene behind is the hall (SceneBackdrop in the container).
  if (step === 'flip') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--av-ink)/55 animate-fade-in">
        <div className="text-center">
          <AvIcon name="seal" size={72} className="mb-4 animate-pulse text-(--av-gold)" />
          <p className="text-(--av-parchment) font-bold tracking-widest text-sm uppercase">
            Đang lật bài...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-(--av-ink)/55 p-6 animate-fade-in">
      <GlassPanel tone="gold" emphasis className="relative max-w-sm w-full p-8 text-center rounded-3xl animate-scale-in">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-(--av-parchment)/20 bg-black/30 px-3 py-1 text-[11px] font-black uppercase tracking-[0.25em] ${
            isGood ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'
          }`}
        >
          <AvIcon name={TEAM_ICON_NAME[team]} /> {TEAM_NAME_VI[team]}
        </span>
        <div className="my-5 flex justify-center">
          <RoleEmblem role={myRole} size="xl" />
        </div>
        <h2 className="av-display text-4xl text-white">{myRole}</h2>
        <p className="mt-1 text-sm font-bold text-(--av-parchment)">{ROLE_NAMES_VI[myRole]}</p>
        {/* min-h = the longest description (4 lines): the card keeps one size for every role */}
        <p className="mt-4 min-h-[5.75rem] text-sm leading-relaxed text-slate-200">{ROLE_DESC_VI[myRole]}</p>
        <p className="mt-3 text-[11px] text-slate-400 italic">
          Sau khi mọi người đọc xong, hệ thống sẽ lần lượt gọi: <AvIcon name="team-evil" /> Phe Quỷ
          → <AvIcon name="merlin" /> Merlin → <AvIcon name="percival" /> Percival
        </p>
        <button
          onClick={onDone}
          className="mt-5 w-full rounded-2xl border border-(--av-gold)/60 bg-(--av-gold)/20 py-4 text-base font-black text-(--av-parchment) transition-all hover:bg-(--av-gold)/30 active:scale-[0.98]"
        >
          ✓ Đã đọc — Sẵn sàng
        </button>
      </GlassPanel>
    </div>
  );
}
