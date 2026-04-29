import type { Room } from '@/types/room';
import type { Player } from '@/types/player';
import type {
  SHCharacterDef,
  SHCardDef,
  SHArea,
  SHFaction,
  SHGameState,
  SHPlayerData,
  SHPublicPlayerState,
} from './types';

// ─── Dice ─────────────────────────────────────────────────────────────────────
export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Area Definitions ─────────────────────────────────────────────────────────
export const AREAS: Record<SHArea, { id: SHArea; name: string; nameVI: string; rollValues: number[]; group: 1 | 2 | 3; effectId: string; icon: string; description: string }> = {
  HERMIT_CABIN: {
    id: 'HERMIT_CABIN', name: "Hermit's Cabin", nameVI: 'Lều Ẩn Sĩ',
    rollValues: [2, 3], group: 1, effectId: 'DRAW_HERMIT_AND_GIVE', icon: '🏚️',
    description: 'Rút 1 Hermit Card, đọc bí mật rồi đưa cho người chơi khác xử lý.',
  },
  UNDERWORLD_GATE: {
    id: 'UNDERWORLD_GATE', name: 'Underworld Gate', nameVI: 'Cổng Địa Ngục',
    rollValues: [4, 5], group: 1, effectId: 'DRAW_ANY_DECK', icon: '🌀',
    description: 'Chọn rút 1 lá từ White, Black hoặc Hermit deck.',
  },
  CHURCH: {
    id: 'CHURCH', name: 'Church', nameVI: 'Nhà Thờ',
    rollValues: [6], group: 2, effectId: 'DRAW_WHITE', icon: '⛪',
    description: 'Rút 1 White Card.',
  },
  CEMETERY: {
    id: 'CEMETERY', name: 'Cemetery', nameVI: 'Nghĩa Địa',
    rollValues: [8], group: 2, effectId: 'DRAW_BLACK', icon: '⚰️',
    description: 'Rút 1 Black Card.',
  },
  WEIRD_WOODS: {
    id: 'WEIRD_WOODS', name: 'Weird Woods', nameVI: 'Rừng Ma',
    rollValues: [9], group: 3, effectId: 'DAMAGE_OR_HEAL', icon: '🌲',
    description: 'Chọn 1 người chơi: gây 2 damage hoặc hồi 1 damage.',
  },
  ERSTWHILE_ALTAR: {
    id: 'ERSTWHILE_ALTAR', name: 'Erstwhile Altar', nameVI: 'Bàn Thờ Cũ',
    rollValues: [10], group: 3, effectId: 'STEAL_EQUIPMENT', icon: '🗿',
    description: 'Cướp 1 Equipment Card từ người chơi khác.',
  },
};

export const AREA_LIST = Object.values(AREAS);
export const AREA_GROUP: Record<SHArea, 1 | 2 | 3> = {
  HERMIT_CABIN: 1, UNDERWORLD_GATE: 1,
  CHURCH: 2, CEMETERY: 2,
  WEIRD_WOODS: 3, ERSTWHILE_ALTAR: 3,
};

export function getAreaFromRoll(total: number): SHArea | null {
  for (const area of AREA_LIST) {
    if (area.rollValues.includes(total)) return area.id;
  }
  return null;
}

// ─── Player Distribution ──────────────────────────────────────────────────────
export const PLAYER_DISTRIBUTION: Record<number, { hunters: number; shadows: number; neutrals: number }> = {
  4: { hunters: 2, shadows: 2, neutrals: 0 },
  5: { hunters: 2, shadows: 2, neutrals: 1 },
  6: { hunters: 2, shadows: 2, neutrals: 2 },
  7: { hunters: 2, shadows: 2, neutrals: 3 },
  8: { hunters: 3, shadows: 3, neutrals: 2 },
};

