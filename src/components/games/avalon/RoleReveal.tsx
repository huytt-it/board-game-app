'use client';

import type { Player } from '@/types/player';
import { AvalonRole } from './types';
import AvIcon from './assets/AvIcon';
import RoleLetter from './ui/RoleLetter';

interface RoleRevealProps {
  myRole: AvalonRole;
  myPlayerId: string;
  players: Player[];
  /** state.phaseStartedAt of role-reveal: the letter's entrance follows it. */
  startedAt?: number | null;
  onDone: () => void;
}

// The role reveal: a letter under a wax seal, the same for every role until
// the player presses and holds it (ui/RoleLetter). The screen around it is
// neutral — the hall behind (SceneBackdrop in the container), one dim layer,
// one button — so a neighbour learns nothing from colour or size.
export default function RoleReveal({ myRole, startedAt, onDone }: RoleRevealProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-(--av-ink)/55 px-4 py-5">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-(--av-gold)">
          <AvIcon name="seal" /> Thư mật
        </p>
        <h2 className="av-display mt-0.5 text-2xl leading-tight text-(--av-parchment)">Chỉ mình bạn được đọc</h2>
        <div className="mt-3 w-full">
          <RoleLetter
            role={myRole}
            startedAt={startedAt ?? null}
            footer={
              <>
                Sau khi mọi người đọc xong, lần lượt gọi: <AvIcon name="team-evil" /> Phe Quỷ → <AvIcon name="merlin" /> Merlin →{' '}
                <AvIcon name="percival" /> Percival
              </>
            }
          />
        </div>
        <button
          onClick={onDone}
          className="mt-4 w-full rounded-2xl border border-(--av-gold)/60 bg-(--av-gold)/20 py-4 text-base font-black text-(--av-parchment) transition-all hover:bg-(--av-gold)/30 active:scale-[0.98]"
        >
          ✓ Đã đọc — Sẵn sàng
        </button>
      </div>
    </div>
  );
}
