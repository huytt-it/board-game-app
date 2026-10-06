import { useEffect, useState } from 'react';
import type { Player } from '@/types/player';
import type { AvalonGameData, AvalonGameState, QuestCard } from '../types';
import { PlayerRoster } from './PlayerRoster';
import AvIcon from '../assets/AvIcon';

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

  if (!onTeam) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5 text-center">
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
          <p className="text-xs text-slate-400">
            Bạn không trong đội — chờ kết quả...
          </p>
          <AvIcon name="waiting" size={30} className="mt-3 animate-pulse text-slate-300" />
        </div>

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

  if (myCard) {
    return (
      <div
        className={`rounded-2xl border p-5 text-center ${myCard === 'success'
          ? 'border-blue-500/40 bg-blue-500/10'
          : 'border-red-500/40 bg-red-500/10'
          }`}
      >
        <p className="text-xs uppercase font-bold text-slate-400 mb-1">Lá bài bạn đã đặt</p>
        <AvIcon
          name={myCard === 'success' ? 'quest-success' : 'quest-fail'}
          size={48}
          className={`mb-1 ${myCard === 'success' ? 'text-blue-200' : 'text-red-200'}`}
        />
        <p
          className={`text-3xl font-black ${myCard === 'success' ? 'text-blue-300' : 'text-red-300'
            }`}
        >
          {myCard === 'success' ? 'PHE NGƯỜI' : 'PHE QUỶ'}
        </p>
        <p className="mt-3 text-xs text-slate-400">Chờ các thành viên còn lại đặt bài...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4">
        <p className="text-[11px] uppercase font-black text-purple-300 mb-1"><AvIcon name="card-play" /> Bạn ở trong đội</p>
        <p className="text-sm text-slate-300">
          Chọn 1 lá bài để đặt vào Quest {state.currentQuest + 1}.
        </p>
        {myTeam === 'good' && (
          <p className="mt-2 text-xs text-blue-300/80">
            <AvIcon name="warning" /> Phe Người BẮT BUỘC phải đặt lá Phe Người.
          </p>
        )}
        {myTeam === 'evil' && (
          <p className="mt-2 text-xs text-red-300/80">
            <AvIcon name="team-evil" /> Phe Quỷ có thể đặt lá Phe Người hoặc Phe Quỷ tuỳ chiến thuật.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setPendingCard('success')}
          className={`flex flex-col items-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 py-6 font-black text-white text-base hover:from-blue-500 hover:to-cyan-500 active:scale-95 shadow-lg shadow-blue-500/30 ${pendingCard === 'success' ? 'ring-4 ring-blue-300' : ''
            }`}
        >
          <AvIcon name="quest-success" size={40} className="mb-1" />
          PHE NGƯỜI
        </button>
        <button
          onClick={() => {
            if (myTeam === 'good') {
              alert('Phe Người không được đặt lá Phe Quỷ — bắt buộc phải đặt lá Phe Người.');
              return;
            }
            setPendingCard('fail');
          }}
          disabled={myTeam === 'good'}
          className={`flex flex-col items-center rounded-2xl bg-gradient-to-br from-red-600 to-rose-600 py-6 font-black text-white text-base hover:from-red-500 hover:to-rose-500 active:scale-95 shadow-lg shadow-red-500/30 disabled:opacity-30 disabled:cursor-not-allowed ${pendingCard === 'fail' ? 'ring-4 ring-red-300' : ''
            }`}
        >
          <AvIcon name="quest-fail" size={40} className="mb-1" />
          PHE QUỶ
        </button>
      </div>

      <button
        onClick={() => {
          if (!pendingCard) return;
          onPlayQuestCard(pendingCard);
        }}
        disabled={!pendingCard}
        className={`w-full rounded-2xl py-4 font-black text-white text-base active:scale-95 shadow-lg disabled:opacity-30 disabled:cursor-not-allowed ${pendingCard === 'fail'
          ? 'bg-gradient-to-br from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-500/30'
          : 'bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-500/30'
          }`}
      >
        {pendingCard ? (
          <>
            Xác nhận đặt lá{' '}
            <AvIcon name={pendingCard === 'success' ? 'quest-success' : 'quest-fail'} />{' '}
            {pendingCard === 'success' ? 'PHE NGƯỜI' : 'PHE QUỶ'}
          </>
        ) : (
          'Chọn 1 lá bài ở trên'
        )}
      </button>
    </div>
  );
}
