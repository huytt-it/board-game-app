import { useState } from 'react';
import type { Player } from '@/types/player';
import type { AvalonGameState } from '../types';
import { TEAM_NAME_VI } from '../constants';
import { TEAM_ICON_NAME } from '../presentation';
import { formatSecs, usePhaseClock } from '../hooks/usePhaseClock';
import { LowTimeClock, PanelHead, PanelLine } from './shared';
import AvIcon from '../assets/AvIcon';
import ActionDock from '../ui/ActionDock';
import AvButton from '../ui/AvButton';
import GlassPanel from '../ui/GlassPanel';

// The inspected team, shown ONLY to the Lady. The card around it stays neutral
// (ux-plan 2.9): only the words and a mid-size icon carry the team colour.
function InspectedTeam({ team }: { team: 'good' | 'evil' }) {
  const color = team === 'good' ? 'text-(--av-good-light)' : 'text-(--av-evil-light)';
  return (
    <div className="my-3 flex flex-col items-center gap-1">
      <AvIcon name={TEAM_ICON_NAME[team]} size={40} className={color} />
      <p className={`av-display text-2xl ${color}`}>{TEAM_NAME_VI[team]}</p>
    </div>
  );
}

// The Lady's result card, turned over from its face-down back. It is on the
// Lady's screen only (nobody else is ever shown the team), so the flip is a
// local, decorative transition: it plays when the result ARRIVES while the
// screen is open, and a reload shows the card face up straight away (ux-plan
// 2.2). Face up is the static style; the keyframes only describe the turn.
function LadyResultCard({ target, team, live }: { target: Player; team: 'good' | 'evil'; live: boolean }) {
  return (
    <div style={{ perspective: '800px' }} data-lady-result={team} data-lady-flip={live ? 'live' : 'static'}>
      <div className={`relative [transform-style:preserve-3d] ${live ? 'av-lady-flip' : ''}`}>
        <GlassPanel className="av-flip-face p-5 text-center">
          <p className="text-sm text-(--av-text-2)">
            <span className="font-semibold text-(--av-text)">{target.name}</span> thuộc
          </p>
          <InspectedTeam team={team} />
          <p className="text-xs text-(--av-text-3)">Nói thật hay nói dối với cả bàn là tuỳ bạn.</p>
        </GlassPanel>
        {/* The back: one design for every result. */}
        <div
          className="av-flip-back flex items-center justify-center rounded-2xl border border-(--av-line) bg-(--av-ink)"
          aria-hidden
        >
          <AvIcon name="lady" size={56} className="text-(--av-lady)" />
        </div>
      </div>
    </div>
  );
}

// lady-of-lake ("one sentence, one action", ux-plan 8b). The holder picks on
// the table — a tap on a seat aims (PlayerPanel handleLadyTablePick → the
// existing onLadyInspect, which also resets the clock) — and confirms in the
// dock; everyone else reads one line. The aim is the Lady's token flying to
// that seat. The target and the bystanders get the same neutral words
// whatever the result: only the holder ever sees a team.
export function LadySection({
  state,
  myPlayer,
  gamePlayers,
  onLadyConfirm,
  onLadyFinish,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  gamePlayers: Player[];
  onLadyConfirm: () => void;
  onLadyFinish: () => void;
}) {
  const isHolder = state.ladyHolderId === myPlayer.id;
  const isTarget = state.ladyTargetId === myPlayer.id;
  const holder = gamePlayers.find((p) => p.id === state.ladyHolderId);
  const target = state.ladyTargetId ? gamePlayers.find((p) => p.id === state.ladyTargetId) : null;
  const shown = state.ladyShownCard;
  const inspected = shown !== null;

  // Did this screen open before the result came in? Then the card turns over
  // when it does; if the result is already there (a reload) it just shows.
  const [liveReveal] = useState(() => !inspected);

  // Đếm ngược — hiển thị cho cả Lady, target và bystander. The holder's dock
  // is already blinking: their clock only turns red.
  const { remaining } = usePhaseClock(state);
  const clock = inspected ? undefined : (
    <LowTimeClock low={remaining < 10_000} throb={!isHolder}>
      {formatSecs(remaining)}
    </LowTimeClock>
  );

  // What the screen reader hears when the Lady looks: the holder hears the
  // team, nobody else ever does (the same words for the target and the rest).
  const announce =
    !inspected || !target
      ? ''
      : isHolder
        ? `${target.name} thuộc ${TEAM_NAME_VI[shown === 'good' ? 'good' : 'evil']}.`
        : `${holder?.name ?? 'Lady'} đã soi ${isTarget ? 'bạn' : target.name}.`;
  const live = (
    <p className="sr-only" role="status" aria-live="polite" data-lady-announce="">
      {announce}
    </p>
  );
  const name = (p: Player | null | undefined, fallback = '?') => (
    <span className="font-semibold text-(--av-text)">{p?.name ?? fallback}</span>
  );

  if (isHolder && target && inspected) {
    return (
      <div className="space-y-3">
        {live}
        <LadyResultCard target={target} team={shown === 'good' ? 'good' : 'evil'} live={liveReveal} />
        <ActionDock>
          <AvButton variant="primary" size="lg" block icon="lady" onClick={onLadyFinish}>
            Hoàn tất — chuyển Lady cho {target.name}
          </AvButton>
        </ActionDock>
      </div>
    );
  }

  if (isHolder) {
    // Aim on the table; aiming at someone else moves the token and resets
    // the clock (useAvalon.ladyInspect).
    return (
      <div className="space-y-3">
        {live}
        <GlassPanel tone="accent" className="p-4">
          <PanelHead title="Soi một người" clock={clock} />
          <PanelLine>
            {target ? (
              <>Đang ngắm {name(target)} — chạm ghế khác để đổi.</>
            ) : (
              'Chạm vào một ghế trên bàn. Người từng cầm Lady không soi được.'
            )}
          </PanelLine>
        </GlassPanel>
        <ActionDock>
          <AvButton variant="primary" size="lg" block icon="eye" onClick={onLadyConfirm} disabled={!target}>
            {target ? `Xác nhận soi ${target.name}` : 'Chọn 1 người trên bàn'}
          </AvButton>
        </ActionDock>
      </div>
    );
  }

  // The target and the bystanders: one line, the same whatever the result.
  const title = inspected ? 'Đã soi' : 'Lady of the Lake';
  const line = isTarget ? (
    inspected ? (
      <>{name(holder, 'Lady')} đã thấy phe thật của bạn — chờ chuyển Lady.</>
    ) : (
      <>{name(holder, 'Lady')} đang ngắm bạn — chờ xác nhận soi.</>
    )
  ) : !target ? (
    <>{name(holder, 'Lady')} đang chọn người để soi.</>
  ) : inspected ? (
    <>
      {name(holder, 'Lady')} đã soi {name(target)} — chờ chuyển Lady.
    </>
  ) : (
    <>
      {name(holder, 'Lady')} đang ngắm {name(target)}.
    </>
  );
  return (
    <GlassPanel className="p-4">
      {live}
      <PanelHead title={title} clock={clock} />
      <PanelLine>{line}</PanelLine>
    </GlassPanel>
  );
}