// ─── Character Definitions ────────────────────────────────────────────────────
export const CHARACTERS: SHCharacterDef[] = [
  // ── Base Neutral
  {
    id: 'ALLIE', name: 'Allie', faction: 'NEUTRAL', hp: 8, expansion: false,
    skillId: 'ALLIE_FULL_HEAL', skillName: "Mother's Love",
    skillDescription: 'Một lần trong game: sau khi reveal, hồi toàn bộ damage về 0.',
    skillTiming: 'ANYTIME', skillUsage: 'ONCE_PER_GAME',
    winConditionId: 'ALLIE_SURVIVE', winCondition: 'Thắng nếu còn sống khi game kết thúc.',
    icon: '👩', bgClass: 'bg-gray-700', borderClass: 'border-gray-400',
  },
  {
    id: 'BOB', name: 'Bob', faction: 'NEUTRAL', hp: 10, expansion: false,
    skillId: 'BOB_STEAL_OR_KILL_LOOT', skillName: 'Robbery',
    skillDescription: '4–6 người: khi attack sắp gây ≥2 damage, có thể cướp 1 Equipment thay vì gây damage. 7–8 người: khi giết, lấy hết Equipment của họ.',
    skillTiming: 'ON_ATTACK_DAMAGE', skillUsage: 'PASSIVE_AFTER_REVEAL',
    winConditionId: 'BOB_COLLECT_EQUIPMENT',
    winCondition: 'Thắng khi có ≥4 Equipment (4–6 người) hoặc ≥5 Equipment (7–8 người).',
    winConditionByPlayerCount: { '4': 4, '5': 4, '6': 4, '7': 5, '8': 5 },
    icon: '🧔', bgClass: 'bg-gray-700', borderClass: 'border-gray-400',
  },
  {
    id: 'CHARLES', name: 'Charles', faction: 'NEUTRAL', hp: 11, expansion: false,
    skillId: 'CHARLES_EXTRA_ATTACK', skillName: 'Bloody Feast',
    skillDescription: 'Sau khi attack, có thể tự nhận 2 damage để attack thêm một lần nữa.',
    skillTiming: 'AFTER_ATTACK', skillUsage: 'REPEATABLE_AFTER_REVEAL',
    winConditionId: 'CHARLES_KILL_AFTER_THREE_DEATHS',
    winCondition: 'Thắng nếu tự tay giết 1 người khi tổng số người chết đã ≥ 3.',
    icon: '🔪', bgClass: 'bg-gray-700', borderClass: 'border-gray-400',
  },
  {
    id: 'DANIEL', name: 'Daniel', faction: 'NEUTRAL', hp: 13, expansion: false,
    skillId: 'DANIEL_AUTO_REVEAL', skillName: 'Scream',
    skillDescription: 'Khi bất kỳ ai chết, Daniel phải reveal. Không thể tự reveal lúc khác.',
    skillTiming: 'ON_ANY_DEATH', skillUsage: 'MANDATORY',
    winConditionId: 'DANIEL_FIRST_DEAD_OR_HUNTER_WIN',
    winCondition: 'Thắng nếu là người chết đầu tiên, hoặc còn sống khi phe Hunter thắng.',
    icon: '😱', bgClass: 'bg-gray-700', borderClass: 'border-gray-400',
  },
  // ── Base Hunter
  {
    id: 'EMI', name: 'Emi', faction: 'HUNTER', hp: 10, expansion: false,
    skillId: 'EMI_ADJACENT_MOVE', skillName: 'Teleport',
    skillDescription: 'Khi di chuyển, có thể chọn không roll mà đi sang area liền kề.',
    skillTiming: 'MOVEMENT_PHASE', skillUsage: 'PASSIVE_AFTER_REVEAL',
    winConditionId: 'HUNTER_WIN', winCondition: 'Thắng khi tất cả Shadow chết.',
    icon: '⚡', bgClass: 'bg-blue-900', borderClass: 'border-blue-500',
  },
  {
    id: 'FRANKLIN', name: 'Franklin', faction: 'HUNTER', hp: 12, expansion: false,
    skillId: 'FRANKLIN_D6_DAMAGE', skillName: 'Lightning',
    skillDescription: 'Một lần trong game: đầu lượt, reveal và chọn 1 người, gây damage bằng 1d6.',
    skillTiming: 'TURN_START', skillUsage: 'ONCE_PER_GAME',
    winConditionId: 'HUNTER_WIN', winCondition: 'Thắng khi tất cả Shadow chết.',
    icon: '⚔️', bgClass: 'bg-blue-900', borderClass: 'border-blue-500',
  },
  {
    id: 'GEORGE', name: 'George', faction: 'HUNTER', hp: 14, expansion: false,
    skillId: 'GEORGE_D4_DAMAGE', skillName: 'Demolish',
    skillDescription: 'Một lần trong game: đầu lượt, reveal và chọn 1 người, gây damage bằng 1d4.',
    skillTiming: 'TURN_START', skillUsage: 'ONCE_PER_GAME',
    winConditionId: 'HUNTER_WIN', winCondition: 'Thắng khi tất cả Shadow chết.',
    icon: '🛡️', bgClass: 'bg-blue-900', borderClass: 'border-blue-500',
  },
  // ── Base Shadow
  {
    id: 'UNKNOWN', name: 'Unknown', faction: 'SHADOW', hp: 11, expansion: false,
    skillId: 'UNKNOWN_LIE_HERMIT', skillName: 'Deceit',
    skillDescription: 'Khi nhận Hermit Card, có thể nói dối kết quả. Không cần reveal để dùng skill này.',
    skillTiming: 'WHEN_RECEIVING_HERMIT', skillUsage: 'PASSIVE_NO_REVEAL_REQUIRED',
    winConditionId: 'SHADOW_WIN', winCondition: 'Thắng khi tất cả Hunter chết hoặc ≥3 Neutral chết.',
    icon: '❓', bgClass: 'bg-red-900', borderClass: 'border-red-500',
  },
  {
    id: 'VAMPIRE', name: 'Vampire', faction: 'SHADOW', hp: 13, expansion: false,
    skillId: 'VAMPIRE_HEAL_ON_ATTACK', skillName: 'Suck Blood',
    skillDescription: 'Khi attack gây damage thành công, hồi 2 damage cho bản thân.',
    skillTiming: 'AFTER_SUCCESSFUL_ATTACK', skillUsage: 'PASSIVE_AFTER_REVEAL',
    winConditionId: 'SHADOW_WIN', winCondition: 'Thắng khi tất cả Hunter chết hoặc ≥3 Neutral chết.',
    icon: '🧛', bgClass: 'bg-red-900', borderClass: 'border-red-500',
  },
  {
    id: 'WEREWOLF', name: 'Werewolf', faction: 'SHADOW', hp: 14, expansion: false,
    skillId: 'WEREWOLF_COUNTERATTACK', skillName: 'Counterattack',
    skillDescription: 'Sau khi bị attack (còn sống), có thể phản công ngay người vừa đánh.',
    skillTiming: 'AFTER_BEING_ATTACKED', skillUsage: 'PASSIVE_AFTER_REVEAL',
    winConditionId: 'SHADOW_WIN', winCondition: 'Thắng khi tất cả Hunter chết hoặc ≥3 Neutral chết.',
    icon: '🐺', bgClass: 'bg-red-900', borderClass: 'border-red-500',
  },
  // ── Expansion Neutral
  {
    id: 'AGNES', name: 'Agnes', faction: 'NEUTRAL', hp: 8, expansion: true,
    skillId: 'AGNES_SWITCH_TARGET', skillName: 'Capricious Love',
    skillDescription: 'Đầu lượt: có thể đổi điều kiện thắng sang người ngồi bên trái (hiệu lực vĩnh viễn).',
    skillTiming: 'TURN_START', skillUsage: 'AFTER_REVEAL',
    winConditionId: 'AGNES_TARGET_PLAYER_WINS',
    winCondition: 'Thắng nếu người ngồi bên phải (lúc đầu game) thắng.',
    icon: '💕', bgClass: 'bg-gray-700', borderClass: 'border-gray-400',
  },
  {
    id: 'BRYAN', name: 'Bryan', faction: 'NEUTRAL', hp: 10, expansion: true,
    skillId: 'BRYAN_REVEAL_ON_SMALL_KILL', skillName: 'My Pace',
    skillDescription: 'Nếu giết nhân vật có HP gốc ≤ 12, phải reveal.',
    skillTiming: 'ON_KILL', skillUsage: 'MANDATORY',
    winConditionId: 'BRYAN_KILL_HIGH_HP_OR_ALTAR',
    winCondition: 'Thắng nếu giết nhân vật HP gốc ≥ 13, hoặc đang ở Erstwhile Altar khi game kết thúc.',
    icon: '🎯', bgClass: 'bg-gray-700', borderClass: 'border-gray-400',
  },
  {
    id: 'CATHERINE', name: 'Catherine', faction: 'NEUTRAL', hp: 11, expansion: true,
    skillId: 'CATHERINE_HEAL_EACH_TURN', skillName: 'Stigmata',
    skillDescription: 'Đầu lượt của mình (sau khi reveal): hồi 1 damage.',
    skillTiming: 'TURN_START', skillUsage: 'PASSIVE_AFTER_REVEAL',
    winConditionId: 'CATHERINE_FIRST_DEAD_OR_FINAL_TWO',
    winCondition: 'Thắng nếu là người chết đầu tiên, hoặc là 1 trong 2 người cuối còn sống.',
    icon: '✝️', bgClass: 'bg-gray-700', borderClass: 'border-gray-400',
  },
  {
    id: 'DAVID', name: 'David', faction: 'NEUTRAL', hp: 13, expansion: true,
    skillId: 'DAVID_TAKE_DEAD_EQUIPMENT', skillName: 'Grave Robber',
    skillDescription: 'Một lần trong game: lấy 1 Equipment từ người đã chết.',
    skillTiming: 'ANYTIME_ON_TURN', skillUsage: 'ONCE_PER_GAME_AFTER_REVEAL',
    winConditionId: 'DAVID_COLLECT_SPECIFIC_EQUIPMENT',
    winCondition: 'Thắng nếu sở hữu ≥ 3 trong 4 Equipment: Talisman, Spear of Longinus, Holy Robe, Silver Rosary.',
    icon: '⚰️', bgClass: 'bg-gray-700', borderClass: 'border-gray-400',
  },
  // ── Expansion Hunter
  {
    id: 'ELLEN', name: 'Ellen', faction: 'HUNTER', hp: 10, expansion: true,
    skillId: 'ELLEN_DISABLE_SKILL', skillName: 'Seal',
    skillDescription: 'Một lần trong game: vô hiệu hóa vĩnh viễn skill của 1 nhân vật đã reveal (không ảnh hưởng Unknown).',
    skillTiming: 'ANYTIME_ON_TURN', skillUsage: 'ONCE_PER_GAME_AFTER_REVEAL',
    winConditionId: 'HUNTER_WIN', winCondition: 'Thắng khi tất cả Shadow chết.',
    icon: '🔒', bgClass: 'bg-blue-900', borderClass: 'border-blue-500',
  },
  {
    id: 'FUKA', name: 'Fu-ka', faction: 'HUNTER', hp: 12, expansion: true,
    skillId: 'FUKA_SET_DAMAGE_NEXT_TURN', skillName: 'Dynamite Nurse',
    skillDescription: 'Một lần trong game: chọn 1 người. Đầu lượt tiếp theo của mình, đặt damage của người đó thành 7.',
    skillTiming: 'ANYTIME_ON_TURN', skillUsage: 'ONCE_PER_GAME_AFTER_REVEAL',
    winConditionId: 'HUNTER_WIN', winCondition: 'Thắng khi tất cả Shadow chết.',
    icon: '💉', bgClass: 'bg-blue-900', borderClass: 'border-blue-500',
  },
  {
    id: 'GREGOR', name: 'Gregor', faction: 'HUNTER', hp: 14, expansion: true,
    skillId: 'GREGOR_TEMPORARY_IMMUNITY', skillName: 'Barricade',
    skillDescription: 'Một lần trong game: không nhận damage cho đến đầu lượt tiếp theo của mình.',
    skillTiming: 'ANYTIME_ON_TURN', skillUsage: 'ONCE_PER_GAME_AFTER_REVEAL',
    winConditionId: 'HUNTER_WIN', winCondition: 'Thắng khi tất cả Shadow chết.',
    icon: '🏰', bgClass: 'bg-blue-900', borderClass: 'border-blue-500',
  },
  // ── Expansion Shadow
  {
    id: 'ULTRA_SOUL', name: 'Ultra Soul', faction: 'SHADOW', hp: 11, expansion: true,
    skillId: 'ULTRA_SOUL_DAMAGE_UNDERWORLD', skillName: 'Soul Attack',
    skillDescription: 'Đầu lượt (sau khi reveal): gây 3 damage cho 1 người đang ở Underworld Gate.',
    skillTiming: 'TURN_START', skillUsage: 'AFTER_REVEAL',
    winConditionId: 'SHADOW_WIN', winCondition: 'Thắng khi tất cả Hunter chết hoặc ≥3 Neutral chết.',
    icon: '👻', bgClass: 'bg-red-900', borderClass: 'border-red-500',
  },
  {
    id: 'VALKYRIE', name: 'Valkyrie', faction: 'SHADOW', hp: 13, expansion: true,
    skillId: 'VALKYRIE_D4_ATTACK', skillName: 'Spear Mastery',
    skillDescription: 'Khi attack: damage bằng roll 1d4, không bao giờ miss.',
    skillTiming: 'ON_ATTACK', skillUsage: 'PASSIVE_AFTER_REVEAL',
    winConditionId: 'SHADOW_WIN', winCondition: 'Thắng khi tất cả Hunter chết hoặc ≥3 Neutral chết.',
    icon: '🗡️', bgClass: 'bg-red-900', borderClass: 'border-red-500',
  },
  {
    id: 'WIGHT', name: 'Wight', faction: 'SHADOW', hp: 14, expansion: true,
    skillId: 'WIGHT_EXTRA_TURNS', skillName: 'Revenge',
    skillDescription: 'Một lần trong game: cuối lượt (sau khi reveal), nhận thêm số lượt bằng số người đã chết.',
    skillTiming: 'TURN_END', skillUsage: 'ONCE_PER_GAME_AFTER_REVEAL',
    winConditionId: 'SHADOW_WIN', winCondition: 'Thắng khi tất cả Hunter chết hoặc ≥3 Neutral chết.',
    icon: '💀', bgClass: 'bg-red-900', borderClass: 'border-red-500',
  },
];

