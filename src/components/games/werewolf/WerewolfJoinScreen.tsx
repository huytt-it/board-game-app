'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Player } from '@/types/player';
import type { Room } from '@/types/room';
import WwIcon from './assets/WwIcon';
import WwShell from './WwShell';
import Button from './ui/Button';
import Panel from './ui/Panel';
import { Avatar } from './panel/shared';

// Trang người được mời mở ra trước khi có ghế (src/app/room/[gameType]/[roomId]/page.tsx
// chỉ render nó cho Ma Sói; nạp từ module WerewolfBoard nên dùng chung chunk):
// ngôi làng ban đêm, ai đã vào làng, ô nhập tên. Mẫu: AvalonJoinScreen.

// useRoom.joinRoomById ném các lỗi này (tiếng Anh) — nói lại bằng tiếng Việt.
const JOIN_ERRORS: Record<string, string> = {
  'Room not found': 'Không tìm thấy phòng — có thể phòng đã đóng.',
  'Room is full': 'Phòng đã đủ người.',
  'Game already in progress': 'Ván đang diễn ra — chờ ván sau nhé.',
};

export default function WerewolfJoinScreen({
  room,
  players,
  onJoin,
}: {
  room: Room;
  players: Player[];
  /** Vào phòng với tên này; ném lỗi nếu không vào được. */
  onJoin: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxPlayers = room.config.maxPlayers ?? 10;
  // Cùng quy tắc với useRoom.joinRoomById: chủ phòng không chiếm một ghế.
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
    <WwShell state={null} className="" data-ww-join="">
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
        <div className="flex w-full max-w-sm flex-col items-center text-center">
          <WwIcon name="game" size={56} className="text-(--ww-moon)" />
          <h1 className="ww-display mt-2 text-4xl leading-tight text-(--ww-text)">Ma Sói</h1>
          <p className="mt-2 text-sm text-(--ww-text-2)">
            {host ? (
              <>
                <strong className="text-(--ww-text)">{host.name}</strong> mời bạn vào làng. Nhập tên để vào phòng chờ.
              </>
            ) : (
              'Nhập tên để vào phòng chờ.'
            )}
          </p>

          <Panel tone="accent" className="mt-5 w-full p-5 text-left">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-(--ww-text-3)">Mã phòng</p>
                <p className="ww-display text-2xl tracking-[0.15em] text-(--ww-accent) tabular-nums">{room.roomCode}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-(--ww-text-3)">Đã vào làng</p>
                <p className="text-xl font-bold text-(--ww-text) tabular-nums">
                  {players.length}
                  <span className="text-sm font-semibold text-(--ww-text-3)"> / {maxPlayers}</span>
                </p>
              </div>
            </div>
            {players.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Người đã vào phòng">
                {players.map((p) => (
                  <span key={p.id} title={p.name} className="relative">
                    <Avatar name={p.name} id={p.id} />
                    {p.isHost && (
                      <span className="absolute -top-1 -left-1 flex size-4 items-center justify-center rounded-full bg-(--ww-text) text-(--ww-ink)">
                        <WwIcon name="host" size={11} title="Chủ phòng" />
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 border-t border-(--ww-line) pt-4">
              {closedReason ? (
                <p className="flex items-start gap-2 text-sm font-semibold text-(--ww-wolf-light)">
                  <WwIcon name="warning" size={18} className="mt-0.5" /> {closedReason}
                </p>
              ) : (
                <>
                  <label className="mb-1.5 block text-sm font-semibold text-(--ww-text)" htmlFor="display-name-input">
                    Tên của bạn
                  </label>
                  <input
                    id="display-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    placeholder="Ví dụ: Lan"
                    maxLength={20}
                    autoComplete="nickname"
                    className="w-full rounded-xl border border-(--ww-line) bg-(--ww-ink) px-4 py-3 text-(--ww-text) transition-colors outline-none placeholder:text-(--ww-text-3) focus:border-(--ww-accent) focus:ring-1 focus:ring-(--ww-accent)"
                  />
                  {error && (
                    <p className="mt-2 flex items-start gap-2 text-sm text-(--ww-wolf-light)" role="alert">
                      <WwIcon name="warning" size={18} className="mt-0.5" /> {error}
                    </p>
                  )}
                  <Button variant="primary" size="lg" block className="mt-3" onClick={submit} disabled={joining || !name.trim()}>
                    {joining ? 'Đang vào…' : 'Vào làng'}
                  </Button>
                </>
              )}
            </div>
          </Panel>

          <Link
            href="/"
            className="mt-5 inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-(--ww-text-2) transition-colors hover:text-(--ww-text)"
          >
            ← Về trang chủ
          </Link>
        </div>
      </div>
    </WwShell>
  );
}
