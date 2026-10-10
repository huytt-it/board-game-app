import type { Player } from '@/types/player';
import type { AvalonGameState } from '../types';
import { formatClock, usePhaseClock } from '../hooks/usePhaseClock';
import { DockStatus, LowTimeClock, PanelHead, PanelLine, PanelNote } from './shared';
import ActionDock from '../ui/ActionDock';
import AvButton from '../ui/AvButton';
import GlassPanel from '../ui/GlassPanel';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

// discussion ("one sentence, one action", ux-plan 8b): the title with the
// clock, how many are ready, and the button. Who is ready is the dot before
// each name on the table (RoundTable); the journey is in the quest tiles.
export function DiscussionSection({
  state,
  myPlayer,
  gamePlayers,
  onAckDiscussion,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  gamePlayers: Player[];
  onAckDiscussion: () => void;
}) {
  const { remaining } = usePhaseClock(state);

  const ackedIds = Object.keys(state.roleAcks ?? {});
  const myAcked = ackedIds.includes(myPlayer.id);
  const total = gamePlayers.length;
  const ackCount = ackedIds.length;
  const quest = ROMAN[state.currentQuest] ?? state.currentQuest + 1;

  return (
    <div className="flex flex-col gap-3">
      <GlassPanel className="p-4">
        <PanelHead
          title="Thảo luận"
          clock={
            <LowTimeClock low={remaining < 60_000}>
              <span role="timer">{formatClock(remaining)}</span>
            </LowTimeClock>
          }
        />
        <PanelLine>Bàn bạc trước Quest {quest}; mọi người sẵn sàng là vào chọn đội ngay.</PanelLine>
        <PanelNote data-ready-count={`${ackCount}/${total}`}>
          Sẵn sàng {ackCount}/{total}
        </PanelNote>
      </GlassPanel>

      {/* Right under the panel on desktop; pinned to the bottom on mobile. */}
      <ActionDock>
        {!myAcked ? (
          <AvButton variant="primary" size="lg" block icon="check" onClick={onAckDiscussion}>
            Tôi sẵn sàng
          </AvButton>
        ) : (
          <DockStatus icon="check" title="Bạn đã sẵn sàng" note="Chờ những người còn lại" />
        )}
      </ActionDock>
    </div>
  );
}
