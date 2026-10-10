import { useEffect, useState } from 'react';
import type { Player } from '@/types/player';
import type { AvalonGameData, AvalonGameState, QuestCard } from '../types';
import { questNeedsTwoFails } from '../constants';
import { playedIds } from '../table/CardPile';
import { PanelHead, PanelLine, PanelNote, TwoFailNote } from './shared';
import ActionDock from '../ui/ActionDock';
import AvButton from '../ui/AvButton';
import GlassPanel from '../ui/GlassPanel';

// quest-play ("one sentence, one action", ux-plan 8b). A member of the team
// picks one of two identical neutral cards in the dock and confirms; everyone
// else reads one line. Who is on the team is the ring on the seats, the cards
// played are the pile on the table.
//
// Privacy (ux-plan 2.4): the screen looks the same whatever the viewer's team
// and whatever card they pick or played — the two cards are the same neutral
// `choice`, no button is dimmed for Good players, and once played the panel
// says only "Đã đặt lá".
export function QuestPlaySection({
  state,
  myPlayer,
  myTeam,
  onTeam,
  gamePlayers,
  onPlayQuestCard,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  myTeam: 'good' | 'evil' | undefined;
  onTeam: boolean;
  gamePlayers: Player[];
  onPlayQuestCard: (c: QuestCard) => void;
}) {
  const myCard = (myPlayer.gameData as Partial<AvalonGameData>).questCard;
  const teamSize = state.proposedTeam.length;
  const needsTwo = questNeedsTwoFails(gamePlayers.length, state.currentQuest);
  const [pendingCard, setPendingCard] = useState<QuestCard | null>(null);

  useEffect(() => {
    if (myCard) setPendingCard(null);
  }, [myCard]);

  // A small, short-lived note (e.g. a Good player tapping the Evil card).
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  const showToast = (text: string) => setToast((prev) => ({ text, id: (prev?.id ?? 0) + 1 }));
  const played = playedIds(state, gamePlayers).length;
  // "x/y lá đã đặt": how many members' cards are in — a count, never whose or which.
  const count = (
    <PanelNote data-played-count={`${played}/${teamSize}`}>
      <span className="tabular-nums">
        {played}/{teamSize}
      </span>{' '}
      lá đã đặt
    </PanelNote>
  );

  if (!onTeam) {
    return (
      <GlassPanel className="p-4">
        <PanelHead title="Đội làm nhiệm vụ" />
        <PanelLine>Bạn không trong đội — chờ đội đặt lá.</PanelLine>
        {count}
        {needsTwo && <TwoFailNote />}
      </GlassPanel>
    );
  }

  if (myCard) {
    return (
      <GlassPanel className="p-4">
        <PanelHead title="Đã đặt lá" />
        <PanelLine>Lá của bạn đã úp vào chồng bài giữa bàn.</PanelLine>
        {count}
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-3">
      <GlassPanel tone="accent" className="p-4">
        <PanelHead title="Chọn lá bài" />
        {/* The same rule text for everyone on the team, so it reveals nothing. */}
        <PanelLine>Phe Người luôn đặt lá Phe Người; Phe Quỷ chọn lá nào cũng được.</PanelLine>
        {count}
        {needsTwo && <TwoFailNote />}
      </GlassPanel>

      <ActionDock>
        <div className="grid grid-cols-2 gap-3">
          <AvButton
            variant="choice"
            size="lg"
            icon="quest-success"
            selected={pendingCard === 'success'}
            onClick={() => setPendingCard('success')}
          >
            Phe Người
          </AvButton>
          <AvButton
            variant="choice"
            size="lg"
            icon="quest-fail"
            selected={pendingCard === 'fail'}
            onClick={() => {
              if (myTeam === 'good') {
                showToast('Phe Người không được đặt lá Phe Quỷ — hãy chọn lá Phe Người.');
                return;
              }
              setPendingCard('fail');
            }}
          >
            Phe Quỷ
          </AvButton>
        </div>
        <AvButton
          variant="primary"
          size="lg"
          block
          className="mt-3"
          disabled={!pendingCard}
          onClick={() => {
            if (!pendingCard) return;
            onPlayQuestCard(pendingCard);
          }}
        >
          {pendingCard ? 'Xác nhận đặt lá' : 'Chọn 1 lá ở trên'}
        </AvButton>

        {toast && (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute inset-x-0 bottom-full mb-3 flex justify-center"
          >
            <p className="max-w-xs rounded-xl border border-(--av-line) bg-(color:--av-bar-bg) px-4 py-2 text-center text-xs font-semibold text-(--av-text) shadow-lg shadow-black/50 animate-fade-in">
              {toast.text}
            </p>
          </div>
        )}
      </ActionDock>
    </div>
  );
}
