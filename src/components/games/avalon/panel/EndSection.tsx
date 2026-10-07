import type { Player } from '@/types/player';
import { AvalonRole, type AvalonGameData, type AvalonGameState } from '../types';
import { ROLE_NAMES_VI, TEAM_NAME_VI } from '../constants';
import { AssassinRevealOverlay } from './AssassinRevealOverlay';
import AvIcon from '../assets/AvIcon';
import GlassPanel from '../ui/GlassPanel';
import RoleEmblem from '../ui/RoleEmblem';

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
      {/* The winner is public: every screen shows the same card. */}
      <GlassPanel tone={isGood ? 'good' : 'evil'} emphasis className="p-6 text-center relative overflow-hidden">
        <AvIcon
          name={isGood ? 'team-good' : 'team-evil'}
          size={64}
          className={`mb-3 ${isGood ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'}`}
        />
        <h2 className="av-display text-4xl text-white mb-1">
          {isGood ? 'Phe Người thắng!' : 'Phe Quỷ thắng!'}
        </h2>
        <p className={`text-sm ${isGood ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'}`}>
          {fiveRejections
            ? '5 lần liên tiếp đội bị từ chối — Phe Quỷ chiến thắng.'
            : merlinTarget
              ? merlinTargetRole === AvalonRole.Merlin
                ? `Sát Thủ đã đoán trúng Merlin (${merlinTarget.name}).`
                : `Sát Thủ đoán sai — ${merlinTarget.name} không phải Merlin.`
              : `${successes} Quest thành công · ${failures} Quest thất bại`}
        </p>
        {myRole && (
          <p className="mt-3 text-xs text-slate-300">
            Vai của bạn:{' '}
            <span className="inline-flex items-center gap-1 align-middle font-bold text-white">
              <RoleEmblem role={myRole} size="xs" /> {myRole}
            </span>
          </p>
        )}
      </GlassPanel>

      <GlassPanel className="overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="av-display text-xl text-white"><AvIcon name="roles" /> Lộ tất cả vai trò</h3>
        </div>
        <div className="divide-y divide-white/5">
          {gamePlayers.map((p) => {
            const data = p.gameData as Partial<AvalonGameData>;
            const role = data.role;
            const team = data.team;
            const isPlayerGood = team === 'good';
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                {role ? (
                  <RoleEmblem role={role} size="sm" />
                ) : (
                  <AvIcon name="roles" size={30} className="text-slate-500" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white">{p.name}</p>
                  {role && (
                    <p
                      className={`text-xs font-bold ${isPlayerGood ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'
                        }`}
                    >
                      {role} · {ROLE_NAMES_VI[role]}
                    </p>
                  )}
                </div>
                {team && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase font-black ${isPlayerGood
                      ? 'bg-(--av-good)/20 text-(--av-good-light)'
                      : 'bg-(--av-evil)/20 text-(--av-evil-light)'
                      }`}
                  >
                    {TEAM_NAME_VI[team]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </GlassPanel>

      {(onPlayAgain || onLeaveRoom) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {onPlayAgain && (
            <button
              onClick={onPlayAgain}
              disabled={isHost === false}
              className="rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-700 py-3.5 text-sm font-black text-white hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] shadow-lg shadow-emerald-500/30 disabled:from-slate-700 disabled:to-slate-700 disabled:shadow-none disabled:opacity-60 disabled:cursor-not-allowed"
              title={isHost === false ? 'Chỉ chủ phòng mới có thể bắt đầu ván mới' : undefined}
            >
              <AvIcon name="new-game" /> Chơi tiếp ván mới
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
              className="rounded-2xl border border-white/15 bg-(color:--av-glass-bg) py-3.5 text-sm font-black text-slate-200 hover:bg-white/10 active:scale-[0.98]"
            >
              <AvIcon name="leave" /> Thoát phòng
            </button>
          )}
        </div>
      )}
    </div>
  );
}
