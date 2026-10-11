'use client';

import type { Player } from '@/types/player';
import { validateSetup, MAX_PLAYERS, MIN_PLAYERS } from '@/components/games/werewolf/engine/roles.ts';
import { lobbyCounts, type WwConfig } from '../state';
import type { WerewolfRoomConfig } from '../types';
import Button from '../ui/Button';
import LobbySettings from './LobbySettings';
import { Avatar, Dock } from './shared';

// Sảnh: ghế, cài đặt, nút Bắt đầu chỉ cho chủ phòng. Mời ra chỉ có ở sảnh
// (giữa ván không xoá doc người chơi nào — plan §6 "Bổ sung cho GĐ1" mục 3).
export default function LobbyPanel({
  players,
  myId,
  hostId,
  isHost,
  config,
  invite,
  onKick,
  onUpdateConfig,
  onStart,
}: {
  players: Player[];
  myId: string;
  hostId: string;
  isHost: boolean;
  config: WwConfig;
  /** Mã phòng / QR (dùng chung của app). */
  invite: React.ReactNode;
  onKick: (id: string, name: string) => void;
  onUpdateConfig: (next: Partial<WerewolfRoomConfig>) => void;
  onStart: () => void;
}) {
  const n = players.length;
  const errors = validateSetup(n, lobbyCounts(config.roleCounts, n));
  const countOk = n >= MIN_PLAYERS && n <= MAX_PLAYERS;
  const blocking = errors.filter((e) => e.code !== 'player-count');
  return (
    <section data-phase-section="lobby" className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-50">Phòng chờ</h2>
        <p className="mt-1 text-sm text-slate-300">
          {n} người · cần {MIN_PLAYERS}–{MAX_PLAYERS} người
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-1.5 min-[360px]:grid-cols-2" aria-label="Người trong phòng">
        {players.map((p) => (
          <li key={p.id} data-player-id={p.id} className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-800/80 px-2 py-1.5 text-sm">
            <Avatar name={p.name} />
            <span className="min-w-0 flex-1 truncate font-semibold text-slate-100">
              {p.name}
              {p.id === myId && <span className="ml-1 text-xs font-normal text-slate-400">(bạn)</span>}
              {p.id === hostId && <span className="ml-1 text-xs font-normal text-indigo-300">chủ phòng</span>}
            </span>
            {isHost && p.id !== myId && (
              <button
                type="button"
                aria-label={`Mời ${p.name} ra`}
                className="flex size-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-rose-300"
                onClick={() => onKick(p.id, p.name)}
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800">{invite}</div>

      <div className="rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800">
        <LobbySettings config={config} playerCount={n} editable={isHost} onUpdateConfig={onUpdateConfig} />
      </div>

      {countOk && blocking.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/30" data-ww-setup-errors="">
          {blocking.map((e) => (
            <li key={e.code}>{e.message}</li>
          ))}
        </ul>
      )}

      <Dock>
        {isHost ? (
          <Button variant="primary" block disabled={errors.length > 0} onClick={onStart}>
            {!countOk ? `Cần ${MIN_PLAYERS}–${MAX_PLAYERS} người (đang có ${n})` : errors.length > 0 ? 'Bộ vai chưa hợp lệ' : 'Bắt đầu ván Ma Sói'}
          </Button>
        ) : (
          <p className="text-center text-sm text-slate-400">Chờ chủ phòng bắt đầu…</p>
        )}
      </Dock>
    </section>
  );
}
