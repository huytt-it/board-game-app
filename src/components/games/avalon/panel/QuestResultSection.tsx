import type { AvalonGameState } from '../types';
import AvIcon from '../assets/AvIcon';

export function QuestResultSection({
  state,
  playerCount,
}: {
  state: AvalonGameState;
  playerCount: number;
}) {
  const quest = state.quests[state.currentQuest];
  if (!quest) return null;
  const evilCount = quest.failCount;
  const goodCount = quest.teamSize - evilCount;
  const success = quest.result === 'success';

  return (
    <div className="space-y-3 animate-scale-in">
      <div
        className={`rounded-2xl border-2 p-6 text-center ${success
          ? 'border-blue-500/50 bg-blue-500/15 shadow-lg shadow-blue-500/20'
          : 'border-red-500/50 bg-red-500/15 shadow-lg shadow-red-500/20'
          }`}
      >
        <p className="text-[11px] uppercase font-bold text-slate-300 mb-1 tracking-widest">
          Kết quả Quest {state.currentQuest + 1}
        </p>
        <AvIcon
          name={success ? 'quest-success' : 'quest-fail'}
          size={60}
          className={`mb-2 ${success ? 'text-blue-100' : 'text-red-100'}`}
        />
        <p
          className={`av-display text-4xl ${success ? 'text-blue-200' : 'text-red-200'
            }`}
        >
          {success ? 'Quest thành công' : 'Quest thất bại'}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="text-[11px] uppercase font-bold text-slate-400 mb-3 text-center">
          Tổng lựa chọn
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border-2 border-blue-500/30 bg-blue-500/10 p-4 text-center">
            <AvIcon name="quest-success" size={30} className="mb-1 text-blue-200" />
            <p className="text-[10px] uppercase font-bold text-blue-300 mb-0.5">Lá Phe Người</p>
            <p className="text-3xl font-black text-blue-200">{goodCount}</p>
          </div>
          <div className="rounded-xl border-2 border-red-500/30 bg-red-500/10 p-4 text-center">
            <AvIcon name="quest-fail" size={30} className="mb-1 text-red-200" />
            <p className="text-[10px] uppercase font-bold text-red-300 mb-0.5">Lá Phe Quỷ</p>
            <p className="text-3xl font-black text-red-200">{evilCount}</p>
          </div>
        </div>
        {playerCount >= 7 && state.currentQuest === 3 && (
          <p className="mt-3 text-[11px] text-slate-400 text-center">
            <AvIcon name="warning" /> Quest này cần ≥2 lá Phe Quỷ để Thất bại Quest
          </p>
        )}
      </div>
    </div>
  );
}
