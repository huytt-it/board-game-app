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
