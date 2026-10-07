'use client';

import type { Player } from '@/types/player';
import { type AvalonRole, type AvalonGameData, type AvalonGameState } from './types';
import {
  ROLE_DESC_VI,
  ROLE_NAMES_VI,
  ROLE_TEAM,
  TEAM_NAME_VI,
} from './constants';
import AvIcon from './assets/AvIcon';
import { TEAM_ICON_NAME } from './presentation';
import GlassPanel from './ui/GlassPanel';
import RoleEmblem from './ui/RoleEmblem';

interface RolePreviewPopupProps {
  state: AvalonGameState;
  myPlayer: Player;
  players: Player[];
  onClose: () => void;
}

// Popup mở từ header — gộp role của người chơi + preview lineup ván (Phe Người
// có vai gì, Phe Quỷ có vai gì, ai là Leader đầu, ai là Lady đầu) để người
// chơi xem lại bất cứ lúc nào trong ván mà không cần nhớ.
export default function RolePreviewPopup({
  state,
  myPlayer,
  players,
  onClose,
}: RolePreviewPopupProps) {
  const myData = myPlayer.gameData as Partial<AvalonGameData>;
  const myRole = myData.role;
  const myTeam = myData.team;
  const isGood = myTeam === 'good';

  const lineup = state.roleLineup ?? [];
  const goodRoles = lineup.filter((r) => ROLE_TEAM[r] === 'good');
  const evilRoles = lineup.filter((r) => ROLE_TEAM[r] === 'evil');

  const goodCounts: Record<string, number> = {};
  for (const r of goodRoles) goodCounts[r] = (goodCounts[r] ?? 0) + 1;
  const evilCounts: Record<string, number> = {};
  for (const r of evilRoles) evilCounts[r] = (evilCounts[r] ?? 0) + 1;

  // Leader đầu = leadersUsed[0]. Lady đầu = ladyHistory[0] hoặc current
  // ladyHolderId (nếu chưa transfer lần nào).
  const firstLeaderId = state.leadersUsed?.[0] ?? state.currentLeaderId;
  const firstLeader = firstLeaderId
    ? players.find((p) => p.id === firstLeaderId)
    : null;
  const firstLadyId = state.ladyHistory?.[0] ?? state.ladyHolderId;
  const firstLady = firstLadyId ? players.find((p) => p.id === firstLadyId) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-3 animate-fade-in"
      onClick={onClose}
    >
      {/* Neutral frame whatever the viewer's team (ux-plan 2.9). */}
      <GlassPanel
        tone="gold"
        emphasis
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="sticky top-0 float-right z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="Đóng"
        >
          <AvIcon name="close" size={20} />
        </button>

        {myRole && myTeam && (
          <section className="text-center pb-1">
            <p className="text-[11px] uppercase font-bold text-slate-300 tracking-widest">
              Vai của bạn
            </p>
            <div className="my-2 flex justify-center">
              <RoleEmblem role={myRole} size="lg" />
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full border border-(--av-parchment)/20 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                isGood ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'
              }`}
            >
              <AvIcon name={TEAM_ICON_NAME[myTeam]} /> {TEAM_NAME_VI[myTeam]}
            </span>
            <h2 className="av-display mt-2 text-3xl text-white">{myRole}</h2>
            <p className="text-xs font-semibold text-(--av-parchment)">
              {ROLE_NAMES_VI[myRole]}
            </p>
            <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-left">
              <p className="text-xs leading-relaxed text-slate-200">
                {ROLE_DESC_VI[myRole]}
              </p>
            </div>
          </section>
        )}

        <section className="mt-4">
          <p className="text-[11px] uppercase font-bold text-slate-400 tracking-widest mb-2">
            Vai trong ván ({lineup.length})
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-(--av-good)/35 bg-(--av-good)/10 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <AvIcon name="team-good" size={16} className="text-(--av-good-light)" />
                <h3 className="text-xs font-black text-(--av-good-light)">
                  Phe Người ({goodRoles.length})
                </h3>
              </div>
              <div className="space-y-1.5">
                {Object.entries(goodCounts).map(([role, count]) => (
                  <RoleRow key={role} role={role as AvalonRole} count={count} tone="good" />
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-(--av-evil)/35 bg-(--av-evil)/10 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <AvIcon name="team-evil" size={16} className="text-(--av-evil-light)" />
                <h3 className="text-xs font-black text-(--av-evil-light)">
                  Phe Quỷ ({evilRoles.length})
                </h3>
              </div>
              <div className="space-y-1.5">
                {Object.entries(evilCounts).map(([role, count]) => (
                  <RoleRow key={role} role={role as AvalonRole} count={count} tone="evil" />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={`mt-3 grid gap-2 ${firstLady ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--av-leader) text-lg text-(--av-ink) border-2 border-amber-100 shadow shadow-black/40">
              <AvIcon name="leader" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase font-black tracking-widest text-amber-300">
                Leader đầu
              </p>
              <p className="text-sm font-black text-white truncate">
                {firstLeader?.name ?? '?'}
                {firstLeader?.id === myPlayer.id && (
                  <span className="ml-1 text-[10px] text-amber-200">(bạn)</span>
                )}
              </p>
            </div>
          </div>
          {firstLady && (
            <div className="rounded-2xl border border-(--av-lady)/35 bg-(--av-lady)/5 p-3 flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--av-lady) text-lg text-(--av-ink) border-2 border-teal-100 shadow shadow-black/40">
                <AvIcon name="lady" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase font-black tracking-widest text-(--av-lady)">
                  Lady đầu
                </p>
                <p className="text-sm font-black text-white truncate">
                  {firstLady.name}
                  {firstLady.id === myPlayer.id && (
                    <span className="ml-1 text-[10px] text-teal-100">(bạn)</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </section>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-2xl border border-(--av-gold)/60 bg-(--av-gold)/20 py-3 text-base font-black text-(--av-parchment) transition-all hover:bg-(--av-gold)/30 active:scale-[0.98]"
        >
          ✓ Đóng
        </button>
      </GlassPanel>
    </div>
  );
}

function RoleRow({
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
      className={`flex items-start gap-2 rounded-lg border px-2 py-1.5 ${
        tone === 'good'
          ? 'border-(--av-good)/30 bg-(--av-good)/10'
          : 'border-(--av-evil)/30 bg-(--av-evil)/10'
      }`}
      title={ROLE_NAMES_VI[role]}
    >
      <RoleEmblem role={role} size="xs" className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black text-white truncate">{role}</p>
        <p className="text-[9px] text-slate-300/80 leading-snug line-clamp-2">
          {ROLE_DESC_VI[role]}
        </p>
      </div>
      {count > 1 && (
        <span
          className={`shrink-0 rounded-full px-1.5 py-px text-[9px] font-black ${
            tone === 'good'
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
