import type { Player } from '@/types/player';
import type { RosterNotice } from '../hooks/useRosterChanges';
import AvIcon from '../assets/AvIcon';
import PlayerAvatar from './PlayerAvatar';

// The lobby's small "<Tên> đã vào phòng / đã rời phòng" notices at the top of
// the screen (hooks/useRosterChanges). They never take a tap.
export default function LobbyNotices({ notices, players }: { notices: RosterNotice[]; players: Player[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-40 flex flex-col items-center gap-1.5 px-4" aria-live="polite">
      {notices.map((n) => {
        const p = players.find((x) => x.id === n.playerId);
        return (
          <div
            key={n.id}
            className="av-toast flex max-w-full items-center gap-2 rounded-full border border-(--av-line) bg-(color:--av-bar-bg) py-1 pl-1 pr-3 text-xs font-semibold text-(--av-text-2) shadow-lg shadow-black/40"
            data-lobby-notice={n.kind}
          >
            {p && n.kind === 'join' ? (
              <PlayerAvatar player={p} size="xs" />
            ) : (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs text-(--av-text-2)">
                <AvIcon name="leave" />
              </span>
            )}
            <span className="truncate">
              <strong className="text-(--av-text)">{n.name}</strong> {n.kind === 'join' ? 'đã vào phòng' : 'đã rời phòng'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
