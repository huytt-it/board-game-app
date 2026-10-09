'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Player } from '@/types/player';
import type { Room } from '@/types/room';
import AvIcon from './assets/AvIcon';
import { avalonDisplayFont } from './assets/fonts';
import SceneBackdrop from './scenes/SceneBackdrop';
import GlassPanel from './ui/GlassPanel';
import PlayerAvatar from './ui/PlayerAvatar';
import './avalon.css';

// The page someone lands on from an Avalon invite link before they have a seat
// (src/app/room/[gameType]/[roomId]/page.tsx renders it for Avalon only): the
// great hall, who is already at the table, and the name to sit down with.

// useRoom.joinRoomById throws these (in English) — say them in Vietnamese.
const JOIN_ERRORS: Record<string, string> = {
  'Room not found': 'Không tìm thấy phòng — có thể phòng đã đóng.',
  'Room is full': 'Phòng đã đủ người.',
  'Game already in progress': 'Ván đang diễn ra — chờ ván sau nhé.',
};

export default function AvalonJoinScreen({
  room,
  players,
  onJoin,
}: {
  room: Room;
  players: Player[];
  /** Joins the room under that name; throws when it cannot. */
  onJoin: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxPlayers = room.config.maxPlayers ?? 10;
  // Same rule as useRoom.joinRoomById: the host does not take one of the seats.
  const full = players.filter((p) => !p.isHost).length >= maxPlayers;
  const inGame = room.status !== 'lobby';
  const closedReason = inGame ? JOIN_ERRORS['Game already in progress'] : full ? JOIN_ERRORS['Room is full'] : null;
  const host = players.find((p) => p.isHost);

  const submit = async () => {
    const n = name.trim();
    if (!n || joining || closedReason) return;
    setJoining(true);
    setError(null);
    try {
      await onJoin(n);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(JOIN_ERRORS[msg] ?? 'Không vào được phòng — kiểm tra mạng rồi thử lại.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <>
      <SceneBackdrop sceneId="hall" />
      <div className={`avalon-root ${avalonDisplayFont.variable} flex min-h-dvh flex-col items-center justify-center px-4 py-8`}>
        <div className="av-rise flex w-full max-w-sm flex-col items-center text-center">
          <AvIcon name="avalon" size={52} className="text-(--av-gold) drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" />
          <p className="mt-2 text-[11px] font-black uppercase tracking-[0.3em] text-(--av-gold)">Lời mời vào bàn tròn</p>
          <h1 className="av-display mt-1 text-3xl leading-tight text-white">The Resistance: Avalon</h1>
          <p className="mt-2 text-sm text-slate-300">
            {host ? (
              <>
                <strong className="text-(--av-parchment)">{host.name}</strong> mời bạn ngồi vào bàn. Nhập tên để vào phòng chờ.
              </>
            ) : (
              'Nhập tên để vào phòng chờ.'
            )}
          </p>

          <GlassPanel tone="gold" emphasis className="mt-5 w-full p-5 text-left">
            {/* Who is already seated. */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mã phòng</p>
                <p className="text-xl font-black tracking-[0.2em] text-amber-100 tabular-nums">{room.roomCode}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Đã ngồi</p>
                <p className="text-xl font-black tabular-nums text-white">
                  {players.length}
                  <span className="text-sm font-bold text-slate-400"> / {maxPlayers}</span>
                </p>
              </div>
            </div>
            {players.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Người đã vào phòng">
                {players.map((p) => (
                  <span key={p.id} title={p.name} className="relative">
                    <PlayerAvatar player={p} size="sm" />
                    {p.isHost && (
                      <span className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-stone-200 text-[10px] text-(--av-ink)">
                        <AvIcon name="host" title="Chủ phòng" />
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 border-t border-white/10 pt-4">
              {closedReason ? (
                <p className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2.5 text-sm font-bold text-amber-200">
                  <AvIcon name="warning" /> {closedReason}
                </p>
              ) : (
                <>
                  <label className="mb-1.5 block text-sm font-bold text-(--av-parchment)" htmlFor="display-name-input">
                    Tên của bạn
                  </label>
                  <input
                    id="display-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    placeholder="Ví dụ: Lancelot"
                    maxLength={20}
                    autoComplete="nickname"
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white placeholder-slate-500 outline-none transition-colors focus:border-(--av-gold) focus:ring-1 focus:ring-(--av-gold)"
                  />
                  {error && (
                    <p className="mt-2 rounded-xl border border-orange-500/40 bg-orange-950/60 px-3 py-2 text-sm text-orange-200" role="alert">
                      {error}
                    </p>
                  )}
                  <button
                    onClick={submit}
                    disabled={joining || !name.trim()}
                    className="mt-3 w-full rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 px-4 py-3.5 text-base font-black text-(--av-ink) shadow-lg shadow-amber-500/25 transition-all hover:from-amber-500 hover:to-yellow-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:from-stone-700 disabled:to-stone-700 disabled:text-stone-300 disabled:shadow-none"
                  >
                    {joining ? 'Đang vào…' : 'Vào bàn'}
                  </button>
                </>
              )}
            </div>
          </GlassPanel>

          <Link href="/" className="mt-5 text-sm font-bold text-slate-400 transition-colors hover:text-slate-200">
            ← Về trang chủ
          </Link>
        </div>
      </div>
    </>
  );
}
