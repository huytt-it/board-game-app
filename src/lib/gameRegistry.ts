import type { ComponentType } from 'react';
import type { GameType } from '@/types/room';
import type { Player } from '@/types/player';
import type { Room } from '@/types/room';

// ─── Game Module Props ────────────────────────────────────────────────
export interface GameModuleProps {
  room: Room;
  players: Player[];
  playerId: string;
  isHost: boolean;
}

// ─── Game Registry Entry ──────────────────────────────────────────────
export interface GameRegistryEntry {
  key: GameType;
  label: string;
  description: string;
  icon: string;         // emoji or icon path
  enabled: boolean;
  minPlayers: number;
  maxPlayers: number;
  component: ComponentType<GameModuleProps> | null;
}

// ─── Lazy-loaded imports (only for enabled games) ─────────────────────
import dynamic from 'next/dynamic';

const ClocktowerBoard = dynamic(
  () => import('@/components/games/clocktower/ClocktowerBoard'),
  { ssr: false }
);

// ─── Game Registry ────────────────────────────────────────────────────
export const GAME_REGISTRY: GameRegistryEntry[] = [
  {
    key: 'clock-tower',
    label: 'Blood on the Clocktower',
    description: 'A bluffing game of deduction and deception for 5-20 players. The Storyteller knows all — but can they be trusted?',
    icon: '🏰',
    enabled: true,
    minPlayers: 1,
    maxPlayers: 20,
    component: ClocktowerBoard,
  },
  {
    key: 'werewolf',
    label: 'Werewolf',
    description: 'The village must find the werewolves before night falls. Classic social deduction for 6-18 players.',
    icon: '🐺',
    enabled: false,
    minPlayers: 6,
    maxPlayers: 18,
    component: null,
  },
  {
    key: 'avalon',
    label: 'The Resistance: Avalon',
    description: 'Merlin knows the spies, but can he guide Arthur\'s knights without revealing himself? 5-10 players.',
    icon: '⚔️',
    enabled: false,
    minPlayers: 5,
    maxPlayers: 10,
    component: null,
  },
];

// ─── Lookup Helpers ───────────────────────────────────────────────────
export function getGameEntry(gameType: GameType): GameRegistryEntry | undefined {
  return GAME_REGISTRY.find((g) => g.key === gameType);
}

export function getGameComponent(gameType: GameType): ComponentType<GameModuleProps> | null {
  const entry = getGameEntry(gameType);
  return entry?.component ?? null;
}
