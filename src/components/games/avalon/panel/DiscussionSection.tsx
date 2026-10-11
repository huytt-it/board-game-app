import type { Player } from '@/types/player';
import type { AvalonGameState } from '../types';
import { formatCountdown, isLowTime, usePhaseClock } from '../hooks/usePhaseClock';
import { DockStatus, LowTimeClock, PanelHead, PanelLine, PanelNote } from './shared';
import { LadyEventText, recentLadyEvent } from './ladyEvent';
import AvIcon from '../assets/AvIcon';
import ActionDock from '../ui/ActionDock';
import AvButton from '../ui/AvButton';
import GlassPanel from '../ui/GlassPanel';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

// discussion ("one sentence, one action", ux-plan 8b): the title with the
// clock, how many are ready, and the button. Who is ready is the dot before
// each name on the table (RoundTable); the journey is in the quest tiles.
// After a Lady turn, one more line says how it ended (GĐ8, ladyLastEvent) —
// the lasting source; the banner (ui/LadyNotice) only decorates it.
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
  // How the Lady's turn right before this discussion ended (public, no team).
  const ladyEvent = recentLadyEvent(state);

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
            <LowTimeClock low={isLowTime(state, remaining)}>
              <span role="timer">{formatCountdown(state.phase, remaining)}</span>
            </LowTimeClock>
          }
        />
        <PanelLine>Bàn bạc trước Quest {quest}; mọi người sẵn sàng là vào chọn đội ngay.</PanelLine>
        {ladyEvent && (
          <p className="mt-2 flex items-start gap-1.5 text-sm text-(--av-text-2)" data-lady-event={ladyEvent.how}>
            <AvIcon name="lady" className="mt-0.5 shrink-0 text-(--av-lady)" />
            <span>
              <LadyEventText event={ladyEvent} players={gamePlayers} />
            </span>
          </p>
        )}
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
