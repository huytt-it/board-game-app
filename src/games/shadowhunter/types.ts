// ─── Enums / Aliases ─────────────────────────────────────────────────────────
export type SHFaction = 'HUNTER' | 'SHADOW' | 'NEUTRAL';

export type SHArea =
  | 'HERMIT_CABIN'
  | 'UNDERWORLD_GATE'
  | 'CHURCH'
  | 'CEMETERY'
  | 'WEIRD_WOODS'
  | 'ERSTWHILE_ALTAR';

export type SHCardDeck = 'WHITE' | 'BLACK' | 'HERMIT';
export type SHCardSubtype = 'SINGLE_USE' | 'EQUIPMENT';

export type SHTurnPhase =
  | 'ROLL'            // current player rolls dice
  | 'CHOOSE_AREA'     // roll = 7 or Emi teleport — choose area
  | 'AREA_ACTION'     // decide whether to use area action
  | 'CARD_RESOLVE'    // card drawn and pending target selection
  | 'GIVE_HERMIT'     // giver selects who to give hermit card to
  | 'RESOLVE_HERMIT'  // receiver resolves hermit card effect
  | 'ATTACK'          // decide whether to attack
  | 'ATTACK_TARGET'   // selecting attack target
  | 'SKILL_RESOLVE'   // a skill effect needs player input (Werewolf counter, etc.)
  | 'GAME_OVER';

// ─── Card Definition ──────────────────────────────────────────────────────────
export interface SHCardDef {
  id: string;
  name: string;
  nameVI: string;
  deck: SHCardDeck;
  subtype: SHCardSubtype;
  effectId: string;
  description: string;
  copies: number;
  expansion?: boolean;
  icon: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

// ─── Character Definition ─────────────────────────────────────────────────────
export interface SHCharacterDef {
  id: string;
  name: string;
  faction: SHFaction;
  hp: number;
  skillId: string;
  skillName: string;
  skillDescription: string;
  skillTiming: string;
  skillUsage: string;
  winConditionId: string;
  winCondition: string;
  expansion: boolean;
  winConditionByPlayerCount?: Record<string, number>;
  icon: string;
  bgClass: string;
  borderClass: string;
}

// ─── Per-player PUBLIC state (stored in room.gameState.players) ───────────────
export interface SHPublicPlayerState {
  playerId: string;
  damage: number;
  area: SHArea | null;
  isAlive: boolean;
  revealed: boolean;
  characterId?: string;       // visible only after reveal or death
  maxHp?: number;             // visible only after reveal or death
  faction?: SHFaction;        // visible only after reveal or death
  equipment: string[];        // card IDs (public equipment)
  usedSkill: boolean;
  immuneToAttack: boolean;
  extraTurnCount: number;
  // Fuka's delayed effect
  fukaTargetNextTurn?: boolean;
  // Neutral win condition auxiliary flags
  bryanWon?: boolean;
  charlesKilled?: boolean;
  agnesWon?: boolean;
}

// ─── Pending hermit card flow ─────────────────────────────────────────────────
export interface SHPendingHermit {
  cardId: string;
  giverPlayerId: string;
  receiverPlayerId: string;
}

// ─── Pending card/skill effect requiring target input ─────────────────────────
export interface SHPendingEffect {
  type: 'CARD' | 'SKILL' | 'AREA_WEIRD_WOODS' | 'AREA_ALTAR' | 'WEREWOLF_COUNTER';
  actorPlayerId: string;
  cardId?: string;
  skillId?: string;
  // for AREA_WEIRD_WOODS: 'DAMAGE' | 'HEAL' choice made
  weirdWoodsChoice?: 'DAMAGE' | 'HEAL';
  // for AREA_ALTAR, MOODY_GOBLIN: target's equipment list shown for stealing
  stealTargetPlayerId?: string;
  // Werewolf counter: who attacked the werewolf
  attackerPlayerId?: string;
}

// ─── Log entry ────────────────────────────────────────────────────────────────
export interface SHLogEntry {
  ts: number;
  type: 'ACTION' | 'DAMAGE' | 'HEAL' | 'DEATH' | 'REVEAL' | 'CARD' | 'SKILL' | 'WIN' | 'SYSTEM';
  msg: string;
}

// ─── Main game state (stored in room.gameState as unknown as SHGameState) ─────
export interface SHGameState {
  // Turn management
  turnPhase: SHTurnPhase;
  currentTurnPlayerId: string;
  turnOrder: string[];          // player IDs in seat order

  // Decks (contents visible in DB but not shown in UI)
  decks: { white: string[]; black: string[]; hermit: string[] };
  discards: { white: string[]; black: string[]; hermit: string[] };

  // Per-player public states
  players: Record<string, SHPublicPlayerState>;

  // Last dice roll
  lastRoll: { d4: number; d6: number; total: number } | null;

  // Pending hermit card
  pendingHermit: SHPendingHermit | null;

  // Pending effect requiring player input
  pendingEffect: SHPendingEffect | null;

  // Result
  winnerIds: string[];

  // Public character reveal at game end: playerId → characterId
  revealedAll: Record<string, string>;

  // Game log
  log: SHLogEntry[];
}

// ─── Private player data (stored in player.gameData) ─────────────────────────
export interface SHPlayerData {
  characterId: string;
  faction: SHFaction;
  maxHp: number;
  usedSkill: boolean;
  // Hermit card the current player drew (only visible to them)
  drawnHermitCardId?: string;
  // Hermit card given to this player (receiver sees it to resolve)
  pendingHermitCardId?: string;
  // Index signature for compatibility with BaseGameData
  [key: string]: unknown;
}
