import type { Player } from '@/types/player';
import type { AvalonGameState } from '../types';
import { formatClock, usePhaseClock } from '../hooks/usePhaseClock';
import { LowTimeClock, PanelHead, PanelLine, PanelNote } from './shared';
import ActionDock from '../ui/ActionDock';
import AvButton from '../ui/AvButton';
import GlassPanel from '../ui/GlassPanel';

// role-reveal, once the viewer has closed their letter: one panel (title,
// clock, how many have read), the same for every role. Who is ready is the
// dot before each name on the table.
export function RoleRevealWaitingSection({
  state,
  myPlayer,
  gamePlayers,
  onShowMyRole,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  gamePlayers: Player[];
  onShowMyRole: () => void;
}) {
  const { remaining } = usePhaseClock(state);

  const ackedIds = Object.keys(state.roleAcks ?? {});
  const myAcked = ackedIds.includes(myPlayer.id);
  const ackCount = ackedIds.length;
  const total = gamePlayers.length;
  const allAcked = ackCount >= total;

  return (
    <div className="space-y-3">
      <GlassPanel className="p-4">
        <PanelHead
          title="Đang đọc thư"
          clock={
            allAcked ? undefined : (
              <LowTimeClock low={remaining < 30_000}>{formatClock(remaining)}</LowTimeClock>
            )
          }
        />
        <PanelLine>
          {allAcked
            ? 'Mọi người đã đọc — đang sang lượt Đêm.'
            : myAcked
              ? 'Bạn đã sẵn sàng. Hết giờ hoặc khi mọi người đọc xong là vào lượt Đêm.'
              : 'Bạn chưa xác nhận đã đọc vai.'}
        </PanelLine>
        <PanelNote data-ready-count={`${ackCount}/${total}`}>
          Sẵn sàng {ackCount}/{total}
        </PanelNote>
      </GlassPanel>

      {!myAcked && (
        <ActionDock>
          <AvButton variant="primary" size="lg" block icon="eye" onClick={onShowMyRole}>
            Xem lại vai
          </AvButton>
        </ActionDock>
      )}
    </div>
  );
}
