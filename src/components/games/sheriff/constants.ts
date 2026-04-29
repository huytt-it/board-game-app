import type {
  CardCategory,
  CardType,
  LegalCategory,
  ContrabandCategory,
  RoyalCategory,
  SheriffPlayerData,
  PlayerFinalScore,
} from './types';
import type { Player } from '@/types/player';

// ─── Card Definition ──────────────────────────────────────────────────────────
export interface CardDef {
  category: CardCategory;
  type: CardType;
  value: number;
  penalty: number;
  count: number;
  countsAs?: LegalCategory;
  icon: string;
  name: string;
  nameVI: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  glowClass: string;
}

// ─── Card Definitions ─────────────────────────────────────────────────────────
export const CARD_DEFS: Record<CardCategory, CardDef> = {
  // ── Legal goods
  apple: {
    category: 'apple', type: 'legal', value: 2, penalty: 2, count: 48,
    icon: '🍎', name: 'Apple', nameVI: 'Táo',
    bgClass: 'bg-red-500/20', borderClass: 'border-red-500/40',
    textClass: 'text-red-300', glowClass: 'shadow-red-500/30',
  },
  cheese: {
    category: 'cheese', type: 'legal', value: 3, penalty: 2, count: 36,
    icon: '🧀', name: 'Cheese', nameVI: 'Phô mai',
    bgClass: 'bg-yellow-500/20', borderClass: 'border-yellow-500/40',
    textClass: 'text-yellow-300', glowClass: 'shadow-yellow-500/30',
  },
  bread: {
    category: 'bread', type: 'legal', value: 3, penalty: 2, count: 36,
    icon: '🍞', name: 'Bread', nameVI: 'Bánh mì',
    bgClass: 'bg-amber-500/20', borderClass: 'border-amber-500/40',
    textClass: 'text-amber-300', glowClass: 'shadow-amber-500/30',
  },
  chicken: {
    category: 'chicken', type: 'legal', value: 4, penalty: 2, count: 24,
    icon: '🐔', name: 'Chicken', nameVI: 'Gà',
    bgClass: 'bg-orange-500/20', borderClass: 'border-orange-500/40',
    textClass: 'text-orange-300', glowClass: 'shadow-orange-500/30',
  },

  // ── Contraband
  pepper: {
    category: 'pepper', type: 'contraband', value: 6, penalty: 4, count: 22,
    icon: '🌶️', name: 'Pepper', nameVI: 'Tiêu',
    bgClass: 'bg-rose-600/20', borderClass: 'border-rose-500/40',
    textClass: 'text-rose-300', glowClass: 'shadow-rose-500/30',
  },
  mead: {
    category: 'mead', type: 'contraband', value: 7, penalty: 4, count: 21,
    icon: '🍯', name: 'Mead', nameVI: 'Rượu mật ong',
    bgClass: 'bg-amber-700/20', borderClass: 'border-amber-600/40',
    textClass: 'text-amber-400', glowClass: 'shadow-amber-600/30',
  },
  silk: {
    category: 'silk', type: 'contraband', value: 8, penalty: 4, count: 12,
    icon: '🧵', name: 'Silk', nameVI: 'Lụa',
    bgClass: 'bg-purple-600/20', borderClass: 'border-purple-500/40',
    textClass: 'text-purple-300', glowClass: 'shadow-purple-500/30',
  },
  crossbow: {
    category: 'crossbow', type: 'contraband', value: 9, penalty: 4, count: 5,
    icon: '🏹', name: 'Crossbow', nameVI: 'Nỏ',
    bgClass: 'bg-slate-600/20', borderClass: 'border-slate-500/40',
    textClass: 'text-slate-300', glowClass: 'shadow-slate-500/30',
  },

  // ── Royal goods
  green_apple: {
    category: 'green_apple', type: 'royal', value: 2, penalty: 4, count: 2,
    countsAs: 'apple',
    icon: '🍏', name: 'Green Apple', nameVI: 'Táo xanh',
    bgClass: 'bg-green-600/20', borderClass: 'border-green-500/40',
    textClass: 'text-green-300', glowClass: 'shadow-green-500/30',
  },
  golden_apple: {
    category: 'golden_apple', type: 'royal', value: 2, penalty: 4, count: 2,
    countsAs: 'apple',
    icon: '✨', name: 'Golden Apple', nameVI: 'Táo vàng',
    bgClass: 'bg-yellow-600/20', borderClass: 'border-yellow-400/40',
    textClass: 'text-yellow-200', glowClass: 'shadow-yellow-400/30',
  },
  gouda_cheese: {
    category: 'gouda_cheese', type: 'royal', value: 3, penalty: 4, count: 2,
    countsAs: 'cheese',
    icon: '🏅', name: 'Gouda Cheese', nameVI: 'Phô mai Gouda',
    bgClass: 'bg-yellow-700/20', borderClass: 'border-yellow-600/40',
    textClass: 'text-yellow-300', glowClass: 'shadow-yellow-600/30',
  },
  bleu_cheese: {
    category: 'bleu_cheese', type: 'royal', value: 3, penalty: 4, count: 1,
    countsAs: 'cheese',
    icon: '💎', name: 'Bleu Cheese', nameVI: 'Phô mai Bleu',
    bgClass: 'bg-blue-600/20', borderClass: 'border-blue-500/40',
    textClass: 'text-blue-300', glowClass: 'shadow-blue-500/30',
  },
  rye_bread: {
    category: 'rye_bread', type: 'royal', value: 3, penalty: 4, count: 2,
    countsAs: 'bread',
    icon: '🥖', name: 'Rye Bread', nameVI: 'Bánh mì đen',
    bgClass: 'bg-amber-800/20', borderClass: 'border-amber-700/40',
    textClass: 'text-amber-400', glowClass: 'shadow-amber-700/30',
  },
  pumpernickel_bread: {
    category: 'pumpernickel_bread', type: 'royal', value: 3, penalty: 4, count: 1,
    countsAs: 'bread',
    icon: '🍫', name: 'Pumpernickel', nameVI: 'Bánh Pumpernickel',
    bgClass: 'bg-stone-600/20', borderClass: 'border-stone-500/40',
    textClass: 'text-stone-300', glowClass: 'shadow-stone-500/30',
  },
  royal_rooster: {
    category: 'royal_rooster', type: 'royal', value: 4, penalty: 4, count: 2,
    countsAs: 'chicken',
    icon: '🐓', name: 'Royal Rooster', nameVI: 'Gà trống hoàng gia',
    bgClass: 'bg-orange-700/20', borderClass: 'border-orange-600/40',
    textClass: 'text-orange-300', glowClass: 'shadow-orange-600/30',
  },
};

