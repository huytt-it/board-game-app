import type { GameType } from '@core/types/room';
import type { GameComponent } from '@core/types/game';
import type { StorageConfig } from '@core/services/storage/StorageFactory';
import dynamic from 'next/dynamic';

// Re-export so game components can import GameModuleProps from either location
export type { GameModuleProps } from '@core/types/game';

// ─── Game Registry Entry ──────────────────────────────────────────────
export interface GameRegistryEntry {
  key: GameType;
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
  minPlayers: number;
  maxPlayers: number;
  component: GameComponent | null;
  /** Override the global storage adapter for this specific game. */
  storage?: StorageConfig;
}

// ─── Lazy-loaded game components ──────────────────────────────────────
const ClocktowerBoard = dynamic(
  () => import('@games/clocktower/components/ClocktowerBoard'),
  { ssr: false }
);

const AvalonBoard = dynamic(
  () => import('@games/avalon/components/AvalonBoard'),
  { ssr: false }
);

const SheriffBoard = dynamic(
  () => import('@games/sheriff/components/SheriffBoard'),
  { ssr: false }
);

const ShadowHunterBoard = dynamic(
  () => import('@games/shadowhunter/components/ShadowHunterBoard'),
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
    description: "Merlin knows the spies, but can he guide Arthur's knights without revealing himself? 5-10 players.",
    icon: '⚔️',
    enabled: true,
    minPlayers: 5,
    maxPlayers: 10,
    component: AvalonBoard,
  },
  {
    key: 'sheriff',
    label: 'Sheriff of Nottingham',
    description: 'Buôn bán, nói dối, thương lượng và hối lộ. Ai giàu nhất sau nhiều vòng chợ sẽ thắng. 3-6 người.',
    icon: '⚖️',
    enabled: true,
    minPlayers: 3,
    maxPlayers: 6,
    component: SheriffBoard,
  },
  {
    key: 'shadowhunter',
    label: 'Shadow Hunters',
    description: 'Game ẩn vai 3 phe: Hunter, Shadow, Neutral. Di chuyển, dùng bài, tấn công và tiết lộ danh tính để giành chiến thắng. 4-8 người.',
    icon: '🌑',
    enabled: true,
    minPlayers: 4,
    maxPlayers: 8,
    component: ShadowHunterBoard,
    // Example: override to WebSocket for low-latency turn-based gameplay
    // storage: { adapter: 'websocket', wsUrl: process.env.NEXT_PUBLIC_WS_URL },
  },
];

// ─── Lookup Helpers ───────────────────────────────────────────────────
export function getGameEntry(gameType: GameType): GameRegistryEntry | undefined {
  return GAME_REGISTRY.find((g) => g.key === gameType);
}

export function getGameComponent(gameType: GameType): GameComponent | null {
  return getGameEntry(gameType)?.component ?? null;
}
