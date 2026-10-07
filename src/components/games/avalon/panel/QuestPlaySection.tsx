import { useEffect, useState } from 'react';
import type { Player } from '@/types/player';
import type { AvalonGameData, AvalonGameState, QuestCard } from '../types';
import { PlayerRoster } from './PlayerRoster';
import AvIcon from '../assets/AvIcon';
import GlassPanel from '../ui/GlassPanel';

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
  const team = state.proposedTeam.map((id) => gamePlayers.find((p) => p.id === id)).filter(Boolean) as Player[];
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

  if (!onTeam) {
    return (
      <div className="space-y-3">
        <GlassPanel tone="mystic" className="p-5 text-center">
          <p className="text-[11px] uppercase font-bold text-purple-300 mb-2"><AvIcon name="team" /> Đội đang chơi Quest</p>
          <div className="flex flex-wrap gap-2 justify-center mb-3">
            {team.map((p) => (
              <span
                key={p.id}
                className="rounded-full bg-amber-500/20 px-3 py-1.5 text-sm font-bold text-amber-200"
              >
                {p.name}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-300">
            Bạn không trong đội — chờ kết quả...
          </p>
          <AvIcon name="waiting" size={30} className="mt-3 animate-pulse text-slate-300" />
        </GlassPanel>

        <div className="lg:hidden">
          <PlayerRoster
            gamePlayers={gamePlayers}
            state={state}
            myPlayerId={myPlayer.id}
            highlightedIds={state.proposedTeam}
            title="Tất cả người chơi (highlight = đang đi Quest)"
            emphasis="team"
            viewerRole={(myPlayer.gameData as Partial<AvalonGameData>).role}
          />
        </div>
      </div>
    );
  }

  // Privacy (ux-plan 2.9): from here on the screen must look the same whatever
  // the viewer's team and whatever card they pick or played — no team colour
  // on the card placed, no dimmed Evil button for Good players, a confirm
  // button that keeps its colour. Only icon-sized details differ.
  if (myCard) {
    return (
      <GlassPanel tone="gold" className="p-5 text-center">
        <p className="text-xs uppercase font-bold text-slate-300 mb-2">Quest {state.currentQuest + 1}</p>
        <AvIcon name="card-play" size={40} className="mb-1 text-(--av-parchment)" />
        <p className="av-display text-3xl text-white">Đã đặt lá</p>
        <p className="mt-3 text-xs text-slate-300">Chờ các thành viên còn lại đặt bài...</p>
      </GlassPanel>
    );
  }

  const cardBtn = 'flex flex-col items-center rounded-2xl border-2 py-6 font-black text-base text-white active:scale-95 transition';
  const pickedRing = 'ring-4 ring-(--av-gold) ring-offset-2 ring-offset-black/60';

  return (
    <div className="space-y-3">
      <GlassPanel tone="mystic" className="p-4">
        <p className="text-[11px] uppercase font-black text-purple-300 mb-1"><AvIcon name="card-play" /> Bạn ở trong đội</p>
        <p className="text-sm text-slate-200">
          Chọn 1 lá bài để đặt vào Quest {state.currentQuest + 1}.
        </p>
        {/* Same rule text for everyone on the team, so it reveals nothing. */}
        <p className="mt-2 text-xs text-slate-300">
          <AvIcon name="warning" className="text-amber-300" /> Phe Người bắt buộc đặt lá Phe Người · Phe Quỷ được
          chọn lá tuỳ chiến thuật.
        </p>
      </GlassPanel>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setPendingCard('success')}
          className={`${cardBtn} border-(--av-good)/60 bg-(color:--av-glass-bg) bg-linear-to-b from-(--av-good)/40 to-(--av-good)/15 hover:from-(--av-good)/55 ${pendingCard === 'success' ? pickedRing : ''}`}
        >
          <AvIcon name="quest-success" size={40} className="mb-1 text-(--av-good-light)" />
          PHE NGƯỜI
        </button>
        <button
          onClick={() => {
            if (myTeam === 'good') {
              showToast('Phe Người không được đặt lá Phe Quỷ — hãy chọn lá Phe Người.');
              return;
            }
            setPendingCard('fail');
          }}
          className={`${cardBtn} border-(--av-evil)/60 bg-(color:--av-glass-bg) bg-linear-to-b from-(--av-evil)/40 to-(--av-evil)/15 hover:from-(--av-evil)/55 ${pendingCard === 'fail' ? pickedRing : ''}`}
        >
          <AvIcon name="quest-fail" size={40} className="mb-1 text-(--av-evil-light)" />
          PHE QUỶ
        </button>
      </div>

      <button
        onClick={() => {
          if (!pendingCard) return;
          onPlayQuestCard(pendingCard);
        }}
        disabled={!pendingCard}
        className="w-full rounded-2xl border border-(--av-gold)/60 bg-(color:--av-glass-bg) bg-linear-to-b from-(--av-gold)/40 to-(--av-gold)/20 py-4 font-black text-(--av-parchment) text-base hover:from-(--av-gold)/55 active:scale-95 disabled:cursor-not-allowed disabled:border-white/15 disabled:from-transparent disabled:to-transparent disabled:text-slate-400"
      >
        {pendingCard ? (
          <>
            Xác nhận đặt lá <AvIcon name={pendingCard === 'success' ? 'quest-success' : 'quest-fail'} />
          </>
        ) : (
          'Chọn 1 lá bài ở trên'
        )}
      </button>

      {toast && (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4 pointer-events-none"
        >
          <p className="max-w-xs rounded-xl border border-(--av-parchment)/25 bg-(color:--av-bar-bg) px-4 py-2 text-center text-xs font-bold text-(--av-parchment) shadow-lg shadow-black/50 animate-fade-in">
            {toast.text}
          </p>
        </div>
      )}
    </div>
  );
}
