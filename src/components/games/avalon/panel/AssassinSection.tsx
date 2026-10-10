import type { Player } from '@/types/player';
import { AvalonRole, type AvalonGameData, type AvalonGameState } from '../types';
import { ROLE_NAMES_VI } from '../constants';
import { formatClock, usePhaseClock } from '../hooks/usePhaseClock';
import { useConfirm } from '../hooks/useConfirm';
import { LowTimeClock, PanelHead, PanelLine, PanelNote } from './shared';
import ActionDock from '../ui/ActionDock';
import AvButton from '../ui/AvButton';
import GlassPanel from '../ui/GlassPanel';

// assassinate ("one sentence, one action", ux-plan 8b): ONE panel — the
// title, the clock, one line for the viewer's side, who the Assassin is
// aiming at — and the Assassin's button in the dock. The revealed Evil team
// is a badge on their seats (RoundTable); the Assassin aims on the table.
// Everybody's team is public by now, so the line may differ by team.
export function AssassinSection({
  state,
  myPlayer,
  myRole,
  gamePlayers,
  onAssassinate,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  myRole: AvalonRole | undefined;
  gamePlayers: Player[];
  onAssassinate: (id: string, callerId?: string) => void;
}) {
  const isAssassin = myRole === AvalonRole.Assassin;
  const myTeam = (myPlayer.gameData as Partial<AvalonGameData>).team;
  const evilPlayers = gamePlayers.filter((p) => (p.gameData as Partial<AvalonGameData>).team === 'evil');
  const pickedId = state.assassinChoiceId ?? null;
  const picked = pickedId ? gamePlayers.find((p) => p.id === pickedId) : null;

  const { remaining } = usePhaseClock(state);
  const { ask, dialog: confirmDialog } = useConfirm();
  // Rounded UP to whole seconds before formatting as m:ss (unlike formatClock
  // alone, which rounds down), so the label hits 0:00 only when time is up.
  const timeLabel = formatClock(Math.ceil(remaining / 1000) * 1000);
  const lowTime = remaining <= 30_000;
  const pickedName = <span className="font-semibold text-(--av-text)">{picked?.name}</span>;

  const line = isAssassin ? (
    picked ? (
      <>Đang ngắm {pickedName} — chạm ghế khác để đổi, chốt thì bấm đâm.</>
    ) : (
      'Hội ý với Phe Quỷ rồi chạm vào người bạn nghĩ là Merlin.'
    )
  ) : myTeam === 'evil' ? (
    'Hội ý cùng Phe Quỷ — Sát Thủ là người quyết định.'
  ) : (
    'Phe Người giữ im lặng, đừng để lộ Merlin.'
  );

  return (
    <div className="space-y-3">
      <GlassPanel tone={isAssassin ? 'accent' : 'neutral'} className="p-4">
        {/* The target's heartbeat on the table is the one thing that beats:
            the clock only turns red. */}
        <PanelHead
          title="Sát Thủ tìm Merlin"
          clock={
            <LowTimeClock low={lowTime} throb={false} className="text-sm">
              {timeLabel}
            </LowTimeClock>
          }
        />
        <PanelLine>{line}</PanelLine>
        {!isAssassin && (
          <PanelNote data-assassin-aim={pickedId ?? ''}>
            {picked ? <>Sát Thủ đang ngắm {pickedName}</> : 'Sát Thủ chưa chọn ai'}
          </PanelNote>
        )}
        {/* The badges on the seats say it to the eye; this says it to a screen reader. */}
        <p className="sr-only">
          Phe Quỷ lộ diện:{' '}
          {evilPlayers
            .map((p) => {
              const role = (p.gameData as Partial<AvalonGameData>).role;
              return `${p.name}${role ? ` (${ROLE_NAMES_VI[role]})` : ''}`;
            })
            .join(', ')}
          .
        </p>
      </GlassPanel>

      {isAssassin && (
        <ActionDock>
          <AvButton
            variant="primary"
            size="lg"
            block
            icon="assassinate"
            disabled={!pickedId}
            onClick={async () => {
              if (!pickedId) return;
              const p = gamePlayers.find((pp) => pp.id === pickedId);
              if (!p) return;
              if (
                await ask({
                  title: `Đâm ${p.name}?`,
                  message: `Bạn chốt ${p.name} là Merlin. Không thể đổi sau khi xác nhận.`,
                  confirmLabel: 'Đâm',
                  tone: 'evil',
                  icon: 'assassinate',
                })
              ) {
                onAssassinate(pickedId, myPlayer.id);
              }
            }}
          >
            {picked ? `Xác nhận đâm ${picked.name}` : 'Chọn 1 người trên bàn'}
          </AvButton>
        </ActionDock>
      )}
      {confirmDialog}
    </div>
  );
}
