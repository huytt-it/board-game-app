'use client';

import type { Player } from '@/types/player';
import { type AvalonRole, type AvalonGameState } from './types';
import { ROLE_DESC_VI, ROLE_NAMES_VI, ROLE_TEAM, TEAM_NAME_VI } from './constants';
import AvIcon from './assets/AvIcon';
import { TEAM_ICON_NAME, inDisplayOrder } from './presentation';
import AvButton from './ui/AvButton';
import GlassPanel from './ui/GlassPanel';
import RoleEmblem from './ui/RoleEmblem';
import { useDialog } from './hooks/useDialog';

interface RolePreviewPopupProps {
  state: AvalonGameState;
  myPlayer: Player;
  players: Player[];
  onClose: () => void;
}

// "Các vai trong ván" (the top bar's "⋯" menu): the game's line-up — which
// roles Good and Evil have, the first Leader and the first Lady — to look up
// at any time. Only public information, so it is the same on every screen;
// the viewer's own role lives in "Vai của tôi" (press and hold), not here.
export default function RolePreviewPopup({ state, myPlayer, players, onClose }: RolePreviewPopupProps) {
  // Listed in a fixed order, never in roleLineup's (seat) order — see inDisplayOrder.
  const lineup = inDisplayOrder(state.roleLineup ?? []);
  const goodRoles = lineup.filter((r) => ROLE_TEAM[r] === 'good');
  const evilRoles = lineup.filter((r) => ROLE_TEAM[r] === 'evil');

  const goodCounts: Record<string, number> = {};
  for (const r of goodRoles) goodCounts[r] = (goodCounts[r] ?? 0) + 1;
  const evilCounts: Record<string, number> = {};
  for (const r of evilRoles) evilCounts[r] = (evilCounts[r] ?? 0) + 1;

  // Leader đầu = leadersUsed[0]. Lady đầu = ladyHistory[0] hoặc current
  // ladyHolderId (nếu chưa transfer lần nào).
  const firstLeaderId = state.leadersUsed?.[0] ?? state.currentLeaderId;
  const firstLeader = firstLeaderId ? players.find((p) => p.id === firstLeaderId) : null;
  const firstLadyId = state.ladyHistory?.[0] ?? state.ladyHolderId;
  const firstLady = firstLadyId ? players.find((p) => p.id === firstLadyId) : null;

  const dialog = useDialog<HTMLDivElement>(onClose);

  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label="Các vai trong ván"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 animate-fade-in outline-none sm:items-center"
      onClick={onClose}
    >
      <GlassPanel solid className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-(--av-line) py-2 pl-4 pr-2">
          <h2 className="av-display flex items-center gap-2 text-xl text-(--av-text)">
            <AvIcon name="roles" className="text-(--av-gold)" /> Các vai trong ván
            <span className="font-sans text-sm font-semibold text-(--av-text-3)">({lineup.length})</span>
          </h2>
          <AvButton variant="ghost" icon="close" onClick={onClose} className="ml-auto" aria-label="Đóng" title="Đóng" />
        </div>

        <div className="overflow-y-auto p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {(['good', 'evil'] as const).map((team) => {
              const counts = team === 'good' ? goodCounts : evilCounts;
              const n = team === 'good' ? goodRoles.length : evilRoles.length;
              return (
                <section key={team}>
                  <h3
                    className={`mb-2 flex items-center gap-1.5 text-sm font-semibold ${team === 'good' ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'}`}
                  >
                    <AvIcon name={TEAM_ICON_NAME[team]} /> {TEAM_NAME_VI[team]} ({n})
                  </h3>
                  <ul className="divide-y divide-(--av-line)">
                    {Object.entries(counts).map(([role, count]) => (
                      <RoleRow key={role} role={role as AvalonRole} count={count} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          <div className={`mt-4 grid gap-3 border-t border-(--av-line) pt-4 ${firstLady ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <FirstHolder icon="leader" label="Leader đầu" name={firstLeader?.name ?? '?'} me={firstLeader?.id === myPlayer.id} />
            {firstLady && <FirstHolder icon="lady" label="Lady đầu" name={firstLady.name} me={firstLady.id === myPlayer.id} />}
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}

function FirstHolder({ icon, label, name, me }: { icon: 'leader' | 'lady'; label: string; name: string; me: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-(--av-parchment)/70 text-(--av-ink) ${icon === 'leader' ? 'bg-(--av-gold)' : 'bg-(--av-lady)'}`}
      >
        <AvIcon name={icon} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-(--av-text-3)">{label}</p>
        <p className="truncate text-sm font-semibold text-(--av-text)">
          {name}
          {me && <span className="ml-1 text-xs text-(--av-text-2)">(bạn)</span>}
        </p>
      </div>
    </div>
  );
}

function RoleRow({ role, count }: { role: AvalonRole; count: number }) {
  return (
    <li className="flex items-start gap-2.5 py-2" title={ROLE_NAMES_VI[role]}>
      <RoleEmblem role={role} size="sm" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-(--av-text)">
          {role}
          {count > 1 && <span className="ml-1 tabular-nums text-(--av-text-3)">×{count}</span>}
        </p>
        <p className="text-xs leading-snug text-(--av-text-2)">{ROLE_DESC_VI[role]}</p>
      </div>
    </li>
  );
}
