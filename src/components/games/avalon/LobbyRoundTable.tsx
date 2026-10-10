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
  /** Cung cấp khi viewer là host: chạm vào ghế của người khác để mời họ ra
   *  (onKick hỏi lại bằng hộp xác nhận). */
  onKick?: (playerId: string, playerName: string) => void;
}

// The lobby's round table. Someone who joins "sits down" (their seat scales
// and fades in); someone who leaves fades out where they sat, and the seats
// after theirs slide round to close the gap. Decorative transitions from the
// previous list (ux-plan 2.2): a reload just shows who is there.
//
// No ⊗ on every seat (ux-plan GĐ7b): for the host, the other players' seats
// are buttons — a tap asks "Mời X ra khỏi phòng?" (the confirm dialog of
// onKick). An empty seat is a faint ring, no words.
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
      {/* The round table: the same dark wood and faint rim as in the game. */}
      <div className="absolute inset-[12%] rounded-full border-2 border-black/40 bg-[radial-gradient(circle_at_30%_25%,rgba(180,120,60,0.16),transparent_55%),linear-gradient(135deg,#33251a_0%,#241a10_50%,#140f0a_100%)] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8),inset_0_0_0_1px_rgba(239,227,200,0.07)]">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
          <AvIcon name="avalon" className="h-8 w-8 text-(--av-gold) sm:h-10 sm:w-10" />
          {roomCode && (
            <div>
              <div className="text-xs text-(--av-text-3)">Mã phòng</div>
              <div className="av-display text-3xl tracking-[0.15em] text-(--av-gold) tabular-nums sm:text-4xl">{roomCode}</div>
            </div>
          )}
          <div className="text-sm text-(--av-text-2)" data-lobby-count={players.length}>
            <span className="text-xl font-bold tabular-nums text-(--av-text)">{players.length}</span>
            {maxPlayers !== undefined && <span className="tabular-nums"> / {maxPlayers}</span>} người chơi
          </div>
          {!enough && minPlayers !== undefined && (
            <div className="text-xs text-(--av-text-3)">Cần ít nhất {minPlayers} người</div>
          )}
        </div>
      </div>

      {/* Seats around the table */}
      {seats.map((p, i) => {
        const isMe = p?.id === myPlayerId;
        const isHost = p?.isHost;
        // The host may invite anyone but themselves (and another host) out.
        const kickable = !!p && !!onKick && !isMe && !isHost;
        const label = p && (
          <div
            className={`max-w-[80px] truncate rounded-full px-2 py-0.5 text-center text-[clamp(10px,3.5cqw,12px)] font-semibold leading-tight ${
              isMe ? 'bg-black/75 text-(--av-parchment) ring-1 ring-(--av-parchment)/50' : 'bg-black/75 text-(--av-text)'
            }`}
            title={p.name}
          >
            {p.name}
            {isMe && <span className="ml-0.5">•</span>}
          </div>
        );

        return (
          <div key={p?.id ?? `empty-${i}`} className="av-lobby-seat absolute left-1/2 top-1/2 h-0 w-0" style={anchor(i)}>
            <div
              className={`absolute left-0 top-0 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 ${p && arrived.has(p.id) ? 'av-seat-in' : ''}`}
              data-lobby-seat={p ? p.id : 'empty'}
            >
              {p ? (
                kickable ? (
                  // A seat the host can tap: the dialog asks before anyone is removed.
                  <button
                    type="button"
                    onClick={() => onKick!(p.id, p.name)}
                    title={`Mời ${p.name} ra khỏi phòng`}
                    className="flex cursor-pointer flex-col items-center gap-1 rounded-full active:scale-95 [&:hover_.av-seat-box]:ring-2 [&:hover_.av-seat-box]:ring-(--av-evil)/60"
                    data-lobby-kick={p.id}
                  >
                    <PlayerAvatar player={p} size="table" />
                    {label}
                  </button>
                ) : (
                  <>
                    <PlayerAvatar player={p} size="table" isMe={isMe}>
                      {isHost && (
                        <span
                          title="Chủ phòng"
                          className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-(--av-ink)/60 bg-(--av-parchment) text-xs text-(--av-ink) shadow shadow-black/40"
                        >
                          <AvIcon name="host" />
                        </span>
                      )}
                    </PlayerAvatar>
                    {label}
                  </>
                )
              ) : (
                // An empty seat: a faint ring, nothing to read.
                <div className="av-seat-box h-12 w-12 rounded-full border-2 border-dashed border-(--av-line) bg-black/20 sm:h-14 sm:w-14" aria-hidden />
              )}
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
            <div className="max-w-[80px] truncate rounded-full bg-black/75 px-2 py-0.5 text-[clamp(10px,3.5cqw,12px)] font-semibold leading-tight text-(--av-text)">
              {item.name}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
