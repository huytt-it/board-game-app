import type { Player } from '@/types/player';
import { AvalonRole, PHASE_TIMEOUTS_MS, type AvalonGameData, type AvalonGameState } from '../types';
import { formatClock, usePhaseClock } from '../hooks/usePhaseClock';
import { RoleIntroCard } from './shared';
import AvIcon from '../assets/AvIcon';
import PlayerAvatar from '../ui/PlayerAvatar';

function getActiveNightPlayerIds(
  phase: AvalonGameState['phase'],
  players: Player[]
): string[] {
  if (phase === 'night-evils') {
    return players
      .filter((p) => (p.gameData as Partial<AvalonGameData>).team === 'evil')
      .map((p) => p.id);
  }
  if (phase === 'night-merlin') {
    return players
      .filter((p) => (p.gameData as Partial<AvalonGameData>).role === AvalonRole.Merlin)
      .map((p) => p.id);
  }
  if (phase === 'night-percival') {
    return players
      .filter((p) => (p.gameData as Partial<AvalonGameData>).role === AvalonRole.Percival)
      .map((p) => p.id);
  }
  return [];
}

function NightCountdown({
  state,
  phase,
  allActiveAcked,
  warnAt = 15000,
}: {
  state: AvalonGameState;
  phase: 'night-evils' | 'night-merlin' | 'night-percival';
  allActiveAcked: boolean;
  warnAt?: number;
}) {
  const { remaining } = usePhaseClock(state, PHASE_TIMEOUTS_MS[phase]);
  const timeStr = formatClock(remaining);

  return (
    <div
      className={`rounded-2xl border p-4 text-center ${allActiveAcked
        ? 'border-emerald-500/40 bg-emerald-500/10'
        : remaining < warnAt
          ? 'border-amber-500/40 bg-amber-500/10'
          : 'border-white/10 bg-white/5'
        }`}
    >
      <p className="text-[11px] uppercase font-bold text-slate-400 mb-1">
        {allActiveAcked ? 'Đang chuyển bước...' : 'Tự động qua bước sau'}
      </p>
      <p
        className={`text-2xl font-black ${allActiveAcked
          ? 'text-emerald-300'
          : remaining < warnAt
            ? 'text-amber-300'
            : 'text-white'
          }`}
      >
        {allActiveAcked ? <AvIcon name="check" title="Đã xong" /> : timeStr}
      </p>
    </div>
  );
}

