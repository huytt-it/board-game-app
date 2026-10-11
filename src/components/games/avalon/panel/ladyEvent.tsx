import type { Player } from '@/types/player';
import type { AvalonGameState, LadyEvent, LadyTimeoutMode } from '../types';

// How the Lady's last turn ended (state.ladyLastEvent, GĐ8), in words. Public
// information — the same sentence on every screen, and never a team: the team
// seen is only on the holder's screen (LadySection).

/** The event of the Lady turn that just ended, for the discussion right after
 *  it (currentQuest already points at the next quest by then). */
export function recentLadyEvent(state: AvalonGameState): LadyEvent | null {
  const e = state.ladyLastEvent;
  return e && e.quest === state.currentQuest - 1 ? e : null;
}

/** The game's own look this turn ('random' timeout, or the host's "Soi ngẫu
 *  nhiên"), while still in the Lady's phase. */
export function ladyLookedForHer(state: AvalonGameState): boolean {
  const e = recentLadyEvent(state);
  return !!e && e.how === 'random' && e.targetId === state.ladyTargetId && state.ladyShownCard !== null;
}

export function LadyEventText({ event, players }: { event: LadyEvent; players: Player[] }) {
  const name = (id: string | null) => (
    <strong className="font-semibold text-(--av-text)">{players.find((p) => p.id === id)?.name ?? '?'}</strong>
  );
  if (event.how === 'inspected') {
    return (
      <>
        {name(event.holderId)} đã soi {name(event.targetId)}.
      </>
    );
  }
  if (event.how === 'random') {
    return (
      <>
        {name(event.holderId)} hết giờ — tự soi ngẫu nhiên {name(event.targetId)}.
      </>
    );
  }
  return (
    <>
      {name(event.holderId)} hết giờ, bỏ lượt — Lady chuyển cho {name(event.newHolderId)}.
    </>
  );
}

/** The holder's warning before her time is up: what the room's setting does then. */
export const LADY_TIMEOUT_HINT: Record<LadyTimeoutMode, string> = {
  skip: 'Hết giờ mà chưa soi: Lady chuyển ngẫu nhiên.',
  random: 'Hết giờ mà chưa soi: hệ thống tự soi ngẫu nhiên.',
  wait: 'Hết giờ mà chưa soi: ván sẽ dừng chờ bạn.',
};