// ─── Grouped lists ────────────────────────────────────────────────────────────
export const LEGAL_GOODS: LegalCategory[] = ['apple', 'cheese', 'bread', 'chicken'];
export const CONTRABAND_GOODS: ContrabandCategory[] = ['pepper', 'mead', 'silk', 'crossbow'];
export const ROYAL_GOODS: RoyalCategory[] = [
  'green_apple', 'golden_apple', 'gouda_cheese', 'bleu_cheese',
  'rye_bread', 'pumpernickel_bread', 'royal_rooster',
];

// ─── King/Queen Bonuses ───────────────────────────────────────────────────────
export const KING_QUEEN_BONUS: Record<LegalCategory, { king: number; queen: number }> = {
  apple:   { king: 20, queen: 10 },
  cheese:  { king: 15, queen: 10 },
  bread:   { king: 15, queen: 10 },
  chicken: { king: 10, queen: 5 },
};

// ─── Game Config ──────────────────────────────────────────────────────────────
export const STARTING_GOLD = 50;
export const HAND_SIZE = 6;
export const MAX_BAG_SIZE = 5;
export const MIN_BAG_SIZE = 1;

export const DEFAULT_ROUNDS_BY_COUNT: Record<number, number> = {
  3: 3, 4: 2, 5: 2, 6: 2,
};

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 6;

