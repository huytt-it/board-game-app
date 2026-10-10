'use client';

import type { Player } from '@/types/player';
import { AvalonRole } from './types';
import AvIcon from './assets/AvIcon';
import AvButton from './ui/AvButton';
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
        <h2 className="av-display flex items-center gap-2 text-2xl leading-tight text-(--av-text)">
          <AvIcon name="seal" className="text-(--av-gold)" /> Thư mật — chỉ mình bạn đọc
        </h2>
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
        <AvButton variant="primary" size="lg" block icon="check" onClick={onDone} className="mt-4">
          Đã đọc — sẵn sàng
        </AvButton>
      </div>
    </div>
  );
}
