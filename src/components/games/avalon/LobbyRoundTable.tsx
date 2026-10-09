'use client';

import type { Player } from '@/types/player';
import AvIcon from './assets/AvIcon';
import PlayerAvatar from './ui/PlayerAvatar';
import { seatPosition } from './table/seatPosition';
import { useArrivals } from './hooks/useArrivals';
import { useDepartures } from './hooks/useRosterChanges';

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

// The lobby's round table. Someone who joins "sits down" (their seat scales
// and fades in); someone who leaves fades out where they sat, and the seats
// after theirs slide round to close the gap. Decorative transitions from the
// previous list (ux-plan 2.2): a reload just shows who is there.
//
// Each seat is a zero-size anchor at the table centre moved out to its seat in
// `cqw` (the table is a square size container), so a seat changing place is a
// `transform` transition — never a layer the size of the table (it would stick
// out of the page and scroll the phone sideways).
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
  const ringSize = Math.max(reserveSeats ?? players.length, players.length, 1);
  const seats = Array.from({ length: ringSize }).map((_, i) => players[i] ?? null);
  const enough = minPlayers === undefined || players.length >= minPlayers;
  const arrived = useArrivals(players.map((p) => p.id));
  const departed = useDepartures(players);

  const anchor = (i: number) => {
    const { x, y } = seatPosition(i, ringSize);
    return { transform: `translate(${(x - 50).toFixed(3)}cqw, ${(y - 50).toFixed(3)}cqw)` };
  };

  return (
    <div className="@container relative mx-auto w-full max-w-[640px] sm:max-w-[680px] lg:max-w-[760px] aspect-square select-none">
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
            <div className="text-2xl sm:text-3xl font-black text-white tabular-nums" data-lobby-count={players.length}>
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
        const isMe = p?.id === myPlayerId;
        const isHost = p?.isHost;

        return (
          <div key={p?.id ?? `empty-${i}`} className="av-lobby-seat absolute left-1/2 top-1/2 h-0 w-0" style={anchor(i)}>
            <div
              className={`absolute left-0 top-0 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 ${p && arrived.has(p.id) ? 'av-seat-in' : ''}`}
              data-lobby-seat={p ? p.id : 'empty'}
            >
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
                      chính mình hoặc host khác (nếu có). Nhỏ và sát avatar, để
                      bàn 10 ghế trên điện thoại không đè sang ghế bên cạnh. */}
                  {onKick && !isMe && !isHost && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onKick(p.id, p.name);
                      }}
                      title={`Mời ${p.name} ra khỏi phòng`}
                      aria-label={`Mời ${p.name} ra khỏi phòng`}
                      className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-stone-800 border border-stone-400 text-[11px] text-stone-100 shadow shadow-black/50 hover:bg-orange-700 active:scale-90 cursor-pointer before:absolute before:-inset-3 before:content-['']"
                    >
                      <AvIcon name="close" />
                    </button>
                  )}
                </PlayerAvatar>
              ) : (
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-[3px] border-dashed border-white/20 bg-black/30 text-sm font-black text-stone-300" aria-hidden>
                  <span className="text-base">+</span>
                </div>
              )}
              <div
                className={`max-w-[80px] truncate rounded-md px-1.5 py-0.5 text-[11px] font-bold leading-tight text-center ${
                  p
                    ? isMe
                      ? 'bg-black/75 text-(--av-parchment) ring-1 ring-(--av-parchment)/50'
                      : 'bg-black/75 text-white'
                    : 'bg-black/40 text-stone-400 italic'
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

      {/* Players who just left fade out where they sat. */}
      {departed.map(({ item, index }) => (
        <div
          key={`gone-${item.id}`}
          className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0"
          style={anchor(index)}
          aria-hidden
        >
          <div className="av-seat-out absolute left-0 top-0 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1">
            <PlayerAvatar player={item} size="table" />
            <div className="max-w-[80px] truncate rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-bold leading-tight text-white">
              {item.name}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
