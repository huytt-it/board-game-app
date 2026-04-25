import type { BaseGameData } from '../player';
import type { RoomConfig } from '../room';

// ─── Clocktower Roles ─────────────────────────────────────────────────
export enum ClocktowerRole {
  // Townsfolk
  Washerwoman = 'Washerwoman',
  Librarian = 'Librarian',
  Investigator = 'Investigator',
  Chef = 'Chef',
  Empath = 'Empath',
  FortuneTeller = 'Fortune Teller',
  Undertaker = 'Undertaker',
  Monk = 'Monk',
  Ravenkeeper = 'Ravenkeeper',
  Virgin = 'Virgin',
  Slayer = 'Slayer',
  Soldier = 'Soldier',
  Mayor = 'Mayor',

  // Outsiders
  Butler = 'Butler',
  Drunk = 'Drunk',
  Recluse = 'Recluse',
  Saint = 'Saint',

  // Minions
  Poisoner = 'Poisoner',
  Spy = 'Spy',
  ScarletWoman = 'Scarlet Woman',
  Baron = 'Baron',

  // Demons
  Imp = 'Imp',
}

// ─── Role Teams ───────────────────────────────────────────────────────
export type ClocktowerTeam = 'townsfolk' | 'outsider' | 'minion' | 'demon';

export const ROLE_TEAMS: Record<ClocktowerRole, ClocktowerTeam> = {
  [ClocktowerRole.Washerwoman]: 'townsfolk',
  [ClocktowerRole.Librarian]: 'townsfolk',
  [ClocktowerRole.Investigator]: 'townsfolk',
  [ClocktowerRole.Chef]: 'townsfolk',
  [ClocktowerRole.Empath]: 'townsfolk',
  [ClocktowerRole.FortuneTeller]: 'townsfolk',
  [ClocktowerRole.Undertaker]: 'townsfolk',
  [ClocktowerRole.Monk]: 'townsfolk',
  [ClocktowerRole.Ravenkeeper]: 'townsfolk',
  [ClocktowerRole.Virgin]: 'townsfolk',
  [ClocktowerRole.Slayer]: 'townsfolk',
  [ClocktowerRole.Soldier]: 'townsfolk',
  [ClocktowerRole.Mayor]: 'townsfolk',
  [ClocktowerRole.Butler]: 'outsider',
  [ClocktowerRole.Drunk]: 'outsider',
  [ClocktowerRole.Recluse]: 'outsider',
  [ClocktowerRole.Saint]: 'outsider',
  [ClocktowerRole.Poisoner]: 'minion',
  [ClocktowerRole.Spy]: 'minion',
  [ClocktowerRole.ScarletWoman]: 'minion',
  [ClocktowerRole.Baron]: 'minion',
  [ClocktowerRole.Imp]: 'demon',
};

// ─── Role Icons (unique per role) ─────────────────────────────────────
export const ROLE_ICONS: Record<ClocktowerRole, string> = {
  [ClocktowerRole.Washerwoman]: '🧺',
  [ClocktowerRole.Librarian]: '📚',
  [ClocktowerRole.Investigator]: '🔍',
  [ClocktowerRole.Chef]: '👨‍🍳',
  [ClocktowerRole.Empath]: '💗',
  [ClocktowerRole.FortuneTeller]: '🔮',
  [ClocktowerRole.Undertaker]: '⚰️',
  [ClocktowerRole.Monk]: '🛐',
  [ClocktowerRole.Ravenkeeper]: '🐦‍⬛',
  [ClocktowerRole.Virgin]: '👼',
  [ClocktowerRole.Slayer]: '⚔️',
  [ClocktowerRole.Soldier]: '🛡️',
  [ClocktowerRole.Mayor]: '👑',
  [ClocktowerRole.Butler]: '🎩',
  [ClocktowerRole.Drunk]: '🍺',
  [ClocktowerRole.Recluse]: '🏚️',
  [ClocktowerRole.Saint]: '✝️',
  [ClocktowerRole.Poisoner]: '☠️',
  [ClocktowerRole.Spy]: '🕵️',
  [ClocktowerRole.ScarletWoman]: '💃',
  [ClocktowerRole.Baron]: '🎪',
  [ClocktowerRole.Imp]: '👹',
};

