// Display-only data (no game rules): which registry icon stands for each role
// and team. Rules live in constants.ts.
import { AvalonRole, type AvalonTeam } from './types';
import type { IconName } from './assets/registry';

export const ROLE_ICON_NAME: Record<AvalonRole, IconName> = {
  [AvalonRole.Merlin]: 'merlin',
  [AvalonRole.Percival]: 'percival',
  [AvalonRole.LoyalServant]: 'loyal-servant',
  [AvalonRole.Mordred]: 'mordred',
  [AvalonRole.Morgana]: 'morgana',
  [AvalonRole.Oberon]: 'oberon',
  [AvalonRole.Assassin]: 'assassin',
  [AvalonRole.Minion]: 'minion',
};

export const TEAM_ICON_NAME: Record<AvalonTeam, IconName> = {
  good: 'team-good',
  evil: 'team-evil',
};

// The order roles are LISTED in (the line-up scroll, "Các vai trong ván", the
// guide). Never the order of state.roleLineup: that array is built in seat
// order (useAvalon.assignRoles gives pool[i] to seat i), so listing roles by
// first appearance would tell the table which seat comes first — e.g. "Merlin"
// heading the Good column means the first Good seat is Merlin.
export const ROLE_DISPLAY_ORDER: readonly AvalonRole[] = [
  AvalonRole.Merlin,
  AvalonRole.Percival,
  AvalonRole.LoyalServant,
  AvalonRole.Mordred,
  AvalonRole.Morgana,
  AvalonRole.Assassin,
  AvalonRole.Oberon,
  AvalonRole.Minion,
];

/** The roles of a line-up in display order (a copy; duplicates kept). */
export function inDisplayOrder(roles: readonly AvalonRole[]): AvalonRole[] {
  return [...roles].sort((a, b) => ROLE_DISPLAY_ORDER.indexOf(a) - ROLE_DISPLAY_ORDER.indexOf(b));
}
