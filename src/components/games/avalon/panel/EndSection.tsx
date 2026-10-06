import type { Player } from '@/types/player';
import { AvalonRole, type AvalonGameData, type AvalonGameState } from '../types';
import { ROLE_ICONS, ROLE_NAMES_VI, TEAM_NAME_VI } from '../constants';
import { AssassinRevealOverlay } from './AssassinRevealOverlay';

export function EndSection({
  state,
  myRole,
  gamePlayers,
  onPlayAgain,
  onLeaveRoom,
  isHost,
}: {
  state: AvalonGameState;
  myRole: AvalonRole | undefined;
  gamePlayers: Player[];
  onPlayAgain?: () => void;
  onLeaveRoom?: () => void;
  isHost?: boolean;
}) {
  const isGood = state.winner === 'good';
  const merlinTarget = state.merlinTargetId
    ? gamePlayers.find((p) => p.id === state.merlinTargetId)
    : null;
  const merlinTargetRole = merlinTarget
    ? (merlinTarget.gameData as Partial<AvalonGameData>).role
    : null;
  const failures = state.quests.filter((q) => q.result === 'fail').length;
  const successes = state.quests.filter((q) => q.result === 'success').length;
  const fiveRejections = state.voteRejectStreak >= 5;

  return (
    <div className="space-y-4">
      {merlinTarget && (
        <AssassinRevealOverlay
          target={merlinTarget}
          targetRole={merlinTargetRole ?? null}
          startedAt={state.phaseStartedAt}
        />
      )}
      <div
        className={`rounded-2xl border p-6 text-center relative overflow-hidden ${isGood
          ? 'border-blue-500/40 bg-blue-500/10'
          : 'border-red-500/40 bg-red-500/10'
          }`}
      >
        <div className="text-6xl mb-3">{isGood ? '🛡️' : '🗡️'}</div>
        <h2 className="text-3xl font-black text-white mb-1">
          {isGood ? 'Phe Người thắng!' : 'Phe Quỷ thắng!'}
        </h2>
        <p className={`text-sm ${isGood ? 'text-blue-300' : 'text-red-300'}`}>
          {fiveRejections
            ? '5 lần liên tiếp đội bị từ chối — Phe Quỷ chiến thắng.'
            : merlinTarget
              ? merlinTargetRole === AvalonRole.Merlin
                ? `Sát Thủ đã đoán trúng Merlin (${merlinTarget.name}).`
                : `Sát Thủ đoán sai — ${merlinTarget.name} không phải Merlin.`
              : `${successes} Quest thành công · ${failures} Quest thất bại`}
        </p>
        {myRole && (
          <p className="mt-3 text-xs text-slate-400">
            Vai của bạn: <span className="font-bold text-white">{ROLE_ICONS[myRole]} {myRole}</span>
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-sm font-black text-white">📜 Lộ tất cả vai trò</h3>
        </div>
        <div className="divide-y divide-white/5">
          {gamePlayers.map((p) => {
            const data = p.gameData as Partial<AvalonGameData>;
            const role = data.role;
            const team = data.team;
            const isPlayerGood = team === 'good';
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-2xl shrink-0">{role ? ROLE_ICONS[role] : '🎭'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white">{p.name}</p>
                  {role && (
                    <p
                      className={`text-xs font-bold ${isPlayerGood ? 'text-blue-300' : 'text-red-300'
                        }`}
                    >
                      {role} · {ROLE_NAMES_VI[role]}
                    </p>
                  )}
                </div>
                {team && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase font-black ${isPlayerGood
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-red-500/20 text-red-300'
                      }`}
                  >
                    {TEAM_NAME_VI[team]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {(onPlayAgain || onLeaveRoom) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {onPlayAgain && (
            <button
              onClick={onPlayAgain}
              disabled={isHost === false}
              className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-sm font-black text-white hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] shadow-lg shadow-emerald-500/30 disabled:from-slate-700 disabled:to-slate-700 disabled:shadow-none disabled:opacity-60 disabled:cursor-not-allowed"
              title={isHost === false ? 'Chỉ chủ phòng mới có thể bắt đầu ván mới' : undefined}
            >
              🔄 Chơi tiếp ván mới
              {isHost === false && (
                <span className="block text-[10px] font-bold opacity-80 mt-0.5">
                  (chờ chủ phòng)
                </span>
              )}
            </button>
          )}
          {onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              className="rounded-2xl border border-white/15 bg-white/5 py-3.5 text-sm font-black text-slate-200 hover:bg-white/10 active:scale-[0.98]"
            >
              🚪 Thoát phòng
            </button>
          )}
        </div>
      )}
    </div>
  );
}