// ─── Role Short Descriptions ──────────────────────────────────────────
export const ROLE_SHORT_DESC: Record<ClocktowerRole, string> = {
  [ClocktowerRole.Washerwoman]: 'Knows 1 of 2 players is a Townsfolk',
  [ClocktowerRole.Librarian]: 'Knows 1 of 2 players is an Outsider',
  [ClocktowerRole.Investigator]: 'Knows 1 of 2 players is a Minion',
  [ClocktowerRole.Chef]: 'Knows how many evil pairs exist',
  [ClocktowerRole.Empath]: 'Learns evil neighbour count each night',
  [ClocktowerRole.FortuneTeller]: 'Picks 2 players to detect Demon',
  [ClocktowerRole.Undertaker]: 'Learns who was executed today',
  [ClocktowerRole.Monk]: 'Protects a player from the Demon',
  [ClocktowerRole.Ravenkeeper]: 'On death, learns a player\'s role',
  [ClocktowerRole.Virgin]: 'First nominator (Townsfolk) dies',
  [ClocktowerRole.Slayer]: 'Once per game, try to slay the Demon',
  [ClocktowerRole.Soldier]: 'Cannot be killed by the Demon',
  [ClocktowerRole.Mayor]: 'If 3 alive & no execution, Good wins',
  [ClocktowerRole.Butler]: 'Must follow a master\'s vote',
  [ClocktowerRole.Drunk]: 'Thinks they\'re a Townsfolk (but isn\'t)',
  [ClocktowerRole.Recluse]: 'May register as evil',
  [ClocktowerRole.Saint]: 'If executed, Evil wins',
  [ClocktowerRole.Poisoner]: 'Poisons a player each night',
  [ClocktowerRole.Spy]: 'Sees the Grimoire each night',
  [ClocktowerRole.ScarletWoman]: 'Becomes Demon if Demon dies',
  [ClocktowerRole.Baron]: 'Adds 2 extra Outsiders',
  [ClocktowerRole.Imp]: 'Kills a player each night',
};

// ─── Roles that have night actions ────────────────────────────────────
export const FIRST_NIGHT_ROLES: ClocktowerRole[] = [
  ClocktowerRole.Washerwoman,
  ClocktowerRole.Librarian,
  ClocktowerRole.Investigator,
  ClocktowerRole.Chef,
  ClocktowerRole.Empath,
  ClocktowerRole.FortuneTeller,
  ClocktowerRole.Butler,
  ClocktowerRole.Poisoner,
  ClocktowerRole.Spy,
];

export const OTHER_NIGHT_ROLES: ClocktowerRole[] = [
  ClocktowerRole.Empath,
  ClocktowerRole.FortuneTeller,
  ClocktowerRole.Undertaker,
  ClocktowerRole.Monk,
  ClocktowerRole.Butler,
  ClocktowerRole.Ravenkeeper,
  ClocktowerRole.Poisoner,
  ClocktowerRole.Spy,
  ClocktowerRole.Imp,
];

// ─── Role Ability Descriptions ────────────────────────────────────────
export const ROLE_ABILITIES: Record<ClocktowerRole, string> = {
  [ClocktowerRole.Washerwoman]: 'You start knowing that 1 of 2 players is a particular Townsfolk.',
  [ClocktowerRole.Librarian]: 'You start knowing that 1 of 2 players is a particular Outsider. (Or that zero are in play.)',
  [ClocktowerRole.Investigator]: 'You start knowing that 1 of 2 players is a particular Minion.',
  [ClocktowerRole.Chef]: 'You start knowing how many pairs of evil players there are.',
  [ClocktowerRole.Empath]: 'Each night, you learn how many of your 2 alive neighbours are evil.',
  [ClocktowerRole.FortuneTeller]: 'Each night, choose 2 players: you learn if either is the Demon. (There is a good player that registers as the Demon to you.)',
  [ClocktowerRole.Undertaker]: 'Each night*, you learn which character died by execution today.',
  [ClocktowerRole.Monk]: 'Each night*, choose a player (not yourself): they are safe from the Demon tonight.',
  [ClocktowerRole.Ravenkeeper]: 'If you die at night, you are woken to choose a player: you learn their character.',
  [ClocktowerRole.Virgin]: 'The 1st time you are nominated, if the nominator is a Townsfolk, they are executed immediately.',
  [ClocktowerRole.Slayer]: 'Once per game, during the day, publicly choose a player: if they are the Demon, they die.',
  [ClocktowerRole.Soldier]: 'You are safe from the Demon.',
  [ClocktowerRole.Mayor]: 'If only 3 players live & no execution occurs, your team wins. If you die at night, another player might die instead.',
  [ClocktowerRole.Butler]: 'Each night, choose a player (not yourself): tomorrow, you may only vote if they are voting too.',
  [ClocktowerRole.Drunk]: 'You do not know you are the Drunk. You think you are a Townsfolk character, but you are not.',
  [ClocktowerRole.Recluse]: 'You might register as evil & as a Minion or Demon, even if dead.',
  [ClocktowerRole.Saint]: 'If you die by execution, your team loses.',
  [ClocktowerRole.Poisoner]: 'Each night, choose a player: they are poisoned tonight and tomorrow day.',
  [ClocktowerRole.Spy]: 'Each night, you see the Grimoire. You might register as good & as a Townsfolk or Outsider, even if dead.',
  [ClocktowerRole.ScarletWoman]: 'If there are 5 or more players alive & the Demon dies, you become the Demon. (Travellers don\'t count.)',
  [ClocktowerRole.Baron]: 'There are extra Outsiders in play. [+2 Outsiders]',
  [ClocktowerRole.Imp]: 'Each night*, choose a player: they die. If you kill yourself this way, a Minion becomes the Imp.',
};