export function NightEvilsSection({
  state,
  myPlayer,
  myRole,
  myTeam,
  gamePlayers,
  onAckRole,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  myRole: AvalonRole | undefined;
  myTeam: 'good' | 'evil' | undefined;
  gamePlayers: Player[];
  onAckRole: () => void;
}) {
  const activeIds = getActiveNightPlayerIds('night-evils', gamePlayers);
  const ackedIds = Object.keys(state.roleAcks ?? {});
  const activeAckedCount = activeIds.filter((id) => ackedIds.includes(id)).length;
  const allActiveAcked = activeIds.length > 0 && activeAckedCount >= activeIds.length;
  const myAcked = ackedIds.includes(myPlayer.id);

  const otherEvils = gamePlayers.filter((p) => {
    if (p.id === myPlayer.id) return false;
    const data = p.gameData as Partial<AvalonGameData>;
    return data.team === 'evil' && data.role !== AvalonRole.Oberon;
  });

  if (myTeam !== 'evil') {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-center">
          <p className="text-[11px] uppercase font-black text-red-300 mb-2">
            <AvIcon name="team-evil" /> Đêm — Phe Quỷ đang nhận biết nhau
          </p>
          <AvIcon name="night" size={48} className="mb-2 animate-pulse text-slate-200" />
          <p className="text-sm text-slate-300">
            Hãy nhắm mắt. Các tay sai của Mordred đang lộ diện với nhau (Oberon thì đơn độc).
          </p>
        </div>
        {myRole && (
          <RoleIntroCard role={myRole} variant="self" />
        )}
        <NightCountdown state={state} phase="night-evils" allActiveAcked={allActiveAcked} />
      </div>
    );
  }

  const isOberon = myRole === AvalonRole.Oberon;

  return (
    <div className="space-y-3">
      {myRole && <RoleIntroCard role={myRole} variant="self" />}
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
        <p className="text-[11px] uppercase font-black text-red-300 mb-1">
          <AvIcon name="team-evil" /> Đêm — Phe Quỷ lộ diện
        </p>
        {isOberon ? (
          <>
            <h3 className="av-display text-xl text-white mb-1">Bạn là Oberon — đơn độc</h3>
            <p className="text-xs text-slate-300 mb-3">
              Bạn không biết đồng đội Quỷ là ai. Đồng đội Quỷ cũng không biết bạn.
              Tự xoay xở phá Quest.
            </p>
            <div className="rounded-xl border border-red-500/20 bg-red-950/30 p-4 text-center">
              <AvIcon name="oberon" size={40} className="mb-1 text-red-200" />
              <p className="text-xs text-slate-400">Không có đồng đội nào hiện ra với bạn.</p>
            </div>
          </>
        ) : (
          <>
            <h3 className="av-display text-xl text-white mb-1">Đồng đội Phe Quỷ của bạn</h3>
            <p className="text-xs text-slate-300 mb-3">
              {otherEvils.length === 0
                ? 'Bạn là kẻ ác duy nhất hiện ra (Oberon nếu có sẽ ẩn).'
                : 'Chỉ thấy tên — không biết role cụ thể của nhau. Oberon (nếu có) sẽ KHÔNG hiện ra.'}
            </p>
            <div className="space-y-2">
              {otherEvils.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5"
                >
                  <PlayerAvatar player={p} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white truncate">{p.name}</p>
                    <p className="text-[11px] font-bold text-red-300">Phe Quỷ</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {!myAcked ? (
        <button
          onClick={onAckRole}
          className="w-full rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 py-4 text-base font-black text-white hover:from-red-500 hover:to-rose-500 active:scale-[0.98] shadow-lg shadow-red-500/30"
        >
          ✓ Đã xem — Tiếp theo
        </button>
      ) : (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-center">
          <p className="text-sm font-bold text-emerald-300">✓ Bạn đã sẵn sàng</p>
        </div>
      )}

      <NightCountdown state={state} phase="night-evils" allActiveAcked={allActiveAcked} />
    </div>
  );
}

export function NightMerlinSection({
  state,
  myPlayer,
  myRole,
  gamePlayers,
  onAckRole,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  myRole: AvalonRole | undefined;
  gamePlayers: Player[];
  onAckRole: () => void;
}) {
  const activeIds = getActiveNightPlayerIds('night-merlin', gamePlayers);
  const ackedIds = Object.keys(state.roleAcks ?? {});
  const activeAckedCount = activeIds.filter((id) => ackedIds.includes(id)).length;
  const allActiveAcked = activeIds.length > 0 && activeAckedCount >= activeIds.length;
  const myAcked = ackedIds.includes(myPlayer.id);

  const visibleEvils = gamePlayers.filter((p) => {
    const data = p.gameData as Partial<AvalonGameData>;
    return data.team === 'evil' && data.role !== AvalonRole.Mordred;
  });

  if (myRole !== AvalonRole.Merlin) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5 text-center">
          <p className="text-[11px] uppercase font-black text-blue-300 mb-2">
            <AvIcon name="merlin" /> Đêm — Merlin đang quan sát
          </p>
          <AvIcon name="night" size={48} className="mb-2 animate-pulse text-slate-200" />
          <p className="text-sm text-slate-300">
            Hãy nhắm mắt. Merlin đang nhìn ra Phe Quỷ (Mordred ẩn).
          </p>
        </div>
        <RoleIntroCard role={AvalonRole.Merlin} variant="other" />
        {myRole && <RoleIntroCard role={myRole} variant="self" compact />}
        <NightCountdown state={state} phase="night-merlin" allActiveAcked={allActiveAcked} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <RoleIntroCard role={AvalonRole.Merlin} variant="self" />
      <div className="rounded-2xl border border-blue-500/40 bg-blue-500/10 p-5">
        <p className="text-[11px] uppercase font-black text-blue-300 mb-1">
          <AvIcon name="merlin" /> Phe Quỷ lộ diện trước bạn
        </p>
        <p className="text-xs text-slate-300 mb-3">
          Bạn nhìn thấy {visibleEvils.length} quỷ. <strong>Mordred</strong> ẩn — không hiện ở đây.
          Hãy bí mật dẫn dắt Phe Người, đừng để Sát Thủ tìm ra bạn.
        </p>
        <div className="space-y-2">
          {visibleEvils.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5"
            >
              <PlayerAvatar player={p} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate">{p.name}</p>
                <p className="text-[11px] font-bold text-red-300">Phe Quỷ</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!myAcked ? (
        <button
          onClick={onAckRole}
          className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 py-4 text-base font-black text-white hover:from-blue-500 hover:to-cyan-500 active:scale-[0.98] shadow-lg shadow-blue-500/30"
        >
          ✓ Đã xem — Tiếp theo
        </button>
      ) : (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-center">
          <p className="text-sm font-bold text-emerald-300">✓ Bạn đã sẵn sàng</p>
        </div>
      )}

      <NightCountdown state={state} phase="night-merlin" allActiveAcked={allActiveAcked} />
    </div>
  );
}

export function NightPercivalSection({
  state,
  myPlayer,
  myRole,
  gamePlayers,
  onAckRole,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  myRole: AvalonRole | undefined;
  gamePlayers: Player[];
  onAckRole: () => void;
}) {
  const activeIds = getActiveNightPlayerIds('night-percival', gamePlayers);
  const ackedIds = Object.keys(state.roleAcks ?? {});
  const activeAckedCount = activeIds.filter((id) => ackedIds.includes(id)).length;
  const allActiveAcked = activeIds.length > 0 && activeAckedCount >= activeIds.length;
  const myAcked = ackedIds.includes(myPlayer.id);

  const suspects = gamePlayers.filter((p) => {
    const data = p.gameData as Partial<AvalonGameData>;
    return data.role === AvalonRole.Merlin || data.role === AvalonRole.Morgana;
  });

  if (myRole !== AvalonRole.Percival) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-5 text-center">
          <p className="text-[11px] uppercase font-black text-indigo-300 mb-2">
            <AvIcon name="percival" /> Đêm — Percival đang quan sát
          </p>
          <AvIcon name="night" size={48} className="mb-2 animate-pulse text-slate-200" />
          <p className="text-sm text-slate-300">
            Hãy nhắm mắt. Percival đang nhìn ra Merlin & Morgana.
          </p>
        </div>
        <RoleIntroCard role={AvalonRole.Percival} variant="other" />
        {myRole && <RoleIntroCard role={myRole} variant="self" compact />}
        <NightCountdown state={state} phase="night-percival" allActiveAcked={allActiveAcked} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <RoleIntroCard role={AvalonRole.Percival} variant="self" />
      <div className="rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-5">
        <p className="text-[11px] uppercase font-black text-indigo-300 mb-1">
          <AvIcon name="percival" /> Merlin & Morgana hiện ra trước bạn
        </p>
        <p className="text-xs text-slate-300 mb-3">
          1 trong 2 người dưới đây là <strong>Merlin</strong>, người còn lại là{' '}
          <strong>Morgana</strong>. Bạn KHÔNG biết ai là ai — hãy bảo vệ Merlin
          và đừng để Sát Thủ đoán trúng.
        </p>
        <div className="space-y-2">
          {suspects.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2.5"
            >
              <PlayerAvatar player={p} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate">{p.name}</p>
                <p className="text-[11px] font-bold text-indigo-300">Merlin hoặc Morgana</p>
              </div>
              <AvIcon name="unknown" size={24} className="text-indigo-300" title="Merlin hay Morgana?" />
            </div>
          ))}
        </div>
      </div>

      {!myAcked ? (
        <button
          onClick={onAckRole}
          className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 py-4 text-base font-black text-white hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] shadow-lg shadow-indigo-500/30"
        >
          ✓ Đã xem — Vào Quest
        </button>
      ) : (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-center">
          <p className="text-sm font-bold text-emerald-300">✓ Bạn đã sẵn sàng</p>
        </div>
      )}

      <NightCountdown state={state} phase="night-percival" allActiveAcked={allActiveAcked} />
    </div>
  );
}