export const CHARACTER_MAP: Record<string, SHCharacterDef> =
  Object.fromEntries(CHARACTERS.map(c => [c.id, c]));

// ─── Card Definitions ─────────────────────────────────────────────────────────
export const CARDS: SHCardDef[] = [
  // ── White Single-use
  { id: 'WHITE_ADVENT', name: 'Advent', nameVI: 'Giáng Thế', deck: 'WHITE', subtype: 'SINGLE_USE', effectId: 'HUNTER_FULL_HEAL', copies: 1, icon: '✨', description: 'Nếu là Hunter: reveal và hồi damage về 0.', bgClass: 'bg-yellow-900', borderClass: 'border-yellow-400', textClass: 'text-yellow-200' },
  { id: 'WHITE_BLESSING', name: 'Blessing', nameVI: 'Phước Lành', deck: 'WHITE', subtype: 'SINGLE_USE', effectId: 'TARGET_HEAL_D6', copies: 1, icon: '🙏', description: 'Chọn 1 người, roll 1d6 — người đó hồi số damage bằng kết quả.', bgClass: 'bg-yellow-900', borderClass: 'border-yellow-400', textClass: 'text-yellow-200' },
  { id: 'WHITE_CONCEALED_KNOWLEDGE', name: 'Concealed Knowledge', nameVI: 'Tri Thức Bí Ẩn', deck: 'WHITE', subtype: 'SINGLE_USE', effectId: 'GAIN_EXTRA_TURN', copies: 1, icon: '📜', description: 'Sau lượt này, bạn được chơi thêm 1 lượt nữa.', bgClass: 'bg-yellow-900', borderClass: 'border-yellow-400', textClass: 'text-yellow-200' },
  { id: 'WHITE_FIRST_AID', name: 'First Aid', nameVI: 'Sơ Cứu', deck: 'WHITE', subtype: 'SINGLE_USE', effectId: 'SET_TARGET_DAMAGE_TO_7', copies: 1, icon: '🩹', description: 'Chọn 1 người, đặt damage của người đó thành 7.', bgClass: 'bg-yellow-900', borderClass: 'border-yellow-400', textClass: 'text-yellow-200' },
  { id: 'WHITE_FLARE_OF_JUDGEMENT', name: 'Flare of Judgement', nameVI: 'Ánh Sáng Phán Xét', deck: 'WHITE', subtype: 'SINGLE_USE', effectId: 'DAMAGE_ALL_OTHERS_2', copies: 1, icon: '💥', description: 'Tất cả người chơi khác nhận 2 damage.', bgClass: 'bg-yellow-900', borderClass: 'border-yellow-400', textClass: 'text-yellow-200' },
  { id: 'WHITE_GUARDIAN_ANGEL', name: 'Guardian Angel', nameVI: 'Thiên Thần Hộ Mệnh', deck: 'WHITE', subtype: 'SINGLE_USE', effectId: 'IMMUNE_TO_ATTACK_UNTIL_NEXT_TURN', copies: 1, icon: '😇', description: 'Không nhận damage từ attack cho đến đầu lượt tiếp theo.', bgClass: 'bg-yellow-900', borderClass: 'border-yellow-400', textClass: 'text-yellow-200' },
  { id: 'WHITE_HOLY_WATER_OF_HEALING', name: 'Holy Water of Healing', nameVI: 'Nước Thánh Chữa Lành', deck: 'WHITE', subtype: 'SINGLE_USE', effectId: 'SELF_HEAL_2', copies: 2, icon: '💧', description: 'Hồi 2 damage cho bản thân.', bgClass: 'bg-yellow-900', borderClass: 'border-yellow-400', textClass: 'text-yellow-200' },
  { id: 'WHITE_CHOCOLATE', name: 'Chocolate', nameVI: 'Sô-cô-la', deck: 'WHITE', subtype: 'SINGLE_USE', effectId: 'NAME_GROUP_FULL_HEAL_A_E_U', copies: 1, expansion: true, icon: '🍫', description: 'Nếu tên nhân vật bắt đầu bằng A, E hoặc U: reveal và hồi damage về 0.', bgClass: 'bg-yellow-900', borderClass: 'border-yellow-400', textClass: 'text-yellow-200' },
  { id: 'WHITE_DISENCHANT_MIRROR', name: 'Disenchant Mirror', nameVI: 'Gương Phá Bùa', deck: 'WHITE', subtype: 'SINGLE_USE', effectId: 'FORCE_REVEAL_NAME_GROUP_V_W', copies: 1, expansion: true, icon: '🪞', description: 'Nếu tên nhân vật bắt đầu bằng V hoặc W: nhân vật đó phải reveal.', bgClass: 'bg-yellow-900', borderClass: 'border-yellow-400', textClass: 'text-yellow-200' },
  // ── White Equipment
  { id: 'WHITE_FORTUNE_BROOCH', name: 'Fortune Brooch', nameVI: 'Trâm May Mắn', deck: 'WHITE', subtype: 'EQUIPMENT', effectId: 'IGNORE_WEIRD_WOODS_DAMAGE', copies: 1, icon: '🪬', description: 'Không nhận damage từ Weird Woods.', bgClass: 'bg-yellow-900', borderClass: 'border-yellow-400', textClass: 'text-yellow-200' },
  { id: 'WHITE_HOLY_ROBE', name: 'Holy Robe', nameVI: 'Áo Thánh', deck: 'WHITE', subtype: 'EQUIPMENT', effectId: 'REDUCE_ATTACK_DAMAGE_DEALT_AND_RECEIVED', copies: 1, icon: '👘', description: 'Gây ít hơn 1 damage khi attack. Nhận ít hơn 1 damage từ attack.', bgClass: 'bg-yellow-900', borderClass: 'border-yellow-400', textClass: 'text-yellow-200' },
  { id: 'WHITE_MYSTIC_COMPASS', name: 'Mystic Compass', nameVI: 'La Bàn Huyền Bí', deck: 'WHITE', subtype: 'EQUIPMENT', effectId: 'ROLL_MOVEMENT_TWICE_CHOOSE_ONE', copies: 1, icon: '🧭', description: 'Khi di chuyển, roll 2 lần và chọn 1 kết quả.', bgClass: 'bg-yellow-900', borderClass: 'border-yellow-400', textClass: 'text-yellow-200' },
  { id: 'WHITE_SILVER_ROSARY', name: 'Silver Rosary', nameVI: 'Tràng Hạt Bạc', deck: 'WHITE', subtype: 'EQUIPMENT', effectId: 'TAKE_ALL_EQUIPMENT_ON_KILL', copies: 1, icon: '📿', description: 'Khi attack giết người, lấy toàn bộ Equipment của họ.', bgClass: 'bg-yellow-900', borderClass: 'border-yellow-400', textClass: 'text-yellow-200' },
  { id: 'WHITE_SPEAR_OF_LONGINUS', name: 'Spear of Longinus', nameVI: 'Giáo Longinus', deck: 'WHITE', subtype: 'EQUIPMENT', effectId: 'HUNTER_REVEAL_ADD_2_ATTACK_DAMAGE', copies: 1, icon: '🔱', description: 'Nếu là Hunter và attack thành công: reveal để gây thêm 2 damage.', bgClass: 'bg-yellow-900', borderClass: 'border-yellow-400', textClass: 'text-yellow-200' },
  { id: 'WHITE_TALISMAN', name: 'Talisman', nameVI: 'Bùa Hộ Mệnh', deck: 'WHITE', subtype: 'EQUIPMENT', effectId: 'IMMUNE_SPECIFIC_BLACK_CARDS', copies: 1, icon: '🔮', description: 'Không nhận damage từ Bloodthirsty Spider, Vampire Bat và Dynamite.', bgClass: 'bg-yellow-900', borderClass: 'border-yellow-400', textClass: 'text-yellow-200' },
  // ── Black Single-use
  { id: 'BLACK_BANANA_PEEL', name: 'Banana Peel', nameVI: 'Vỏ Chuối', deck: 'BLACK', subtype: 'SINGLE_USE', effectId: 'GIVE_EQUIPMENT_OR_SELF_DAMAGE_1', copies: 1, icon: '🍌', description: 'Đưa 1 Equipment cho người khác. Nếu không có Equipment, nhận 1 damage.', bgClass: 'bg-purple-900', borderClass: 'border-purple-500', textClass: 'text-purple-200' },
  { id: 'BLACK_BLOODTHIRSTY_SPIDER', name: 'Bloodthirsty Spider', nameVI: 'Nhện Khát Máu', deck: 'BLACK', subtype: 'SINGLE_USE', effectId: 'TARGET_DAMAGE_2_SELF_DAMAGE_2', copies: 1, icon: '🕷️', description: 'Chọn 1 người: họ nhận 2 damage, bạn cũng nhận 2 damage.', bgClass: 'bg-purple-900', borderClass: 'border-purple-500', textClass: 'text-purple-200' },
  { id: 'BLACK_DIABOLIC_RITUAL', name: 'Diabolic Ritual', nameVI: 'Nghi Lễ Quỷ Dữ', deck: 'BLACK', subtype: 'SINGLE_USE', effectId: 'SHADOW_FULL_HEAL', copies: 1, icon: '🔥', description: 'Nếu là Shadow: reveal và hồi damage về 0.', bgClass: 'bg-purple-900', borderClass: 'border-purple-500', textClass: 'text-purple-200' },
  { id: 'BLACK_DYNAMITE', name: 'Dynamite', nameVI: 'Thuốc Nổ', deck: 'BLACK', subtype: 'SINGLE_USE', effectId: 'ROLL_2D6_DAMAGE_AREA_3', copies: 1, icon: '💣', description: 'Roll 2d6. Tổng khớp area nào → mọi người ở đó nhận 3 damage (Tổng 7 = không có gì).', bgClass: 'bg-purple-900', borderClass: 'border-purple-500', textClass: 'text-purple-200' },
  { id: 'BLACK_MOODY_GOBLIN', name: 'Moody Goblin', nameVI: 'Yêu Tinh Bất Thường', deck: 'BLACK', subtype: 'SINGLE_USE', effectId: 'STEAL_ONE_EQUIPMENT', copies: 2, icon: '👺', description: 'Cướp 1 Equipment từ 1 người bất kỳ.', bgClass: 'bg-purple-900', borderClass: 'border-purple-500', textClass: 'text-purple-200' },
  { id: 'BLACK_SPIRITUAL_DOLL', name: 'Spiritual Doll', nameVI: 'Con Búp Bê Ma', deck: 'BLACK', subtype: 'SINGLE_USE', effectId: 'ROLL_D6_TARGET_OR_SELF_DAMAGE_3', copies: 1, icon: '🪆', description: 'Chọn 1 người, roll 1d6: 1–4 → họ nhận 3 damage; 5–6 → bạn nhận 3 damage.', bgClass: 'bg-purple-900', borderClass: 'border-purple-500', textClass: 'text-purple-200' },
  { id: 'BLACK_VAMPIRE_BAT', name: 'Vampire Bat', nameVI: 'Dơi Ma Cà Rồng', deck: 'BLACK', subtype: 'SINGLE_USE', effectId: 'TARGET_DAMAGE_2_SELF_HEAL_1', copies: 3, icon: '🦇', description: 'Chọn 1 người: họ nhận 2 damage, bạn hồi 1 damage.', bgClass: 'bg-purple-900', borderClass: 'border-purple-500', textClass: 'text-purple-200' },
  // ── Black Equipment
  { id: 'BLACK_BUTCHER_KNIFE', name: 'Butcher Knife', nameVI: 'Dao Mổ', deck: 'BLACK', subtype: 'EQUIPMENT', effectId: 'ADD_1_ATTACK_DAMAGE', copies: 1, icon: '🗡️', description: 'Attack thành công → gây thêm +1 damage.', bgClass: 'bg-purple-900', borderClass: 'border-purple-500', textClass: 'text-purple-200' },
  { id: 'BLACK_CHAINSAW', name: 'Chainsaw', nameVI: 'Cưa Xích', deck: 'BLACK', subtype: 'EQUIPMENT', effectId: 'ADD_1_ATTACK_DAMAGE', copies: 1, icon: '🪚', description: 'Attack thành công → gây thêm +1 damage.', bgClass: 'bg-purple-900', borderClass: 'border-purple-500', textClass: 'text-purple-200' },
  { id: 'BLACK_RUSTED_BROAD_AXE', name: 'Rusted Broad Axe', nameVI: 'Rìu Hai Lưỡi Hoen Rỉ', deck: 'BLACK', subtype: 'EQUIPMENT', effectId: 'ADD_1_ATTACK_DAMAGE', copies: 1, icon: '🪓', description: 'Attack thành công → gây thêm +1 damage.', bgClass: 'bg-purple-900', borderClass: 'border-purple-500', textClass: 'text-purple-200' },
  { id: 'BLACK_HANDGUN', name: 'Handgun', nameVI: 'Súng Ngắn', deck: 'BLACK', subtype: 'EQUIPMENT', effectId: 'ATTACK_ANY_AREA_EXCEPT_CURRENT', copies: 1, icon: '🔫', description: 'Có thể attack người ở bất kỳ area nào, trừ area hiện tại.', bgClass: 'bg-purple-900', borderClass: 'border-purple-500', textClass: 'text-purple-200' },
  { id: 'BLACK_MACHINE_GUN', name: 'Machine Gun', nameVI: 'Súng Máy', deck: 'BLACK', subtype: 'EQUIPMENT', effectId: 'ATTACK_ALL_TARGETS_IN_RANGE', copies: 1, icon: '💥', description: 'Khi attack, đánh tất cả mục tiêu trong tầm. Roll damage 1 lần, áp dụng cho tất cả.', bgClass: 'bg-purple-900', borderClass: 'border-purple-500', textClass: 'text-purple-200' },
  { id: 'BLACK_MASAMUNE', name: 'Masamune', nameVI: 'Kiếm Masamune', deck: 'BLACK', subtype: 'EQUIPMENT', effectId: 'MUST_ATTACK_DAMAGE_D4_NO_MISS', copies: 1, icon: '⚔️', description: 'Bắt buộc attack nếu có thể. Damage = 1d4, không bao giờ miss.', bgClass: 'bg-purple-900', borderClass: 'border-purple-500', textClass: 'text-purple-200' },
  // ── Hermit
  { id: 'HERMIT_AID', name: 'Aid', nameVI: 'Hỗ Trợ', deck: 'HERMIT', subtype: 'SINGLE_USE', effectId: 'IF_HUNTER_HEAL_1_ELSE_IF_FULL_DAMAGE_1', copies: 1, icon: '💊', description: 'Nếu Hunter: hồi 1 damage. Nếu không phải Hunter và damage = 0: nhận 1 damage.', bgClass: 'bg-green-900', borderClass: 'border-green-500', textClass: 'text-green-200' },
  { id: 'HERMIT_ANGER', name: 'Anger', nameVI: 'Tức Giận', deck: 'HERMIT', subtype: 'SINGLE_USE', effectId: 'IF_HUNTER_OR_SHADOW_GIVE_EQUIPMENT_OR_DAMAGE_1', copies: 2, icon: '😡', description: 'Nếu Hunter hoặc Shadow: đưa 1 Equipment cho người rút. Không có Equipment → nhận 1 damage.', bgClass: 'bg-green-900', borderClass: 'border-green-500', textClass: 'text-green-200' },
  { id: 'HERMIT_BLACKMAIL', name: 'Blackmail', nameVI: 'Tống Tiền', deck: 'HERMIT', subtype: 'SINGLE_USE', effectId: 'IF_HUNTER_OR_NEUTRAL_GIVE_EQUIPMENT_OR_DAMAGE_1', copies: 2, icon: '🖤', description: 'Nếu Hunter hoặc Neutral: đưa 1 Equipment cho người rút. Không có Equipment → nhận 1 damage.', bgClass: 'bg-green-900', borderClass: 'border-green-500', textClass: 'text-green-200' },
  { id: 'HERMIT_BULLY', name: 'Bully', nameVI: 'Bắt Nạt', deck: 'HERMIT', subtype: 'SINGLE_USE', effectId: 'IF_LOW_HP_NAME_GROUP_DAMAGE_1', copies: 1, expansion: true, icon: '👊', description: 'Nếu tên nhóm A/B/C/E/U: nhận 1 damage.', bgClass: 'bg-green-900', borderClass: 'border-green-500', textClass: 'text-green-200' },
  { id: 'HERMIT_EXORCISM', name: 'Exorcism', nameVI: 'Trừ Tà', deck: 'HERMIT', subtype: 'SINGLE_USE', effectId: 'IF_SHADOW_DAMAGE_2', copies: 1, icon: '✝️', description: 'Nếu Shadow: nhận 2 damage.', bgClass: 'bg-green-900', borderClass: 'border-green-500', textClass: 'text-green-200' },
  { id: 'HERMIT_GREED', name: 'Greed', nameVI: 'Tham Lam', deck: 'HERMIT', subtype: 'SINGLE_USE', effectId: 'IF_NEUTRAL_OR_SHADOW_GIVE_EQUIPMENT_OR_DAMAGE_1', copies: 2, icon: '💰', description: 'Nếu Neutral hoặc Shadow: đưa 1 Equipment cho người rút. Không có Equipment → nhận 1 damage.', bgClass: 'bg-green-900', borderClass: 'border-green-500', textClass: 'text-green-200' },
  { id: 'HERMIT_HUDDLE', name: 'Huddle', nameVI: 'Tụ Tập', deck: 'HERMIT', subtype: 'SINGLE_USE', effectId: 'IF_SHADOW_HEAL_1_ELSE_IF_FULL_DAMAGE_1', copies: 1, icon: '🤝', description: 'Nếu Shadow: hồi 1 damage. Nếu không phải Shadow và damage = 0: nhận 1 damage.', bgClass: 'bg-green-900', borderClass: 'border-green-500', textClass: 'text-green-200' },
  { id: 'HERMIT_NURTURANCE', name: 'Nurturance', nameVI: 'Chăm Sóc', deck: 'HERMIT', subtype: 'SINGLE_USE', effectId: 'IF_NEUTRAL_HEAL_1_ELSE_IF_FULL_DAMAGE_1', copies: 1, icon: '🌸', description: 'Nếu Neutral: hồi 1 damage. Nếu không phải Neutral và damage = 0: nhận 1 damage.', bgClass: 'bg-green-900', borderClass: 'border-green-500', textClass: 'text-green-200' },
  { id: 'HERMIT_PREDICTION', name: 'Prediction', nameVI: 'Tiên Tri', deck: 'HERMIT', subtype: 'SINGLE_USE', effectId: 'SHOW_CHARACTER_TO_CARD_OWNER', copies: 1, icon: '🔮', description: 'Người nhận cho người rút xem Character Card của mình.', bgClass: 'bg-green-900', borderClass: 'border-green-500', textClass: 'text-green-200' },
  { id: 'HERMIT_SLAP', name: 'Slap', nameVI: 'Tát', deck: 'HERMIT', subtype: 'SINGLE_USE', effectId: 'IF_HUNTER_DAMAGE_1', copies: 2, icon: '👋', description: 'Nếu Hunter: nhận 1 damage.', bgClass: 'bg-green-900', borderClass: 'border-green-500', textClass: 'text-green-200' },
  { id: 'HERMIT_SPELL', name: 'Spell', nameVI: 'Phép Thuật', deck: 'HERMIT', subtype: 'SINGLE_USE', effectId: 'IF_SHADOW_DAMAGE_1', copies: 1, icon: '🌙', description: 'Nếu Shadow: nhận 1 damage.', bgClass: 'bg-green-900', borderClass: 'border-green-500', textClass: 'text-green-200' },
  { id: 'HERMIT_TOUGH_LESSON', name: 'Tough Lesson', nameVI: 'Bài Học Khắc Nghiệt', deck: 'HERMIT', subtype: 'SINGLE_USE', effectId: 'IF_HIGH_HP_NAME_GROUP_DAMAGE_2', copies: 1, expansion: true, icon: '📚', description: 'Nếu tên nhóm D/F/G/V/W: nhận 2 damage.', bgClass: 'bg-green-900', borderClass: 'border-green-500', textClass: 'text-green-200' },
];