// ─── Role Action Types ────────────────────────────────────────────────
// 'info-only'     : Player waits; host auto-computes & sends info (no target picked)
// 'single-target' : Player picks 1 other player
// 'dual-target'   : Player picks 2 players (Fortune Teller)
// 'self-or-other' : Player picks any player including themselves (Imp)
// 'no-action'     : No night action for this role
export type RoleActionType = 'info-only' | 'single-target' | 'dual-target' | 'no-action' | 'self-or-other';

export const ROLE_ACTION_TYPE: Record<ClocktowerRole, RoleActionType> = {
  [ClocktowerRole.Washerwoman]: 'info-only',
  [ClocktowerRole.Librarian]: 'info-only',
  [ClocktowerRole.Investigator]: 'info-only',
  [ClocktowerRole.Chef]: 'info-only',
  [ClocktowerRole.Empath]: 'info-only',
  [ClocktowerRole.FortuneTeller]: 'dual-target',
  [ClocktowerRole.Undertaker]: 'info-only',
  [ClocktowerRole.Monk]: 'single-target',
  [ClocktowerRole.Ravenkeeper]: 'single-target',
  [ClocktowerRole.Virgin]: 'no-action',
  [ClocktowerRole.Slayer]: 'no-action',
  [ClocktowerRole.Soldier]: 'no-action',
  [ClocktowerRole.Mayor]: 'no-action',
  [ClocktowerRole.Butler]: 'single-target',
  [ClocktowerRole.Drunk]: 'no-action',
  [ClocktowerRole.Recluse]: 'no-action',
  [ClocktowerRole.Saint]: 'no-action',
  [ClocktowerRole.Poisoner]: 'single-target',
  [ClocktowerRole.Spy]: 'info-only',
  [ClocktowerRole.ScarletWoman]: 'no-action',
  [ClocktowerRole.Baron]: 'no-action',
  [ClocktowerRole.Imp]: 'self-or-other',
};

// ─── Night action instructions shown to the player ───────────────────
export const ROLE_NIGHT_INSTRUCTIONS: Partial<Record<ClocktowerRole, string>> = {
  [ClocktowerRole.Washerwoman]: 'Quản trò sẽ cho bạn biết 2 người chơi, trong đó 1 người là Townsfolk cụ thể.',
  [ClocktowerRole.Librarian]: 'Quản trò sẽ cho bạn biết 2 người chơi, trong đó 1 người là Outsider cụ thể.',
  [ClocktowerRole.Investigator]: 'Quản trò sẽ cho bạn biết 2 người chơi, trong đó 1 người là Minion cụ thể.',
  [ClocktowerRole.Chef]: 'Quản trò sẽ cho bạn biết có bao nhiêu cặp người ác ngồi cạnh nhau.',
  [ClocktowerRole.Empath]: 'Quản trò sẽ cho bạn biết số hàng xóm còn sống gần bạn nhất là ác (0, 1 hoặc 2).',
  [ClocktowerRole.FortuneTeller]: 'Chọn 2 người chơi. Quản trò sẽ cho bạn biết liệu một trong hai có phải là Quỷ không.',
  [ClocktowerRole.Undertaker]: 'Quản trò sẽ cho bạn biết nhân vật của người đã bị xử tử hôm nay.',
  [ClocktowerRole.Monk]: 'Chọn 1 người chơi để bảo vệ họ khỏi Quỷ đêm nay. Không thể chọn bản thân.',
  [ClocktowerRole.Ravenkeeper]: 'Bạn vừa qua đời! Chọn 1 người chơi để biết nhân vật của họ.',
  [ClocktowerRole.Butler]: 'Chọn 1 người chơi làm chủ. Ngày mai bạn chỉ được bỏ phiếu nếu người đó bỏ phiếu trước.',
  [ClocktowerRole.Poisoner]: 'Chọn 1 người chơi để đầu độc đêm nay. Họ sẽ nhận thông tin sai từ Quản trò.',
  [ClocktowerRole.Spy]: 'Quản trò sẽ cho bạn xem Grimoire — danh sách nhân vật của tất cả mọi người.',
  [ClocktowerRole.Imp]: 'Chọn 1 người chơi để giết đêm nay. Chọn chính mình để truyền vai Imp cho một Minion ngẫu nhiên.',
};

// ─── Clocktower-Specific Game Data ────────────────────────────────────
export interface ClocktowerGameData extends BaseGameData {
  role: ClocktowerRole;
  team: ClocktowerTeam;
  isPoisoned: boolean;
  isDrunk: boolean;
  drunkRole?: ClocktowerRole; // The fake Townsfolk role the Drunk player believes they are
  hasUsedAbility: boolean;
  nightOrder: number;
  privateMessage?: string;
}

// ─── Clocktower Room Config ───────────────────────────────────────────
export interface ClocktowerConfig extends RoomConfig {
  edition: 'trouble-brewing' | 'bad-moon-rising' | 'sects-and-violets';
  townsfolkCount: number;
  outsiderCount: number;
  minionCount: number;
  demonCount: number;
}

// ─── Night Action specific to Clocktower ──────────────────────────────
export interface ClocktowerNightAction {
  playerId: string;
  playerName: string;
  role: ClocktowerRole;
  targetId: string;
  targetName: string;
  abilityDescription: string;
}
