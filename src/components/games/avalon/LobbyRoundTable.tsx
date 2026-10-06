'use client';

import type { Player } from '@/types/player';
import AvIcon from './assets/AvIcon';
import PlayerAvatar from './ui/PlayerAvatar';

interface LobbyRoundTableProps {
  players: Player[];
  myPlayerId?: string;
  roomCode?: string;
  maxPlayers?: number;
  minPlayers?: number;
  /** Số ghế hiển thị quanh bàn. Mặc định = số người đã vào (không thêm ghế trống). */
  reserveSeats?: number;
  /** Cung cấp khi viewer là host — render nút kick trên avatar người khác. */
  onKick?: (playerId: string, playerName: string) => void;
}

export default function LobbyRoundTable({
  players,
  myPlayerId,
  roomCode,
  maxPlayers,
  minPlayers,
  reserveSeats,
  onKick,
}: LobbyRoundTableProps) {
  // Số ghế = số người chơi hiện tại (không hiện ghế trống dư).
  // Tối thiểu 1 ghế để bàn không sụp khi phòng vừa mở (chưa ai vào).
  const ringSize = Math.max(reserveSeats ?? players.length, 1);
  const seats = Array.from({ length: ringSize }).map((_, i) => players[i] ?? null);
  const enough = minPlayers === undefined || players.length >= minPlayers;

  return (
    <div className="relative mx-auto w-full max-w-[640px] sm:max-w-[680px] lg:max-w-[760px] aspect-square select-none">
      {/* Round table */}
      <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(180,120,60,0.25),transparent_55%),linear-gradient(135deg,#3b2a1a_0%,#2a1c0f_50%,#15100a_100%)] border-[3px] border-amber-800/60 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8),inset_0_2px_8px_rgba(255,200,140,0.1)]">
        <div className="absolute inset-2 rounded-full border border-amber-700/30" />
        <div className="absolute inset-5 rounded-full border border-amber-600/15" />

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
          <AvIcon name="avalon" className="h-9 w-9 sm:h-11 sm:w-11 text-(--av-gold)" />
          <div className="av-display text-sm sm:text-lg tracking-[0.12em] text-amber-200/90">
            Phòng chờ Avalon
          </div>
          {roomCode && (
            <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/15 px-4 py-2 shadow-inner">
              <div className="text-[9px] uppercase tracking-widest font-bold text-amber-200/70">
                Mã phòng
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-[0.2em] text-amber-100 tabular-nums">
                {roomCode}
              </div>
            </div>
          )}
          <div className="flex flex-col items-center gap-1">
            <div className="text-2xl sm:text-3xl font-black text-white tabular-nums">
              {players.length}
              {maxPlayers !== undefined && (
                <span className="text-stone-400 text-base font-bold"> / {maxPlayers}</span>
              )}
            </div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-stone-400">
              Người chơi
            </div>
            {!enough && minPlayers !== undefined && (
              <div className="mt-1 rounded-full bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-black text-amber-200">
                Cần ≥ {minPlayers} người
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seats around the table */}
      {seats.map((p, i) => {
        const angleDeg = (360 / ringSize) * i - 90;
        const rad = (angleDeg * Math.PI) / 180;
        const radiusPct = 43;
        const x = 50 + radiusPct * Math.cos(rad);
        const y = 50 + radiusPct * Math.sin(rad);
        const isMe = p?.id === myPlayerId;
        const isHost = p?.isHost;

        return (
          <div
            key={p?.id ?? `empty-${i}`}
            className="absolute"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="flex flex-col items-center gap-1">
              {p ? (
                <PlayerAvatar player={p} size="table" isMe={isMe}>
                  {isHost && (
                    <span
                      title="Chủ phòng"
                      className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-stone-200 border border-white text-[12px] text-(--av-ink) shadow shadow-black/40"
                    >
                      <AvIcon name="host" />
                    </span>
                  )}
                  {/* Nút kick — chỉ hiện khi viewer là host và target không phải
                      chính mình hoặc host khác (nếu có). */}
                  {onKick && !isMe && !isHost && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onKick(p.id, p.name);
                      }}
                      title={`Kick ${p.name}`}
                      aria-label={`Kick ${p.name}`}
                      className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-stone-800 border border-stone-400 text-[14px] text-stone-100 shadow shadow-black/50 hover:bg-orange-700 active:scale-90 cursor-pointer"
                    >
                      <AvIcon name="close" />
                    </button>
                  )}
                </PlayerAvatar>
              ) : (
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-[3px] border-dashed border-white/15 bg-white/5 text-sm font-black text-stone-500">
                  <span className="text-base opacity-60">+</span>
                </div>
              )}
              <div
                className={`max-w-[90px] truncate rounded-md px-1.5 py-0.5 text-[11px] font-bold leading-tight text-center ${
                  p
                    ? isMe
                      ? 'bg-(--av-parchment)/20 text-(--av-parchment) ring-1 ring-(--av-parchment)/40'
                      : 'bg-black/50 text-white'
                    : 'bg-white/5 text-stone-500 italic'
                }`}
                title={p?.name ?? 'Chỗ trống'}
              >
                {p ? (
                  <>
                    {p.name}
                    {isMe && <span className="ml-0.5">•</span>}
                  </>
                ) : (
                  'Trống'
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