// ─── Deck Utilities ───────────────────────────────────────────────────────────
export function createDeck(includeRoyal = true): string[] {
  const deck: string[] = [];
  const categories = includeRoyal
    ? (Object.keys(CARD_DEFS) as CardCategory[])
    : [...LEGAL_GOODS, ...CONTRABAND_GOODS];

  for (const cat of categories) {
    const def = CARD_DEFS[cat];
    for (let i = 0; i < def.count; i++) {
      deck.push(cat);
    }
  }
  return deck;
}

export function shuffleDeck<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Player Data Helpers ──────────────────────────────────────────────────────
export function readPlayerData(player: Player | undefined): SheriffPlayerData {
  const d = (player?.gameData ?? {}) as Partial<SheriffPlayerData>;
  return {
    hand: d.hand ?? [],
    bag: d.bag ?? [],
    bagLocked: d.bagLocked ?? false,
    marketLegal: d.marketLegal ?? [],
    marketContraband: d.marketContraband ?? [],
    gold: d.gold ?? STARTING_GOLD,
  };
}

// ─── Scoring Logic ────────────────────────────────────────────────────────────
export function computeFinalScores(
  players: Player[],
  sheriffPlayerId: string,
): PlayerFinalScore[] {
  void sheriffPlayerId; // all players score, sheriff included

  // Collect category counts per player
  const categoryCounts: Record<string, Record<LegalCategory, number>> = {};
  const scores: PlayerFinalScore[] = [];

  for (const player of players) {
    const data = readPlayerData(player);
    const counts: Record<LegalCategory, number> = { apple: 0, cheese: 0, bread: 0, chicken: 0 };
    let legalValue = 0;
    let contrabandValue = 0;
    let royalValue = 0;

    const allMarket = [...data.marketLegal, ...data.marketContraband];
    for (const cat of allMarket) {
      const def = CARD_DEFS[cat as CardCategory];
      if (!def) continue;
      if (def.type === 'legal') {
        legalValue += def.value;
        counts[cat as LegalCategory] = (counts[cat as LegalCategory] ?? 0) + 1;
      } else if (def.type === 'contraband') {
        contrabandValue += def.value;
      } else if (def.type === 'royal') {
        royalValue += def.value;
        const countsAs = def.countsAs as LegalCategory;
        if (countsAs) counts[countsAs] = (counts[countsAs] ?? 0) + 1;
      }
    }

    categoryCounts[player.id] = counts;
    scores.push({
      playerId: player.id,
      playerName: player.name,
      gold: data.gold,
      legalValue,
      contrabandValue,
      royalValue,
      kingBonus: 0,
      queenBonus: 0,
      total: 0,
      appleCount: counts.apple,
      cheeseCount: counts.cheese,
      breadCount: counts.bread,
      chickenCount: counts.chicken,
    });
  }

  // Assign King/Queen bonuses
  for (const cat of LEGAL_GOODS) {
    const sorted = [...players]
      .map((p) => ({ id: p.id, count: categoryCounts[p.id]?.[cat] ?? 0 }))
      .sort((a, b) => b.count - a.count);

    if (sorted.length > 0 && sorted[0].count > 0) {
      const kingEntry = scores.find((s) => s.playerId === sorted[0].id);
      if (kingEntry) kingEntry.kingBonus += KING_QUEEN_BONUS[cat].king;
    }
    if (sorted.length > 1 && sorted[1].count > 0) {
      const queenEntry = scores.find((s) => s.playerId === sorted[1].id);
      if (queenEntry) queenEntry.queenBonus += KING_QUEEN_BONUS[cat].queen;
    }
  }

  // Compute totals
  for (const s of scores) {
    s.total = s.gold + s.legalValue + s.contrabandValue + s.royalValue + s.kingBonus + s.queenBonus;
  }

  return scores.sort((a, b) => b.total - a.total);
}

// ─── Phase Labels ─────────────────────────────────────────────────────────────
export const PHASE_LABELS: Record<string, string> = {
  market:        '🛒 Đổi hàng',
  load_bag:      '👝 Đóng túi',
  declare:       '📣 Khai báo',
  inspect:       '🔍 Kiểm tra',
  end_round:     '🔔 Kết vòng',
  final_scoring: '🏆 Tính điểm',
};
