'use client';

import type { Player } from '@/types/player';
import { validateSetup, MAX_PLAYERS, MIN_PLAYERS } from '@/components/games/werewolf/engine/roles.ts';
import { lobbyCounts, type WwConfig } from '../state';
import type { WerewolfRoomConfig } from '../types';
import WwIcon from '../assets/WwIcon';
import Button from '../ui/Button';
import Panel from '../ui/Panel';
import LobbySettings from './LobbySettings';
import { Dock, PhaseHeader, PhaseLayout, Seat } from './shared';

// Sảnh: ghế, cài đặt, nút Bắt đầu chỉ cho chủ phòng. Mời ra chỉ có ở sảnh
// (giữa ván không xoá doc người chơi nào — plan §6 "Bổ sung cho GĐ1" mục 3).
// Màn rộng: người trong phòng + mã mời bên trái, cài đặt + nút bên phải.
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
    <PhaseLayout
      section="lobby"
      header={
        <PhaseHeader title="Phòng chờ">
          {n} người · cần {MIN_PLAYERS}–{MAX_PLAYERS} người
        </PhaseHeader>
      }
      stage={
        <div className="space-y-4">
          <ul className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 lg:grid-cols-3 lg:gap-3" aria-label="Người trong phòng">
            {players.map((p) => (
              <li key={p.id}>
                <Seat
                  player={p}
                  sub={
                    p.id === hostId || p.id === myId ? (
                      <span className="flex items-center gap-1 text-xs font-normal text-(--ww-text-3)">
                        {p.id === hostId && <WwIcon name="host" size={12} />}
                        {[p.id === myId ? 'bạn' : null, p.id === hostId ? 'chủ phòng' : null].filter(Boolean).join(' · ')}
                      </span>
                    ) : undefined
                  }
                  action={
                    isHost && p.id !== myId ? (
                      <Button variant="ghost" icon="close" aria-label={`Mời ${p.name} ra`} onClick={() => onKick(p.id, p.name)} />
                    ) : undefined
                  }
                />
              </li>
            ))}
          </ul>
          <Panel className="p-4">{invite}</Panel>
        </div>
      }
    >
      <div className="mt-4 rounded-2xl border border-(--ww-line) bg-(color:--ww-glass-bg) p-4 shadow-lg shadow-black/30 lg:mt-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <LobbySettings config={config} playerCount={n} editable={isHost} onUpdateConfig={onUpdateConfig} />
      </div>

      {countOk && blocking.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-(--ww-wolf-light)" data-ww-setup-errors="">
          {blocking.map((e) => (
            <li key={e.code} className="flex items-start gap-2">
              <WwIcon name="warning" size={16} className="mt-0.5" />
              {e.message}
            </li>
          ))}
        </ul>
      )}

      <Dock>
        {isHost ? (
          <Button variant="primary" size="lg" block disabled={errors.length > 0} onClick={onStart}>
            {!countOk ? `Cần ${MIN_PLAYERS}–${MAX_PLAYERS} người (đang có ${n})` : errors.length > 0 ? 'Bộ vai chưa hợp lệ' : 'Bắt đầu ván Ma Sói'}
          </Button>
        ) : (
          <p className="flex items-center justify-center gap-1.5 text-sm text-(--ww-text-2)">
            <WwIcon name="waiting" size={16} />
            Chờ chủ phòng bắt đầu…
          </p>
        )}
      </Dock>
    </PhaseLayout>
  );
}
