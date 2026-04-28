'use client';

import type { Player } from '@/types/player';

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
          <div className="text-3xl sm:text-4xl">⚔️</div>
          <div className="text-[10px] sm:text-xs uppercase font-black tracking-[0.25em] text-amber-200/80">
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
              <div
                className={`relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-[3px] text-sm font-black text-white transition-all ${
                  p
                    ? isMe
                      ? 'border-blue-400 bg-blue-500/20 ring-2 ring-blue-300/50'
                      : 'border-white/40 bg-gradient-to-br from-purple-500/40 to-cyan-500/40'
                    : 'border-dashed border-white/15 bg-white/5 text-stone-500'
                }`}
              >
                {p ? (
                  <>
                    <span className="text-base">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    {isHost && (
                      <span
                        title="Chủ phòng"
                        className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 border border-amber-200 text-[10px] shadow shadow-amber-500/40"
                      >
                        👑
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
                        className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 border border-red-200 text-[12px] font-black text-white shadow shadow-red-500/50 hover:bg-red-500 active:scale-90 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-base opacity-60">+</span>
                )}
              </div>
              <div
                className={`max-w-[90px] truncate rounded-md px-1.5 py-0.5 text-[11px] font-bold leading-tight text-center ${
                  p
                    ? isMe
                      ? 'bg-blue-500/30 text-blue-100 ring-1 ring-blue-400/40'
                      : 'bg-black/50 text-white'
                    : 'bg-white/5 text-stone-500 italic'
                }`}
                title={p?.name ?? 'Chỗ trống'}
              >
                {p ? (
                  <>
                    {p.name}
                    {isMe && <span className="ml-0.5 text-blue-200">•</span>}
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