export const CARD_MAP: Record<string, SHCardDef> = Object.fromEntries(CARDS.map(c => [c.id, c]));
export function getCardDef(cardId: string): SHCardDef | undefined {
  return CARD_MAP[cardId];
}
export function getCharacterDef(charId: string): SHCharacterDef | undefined {
  return CHARACTER_MAP[charId];
}

// ─── Build initial shuffled decks ─────────────────────────────────────────────
export function buildInitialDecks(): { white: string[]; black: string[]; hermit: string[] } {
  const make = (deck: 'WHITE' | 'BLACK' | 'HERMIT') =>
    shuffle(CARDS.filter(c => c.deck === deck).flatMap(c => Array(c.copies).fill(c.id)));
  return { white: make('WHITE'), black: make('BLACK'), hermit: make('HERMIT') };
}

// ─── Combat helpers ───────────────────────────────────────────────────────────
export function canAttack(
  attacker: SHPublicPlayerState,
  target: SHPublicPlayerState,
  allPublicStates: Record<string, SHPublicPlayerState>,
): boolean {
  if (!attacker.isAlive || !target.isAlive) return false;
  if (attacker.playerId === target.playerId) return false;
  if (!attacker.area || !target.area) return false;

  const hasHandgun = attacker.equipment.includes('BLACK_HANDGUN');
  if (hasHandgun) return attacker.area !== target.area;

  const hasMachineGun = attacker.equipment.includes('BLACK_MACHINE_GUN');
  if (hasMachineGun) {
    // Machine gun: attack all in current zone (same group)
    return AREA_GROUP[attacker.area] === AREA_GROUP[target.area];
  }

  return AREA_GROUP[attacker.area] === AREA_GROUP[target.area];
}

