import type { Player } from '@/types/player';
import type { AvalonGameState } from '../types';
import { questNeedsTwoFails } from '../constants';
import { formatSecs, usePhaseClock } from '../hooks/usePhaseClock';
import { LowTimeClock, PanelHead, PanelLine, PanelNote, TwoFailNote } from './shared';
import ActionDock from '../ui/ActionDock';
import AvButton from '../ui/AvButton';
import GlassPanel from '../ui/GlassPanel';

// team-build ("one sentence, one action", ux-plan 8b). The Leader picks on the
// table — a tap on a seat adds or removes that player (PlayerPanel
// handleTablePick) — and submits in the dock. Everybody else reads one line.
// Who is picked is the parchment ring and token on the seats.
export function TeamBuildSection({
  isLeader,
  state,
  gamePlayers,
  teamSize,
  onSubmitTeam,
}: {
  isLeader: boolean;
  state: AvalonGameState;
  gamePlayers: Player[];
  teamSize: number;
  onSubmitTeam: () => void;
}) {
  const leader = gamePlayers.find((p) => p.id === state.currentLeaderId);
  const team = state.proposedTeam;
  const picked = team.map((id) => gamePlayers.find((p) => p.id === id)?.name).filter(Boolean);
  const needsTwo = questNeedsTwoFails(gamePlayers.length, state.currentQuest);

  // Countdown 60s cho Leader chọn đội. Hết giờ: auto-submit nếu đủ size,
  // ngược lại xoay sang Leader kế tiếp (xử lý trong useAvalon). The Leader's
  // dock is already blinking: their clock only turns red.
  const { remaining } = usePhaseClock(state);
  const lowTime = remaining < 15_000;
  const clock = (
    <LowTimeClock low={lowTime} throb={!isLeader}>
      {formatSecs(remaining)}
    </LowTimeClock>
  );
  const count = (
    <PanelNote data-pick-count={`${team.length}/${teamSize}`}>
      Đã chọn {team.length}/{teamSize}
      {picked.length > 0 && <>: <span className="text-(--av-text-2)">{picked.join(', ')}</span></>}
    </PanelNote>
  );

  if (!isLeader) {
    return (
      <GlassPanel className="p-4">
        <PanelHead title="Chọn đội" clock={clock} />
        <PanelLine>
          Leader <span className="font-semibold text-(--av-text)">{leader?.name ?? '?'}</span> đang chọn {teamSize} người đi Quest.
        </PanelLine>
        {count}
        {needsTwo && <TwoFailNote />}
      </GlassPanel>
    );
  }

  const full = team.length === teamSize;
  return (
    <div className="space-y-3">
      <GlassPanel tone="accent" className="p-4">
        <PanelHead title={`Chọn ${teamSize} người`} clock={clock} />
        <PanelLine>Chạm vào ghế trên bàn để thêm hoặc bỏ — có thể chọn chính bạn.</PanelLine>
        {count}
        {needsTwo && <TwoFailNote />}
      </GlassPanel>

      <ActionDock>
        <AvButton variant="primary" size="lg" block icon="check" onClick={onSubmitTeam} disabled={!full}>
          {full ? 'Trình đội' : `Trình đội · ${team.length}/${teamSize}`}
        </AvButton>
      </ActionDock>
    </div>
  );
}
