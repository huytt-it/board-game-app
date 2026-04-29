// ─── Card Categories ──────────────────────────────────────────────────────────
export type LegalCategory = 'apple' | 'cheese' | 'bread' | 'chicken';
export type ContrabandCategory = 'pepper' | 'mead' | 'silk' | 'crossbow';
export type RoyalCategory =
  | 'green_apple'
  | 'golden_apple'
  | 'gouda_cheese'
  | 'bleu_cheese'
  | 'rye_bread'
  | 'pumpernickel_bread'
  | 'royal_rooster';
export type CardCategory = LegalCategory | ContrabandCategory | RoyalCategory;
export type CardType = 'legal' | 'contraband' | 'royal';

// ─── Game Phase ───────────────────────────────────────────────────────────────
export type SheriffPhase =
  | 'market'
  | 'load_bag'
  | 'declare'
  | 'inspect'
  | 'end_round'
  | 'final_scoring';

// ─── Declaration ──────────────────────────────────────────────────────────────
export interface Declaration {
  good: LegalCategory;
  count: number;
}

// ─── Bribe ────────────────────────────────────────────────────────────────────
export interface BribeOffer {
  fromPlayerId: string;
  gold: number;
  status: 'pending' | 'accepted' | 'rejected';
}

// ─── Round Log ────────────────────────────────────────────────────────────────
export interface RoundLogEntry {
  round: number;
  merchantId: string;
  merchantName: string;
  declared: string;
  bagContents: string[];
  wasHonest: boolean;
  wasInspected: boolean;
  goldChange: number; // positive = gained, negative = lost
  bribeGold?: number;
}

// ─── Final Score ──────────────────────────────────────────────────────────────
export interface PlayerFinalScore {
  playerId: string;
  playerName: string;
  gold: number;
  legalValue: number;
  contrabandValue: number;
  royalValue: number;
  kingBonus: number;
  queenBonus: number;
  total: number;
  // Category counts (for King/Queen determination)
  appleCount: number;
  cheeseCount: number;
  breadCount: number;
  chickenCount: number;
}

// ─── Main Game State (stored in room.gameState) ───────────────────────────────
export interface SheriffGameState {
  phase: SheriffPhase;
  round: number; // 1-indexed
  totalRounds: number;
  sheriffOrder: string[]; // playerIds in Sheriff rotation
  sheriffPlayerId: string;

  // Card piles (stored as category string arrays)
  drawPile: string[];
  discardPile: string[];

  // Market phase
  marketReady: Record<string, boolean>;

  // Load bag phase
  bagSizes: Record<string, number>; // public: how many cards in each bag
  bagConfirmed: Record<string, boolean>;

  // Declare phase
  declarations: Record<string, { good: string; count: number }>;
  declarationDone: Record<string, boolean>;

  // Inspect phase
  inspectQueue: string[]; // merchant playerIds to inspect in order
  currentInspectTarget: string | null;
  inspectDecisions: Record<string, 'pass' | 'inspect'>;
  bagRevealed: Record<string, boolean>;
  bagContents: Record<string, string[]>; // public after bag is revealed

  // Bribery (current negotiation)
  bribeOffer: BribeOffer | null;

  // Round history log
  roundLog: RoundLogEntry[];

  // Final scoring
  finalScores: PlayerFinalScore[];
  winner: string | null;
}

// ─── Player Data (stored in player.gameData) ──────────────────────────────────
export interface SheriffPlayerData {
  hand: string[]; // card categories (private)
  bag: string[]; // card categories in bag (private until revealed)
  bagLocked: boolean;
  marketLegal: string[]; // legal cards in market (public at end)
  marketContraband: string[]; // contraband cards in market (public at end)
  gold: number;
}

// ─── Room Config ──────────────────────────────────────────────────────────────
export interface SheriffRoomConfig {
  maxPlayers: number;
  totalRounds?: number;
  enableRoyalGoods?: boolean;
}