export function getAttackTargets(
  attackerId: string,
  publicPlayers: Record<string, SHPublicPlayerState>,
): string[] {
  const attacker = publicPlayers[attackerId];
  if (!attacker) return [];
  return Object.values(publicPlayers)
    .filter(p => p.playerId !== attackerId && canAttack(attacker, p, publicPlayers))
    .map(p => p.playerId);
}

// ─── Damage roll ──────────────────────────────────────────────────────────────
export function rollAttackDamage(
  attacker: SHPublicPlayerState,
  charDef: SHCharacterDef | undefined,
): { d4: number; d6: number; damage: number } {
  const hasMasamune = attacker.equipment.includes('BLACK_MASAMUNE');
  const isValkyrie = charDef?.skillId === 'VALKYRIE_D4_ATTACK' && attacker.revealed;

  if (hasMasamune || isValkyrie) {
    const d4 = rollDie(4);
    return { d4, d6: 0, damage: d4 };
  }
  const d4 = rollDie(4);
  const d6 = rollDie(6);
  return { d4, d6, damage: Math.abs(d6 - d4) };
}

export function applyAttackModifiers(
  attacker: SHPublicPlayerState,
  target: SHPublicPlayerState,
  baseDamage: number,
): number {
  if (baseDamage === 0) return 0;

  let dmg = baseDamage;

  // Each ADD_1_ATTACK_DAMAGE weapon adds +1
  const bonusWeapons = attacker.equipment.filter(id =>
    getCardDef(id)?.effectId === 'ADD_1_ATTACK_DAMAGE',
  ).length;
  dmg += bonusWeapons;

  // Holy Robe on attacker: deal 1 less
  if (attacker.equipment.includes('WHITE_HOLY_ROBE')) dmg = Math.max(0, dmg - 1);
  // Holy Robe on target: receive 1 less
  if (target.equipment.includes('WHITE_HOLY_ROBE')) dmg = Math.max(0, dmg - 1);

  return dmg;
}

