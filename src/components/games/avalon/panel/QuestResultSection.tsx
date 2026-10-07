import type { AvalonGameState } from '../types';
import AvIcon from '../assets/AvIcon';
import GlassPanel from '../ui/GlassPanel';

// Public result — the same on every screen, so the team colours are fine here.
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
      <GlassPanel tone={success ? 'good' : 'evil'} emphasis className="p-6 text-center">
        <p className="text-[11px] uppercase font-bold text-slate-300 mb-1 tracking-widest">
          Kết quả Quest {state.currentQuest + 1}
        </p>
        <AvIcon
          name={success ? 'quest-success' : 'quest-fail'}
          size={60}
          className={`mb-2 ${success ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'}`}
        />
        <p
          className={`av-display text-4xl ${success ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'
            }`}
        >
          {success ? 'Quest thành công' : 'Quest thất bại'}
        </p>
      </GlassPanel>

      <GlassPanel className="p-5">
        <p className="text-[11px] uppercase font-bold text-slate-400 mb-3 text-center">
          Tổng lựa chọn
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border-2 border-(--av-good)/35 bg-(--av-good)/10 p-4 text-center">
            <AvIcon name="quest-success" size={30} className="mb-1 text-(--av-good-light)" />
            <p className="text-[10px] uppercase font-bold text-(--av-good-light) mb-0.5">Lá Phe Người</p>
            <p className="text-3xl font-black text-white">{goodCount}</p>
          </div>
          <div className="rounded-xl border-2 border-(--av-evil)/35 bg-(--av-evil)/10 p-4 text-center">
            <AvIcon name="quest-fail" size={30} className="mb-1 text-(--av-evil-light)" />
            <p className="text-[10px] uppercase font-bold text-(--av-evil-light) mb-0.5">Lá Phe Quỷ</p>
            <p className="text-3xl font-black text-white">{evilCount}</p>
          </div>
        </div>
        {playerCount >= 7 && state.currentQuest === 3 && (
          <p className="mt-3 text-[11px] text-slate-300 text-center">
            <AvIcon name="warning" /> Quest này cần ≥2 lá Phe Quỷ để Thất bại Quest
          </p>
        )}
      </GlassPanel>
    </div>
  );
}
