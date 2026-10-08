'use client';

import { AvalonRole } from './types';
import { ROLE_DESC_VI, ROLE_NAMES_VI, ROLE_TEAM, TEAM_NAME_VI } from './constants';
import AvIcon from './assets/AvIcon';
import { TEAM_ICON_NAME } from './presentation';
import GlassPanel from './ui/GlassPanel';
import RoleEmblem from './ui/RoleEmblem';

interface RoleCardProps {
  role: AvalonRole;
  onClose: () => void;
}

export default function RoleCard({ role, onClose }: RoleCardProps) {
  const team = ROLE_TEAM[role];
  const isGood = team === 'good';

  // Neutral frame, emblem and button for every role (ux-plan 2.9, 2.11): the
  // team shows only in the small label.
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <GlassPanel tone="gold" emphasis className="relative w-full max-w-md overflow-hidden rounded-3xl p-6">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="Đóng"
        >
          <AvIcon name="close" size={20} />
        </button>

        <div className="text-center">
          <div className="mb-3 flex justify-center">
            <RoleEmblem role={role} size="xl" tone="neutral" />
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border border-(--av-parchment)/20 bg-black/30 px-3 py-1 text-xs font-black uppercase tracking-widest ${
              isGood ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'
            }`}
          >
            <AvIcon name={TEAM_ICON_NAME[team]} /> {TEAM_NAME_VI[team]}
          </span>
          {/* One line for every role, so the card keeps one height (see RoleReveal). */}
          <h2 className="av-display mt-3 whitespace-nowrap text-[min(2.25rem,8.2vw)] leading-tight text-white">{role}</h2>
          <p className="mt-1 text-sm font-semibold text-(--av-parchment)">{ROLE_NAMES_VI[role]}</p>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
          {/* min-h = the longest description (4 lines), so every role's card has the same size */}
          <p className="min-h-[5.75rem] text-sm leading-relaxed text-slate-200">{ROLE_DESC_VI[role]}</p>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-2xl border border-(--av-gold)/60 bg-(--av-gold)/20 py-3.5 text-base font-black text-(--av-parchment) transition-all hover:bg-(--av-gold)/30 active:scale-[0.98]"
        >
          ✓ Đã rõ
        </button>
      </GlassPanel>
    </div>
  );
}