// ─── State helpers ────────────────────────────────────────────────────────────
export function readGameState(room: { gameState?: unknown }): SHGameState | null {
  const gs = room.gameState as unknown as SHGameState;
  if (!gs?.turnPhase) return null;
  return gs;
}

export function readMyData(player: { gameData?: unknown } | undefined): SHPlayerData {
  const d = (player?.gameData ?? {}) as Partial<SHPlayerData>;
  return {
    characterId: d.characterId ?? '',
    faction: d.faction ?? 'NEUTRAL',
    maxHp: d.maxHp ?? 0,
    usedSkill: d.usedSkill ?? false,
    drawnHermitCardId: d.drawnHermitCardId,
    pendingHermitCardId: d.pendingHermitCardId,
  };
}

export function makeInitialPublicPlayer(playerId: string): SHPublicPlayerState {
  return {
    playerId,
    damage: 0,
    area: null,
    isAlive: true,
    revealed: false,
    equipment: [],
    usedSkill: false,
    immuneToAttack: false,
    extraTurnCount: 0,
  };
}

// ─── David special equipment list ─────────────────────────────────────────────
export const DAVID_REQUIRED_EQUIPMENT = [
  'WHITE_TALISMAN',
  'WHITE_SPEAR_OF_LONGINUS',
  'WHITE_HOLY_ROBE',
  'WHITE_SILVER_ROSARY',
];
