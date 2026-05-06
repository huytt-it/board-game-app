import type { ComponentType } from 'react';
import type { Room } from './room';
import type { Player } from './player';

// ─── Standard props contract for every game Board component ───────────
export interface GameModuleProps {
  room: Room;
  players: Player[];
  playerId: string;
  isHost: boolean;
}

// ─── Type alias for a lazily-loaded game component ────────────────────
export type GameComponent = ComponentType<GameModuleProps>;
