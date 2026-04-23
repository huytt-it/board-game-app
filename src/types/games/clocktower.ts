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

// ─── Clocktower-Specific Game Data ────────────────────────────────────
export interface ClocktowerGameData extends BaseGameData {
  role: ClocktowerRole;
  team: ClocktowerTeam;
  isPoisoned: boolean;
  isDrunk: boolean;
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
