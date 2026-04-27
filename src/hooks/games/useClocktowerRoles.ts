'use client';

import { useCallback } from 'react';
import { gameStorage } from '@/services/database/firebaseAdapter';
import type { Room, RoomConfig } from '@/types/room';
import type { Player } from '@/types/player';
import { ClocktowerRole, ROLE_TEAMS } from '@/types/games/clocktower';

// ─── Shuffle utility ──────────────────────────────────────────────────
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Role pool based on player count (Trouble Brewing) ────────────────
function buildRolePool(playerCount: number, roomConfig?: RoomConfig): ClocktowerRole[] {
  // Base roles for Trouble Brewing balanced setup
  let townsfolk: ClocktowerRole[] = [
    ClocktowerRole.Washerwoman, ClocktowerRole.Librarian, ClocktowerRole.Investigator,
    ClocktowerRole.Chef, ClocktowerRole.Empath, ClocktowerRole.FortuneTeller,
    ClocktowerRole.Undertaker, ClocktowerRole.Monk, ClocktowerRole.Ravenkeeper,
    ClocktowerRole.Virgin, ClocktowerRole.Slayer, ClocktowerRole.Soldier,
    ClocktowerRole.Mayor,
  ];
  let outsiders: ClocktowerRole[] = [
    ClocktowerRole.Butler, ClocktowerRole.Drunk, ClocktowerRole.Recluse, ClocktowerRole.Saint,
  ];
  let minions: ClocktowerRole[] = [
    ClocktowerRole.Poisoner, ClocktowerRole.Spy, ClocktowerRole.ScarletWoman, ClocktowerRole.Baron,
  ];
  let demons: ClocktowerRole[] = [
    ClocktowerRole.Imp,
  ];

  const roleConfig = roomConfig?.roleConfig;
  const mandatoryRoles = (roleConfig?.mandatoryRoles || []) as ClocktowerRole[];
  const excludedRoles = (roleConfig?.excludedRoles || []) as ClocktowerRole[];

  // Filter out excluded roles
  townsfolk = townsfolk.filter((r) => !excludedRoles.includes(r));
  outsiders = outsiders.filter((r) => !excludedRoles.includes(r));
  minions = minions.filter((r) => !excludedRoles.includes(r));
  demons = demons.filter((r) => !excludedRoles.includes(r));

  // Determine role distribution by player count (BotC defaults)
  let numTownsfolk = 0;
  let numOutsiders = 0;
  let numMinions = 0;
  let numDemons = 1;

  if (playerCount >= 5) {
    if (playerCount === 5) { numTownsfolk = 3; numOutsiders = 0; numMinions = 1; }
    else if (playerCount === 6) { numTownsfolk = 3; numOutsiders = 1; numMinions = 1; }
    else if (playerCount === 7) { numTownsfolk = 5; numOutsiders = 0; numMinions = 1; }
    else if (playerCount === 8) { numTownsfolk = 5; numOutsiders = 1; numMinions = 1; }
    else if (playerCount === 9) { numTownsfolk = 5; numOutsiders = 2; numMinions = 1; }
    else if (playerCount === 10) { numTownsfolk = 7; numOutsiders = 0; numMinions = 2; }
    else if (playerCount === 11) { numTownsfolk = 7; numOutsiders = 1; numMinions = 2; }
    else if (playerCount === 12) { numTownsfolk = 7; numOutsiders = 2; numMinions = 2; }
    else if (playerCount === 13) { numTownsfolk = 9; numOutsiders = 0; numMinions = 3; }
    else if (playerCount === 14) { numTownsfolk = 9; numOutsiders = 1; numMinions = 3; }
    else { numTownsfolk = 9; numOutsiders = 2; numMinions = 3; } // 15+ players
  }

  // ── Override with host's custom team counts if configured ────────────
  // teamCounts is set by RoomSettingsPanel; values already account for Baron.
  const tc = roleConfig?.teamCounts;
  const hasCustomCounts = tc && Object.keys(tc).length > 0;
  if (hasCustomCounts) {
    if (tc!['townsfolk'] !== undefined) numTownsfolk = tc!['townsfolk'];
    if (tc!['outsider']  !== undefined) numOutsiders = tc!['outsider'];
    if (tc!['minion']    !== undefined) numMinions   = tc!['minion'];
    if (tc!['demon']     !== undefined) numDemons    = tc!['demon'];
  }

  // Helper to pick roles
  const pickRoles = (pool: ClocktowerRole[], needed: number, categoryMandatory: ClocktowerRole[]) => {
    const picked: ClocktowerRole[] = [];
    for (const r of categoryMandatory) {
      if (picked.length < needed && !excludedRoles.includes(r)) {
        picked.push(r);
      }
    }
    const remainingPool = shuffle(pool.filter((r) => !picked.includes(r)));
    while (picked.length < needed && remainingPool.length > 0) {
      picked.push(remainingPool.pop()!);
    }
    return picked;
  };

  const tfMandatory = mandatoryRoles.filter((r) => ROLE_TEAMS[r] === 'townsfolk');
  const outMandatory = mandatoryRoles.filter((r) => ROLE_TEAMS[r] === 'outsider');
  const minMandatory = mandatoryRoles.filter((r) => ROLE_TEAMS[r] === 'minion');
  const demMandatory = mandatoryRoles.filter((r) => ROLE_TEAMS[r] === 'demon');

  let pool: ClocktowerRole[] = [];

  if (playerCount < 5) {
    // Testing / small game mode
    if (hasCustomCounts) {
      // Use the exact faction counts the host configured
      if (
        tfMandatory.length > numTownsfolk ||
        outMandatory.length > numOutsiders ||
        minMandatory.length > numMinions ||
        demMandatory.length > numDemons
      ) {
        throw new Error('Số lượng thẻ Bắt buộc vượt quá giới hạn của ván đấu. Vui lòng giảm bớt.');
      }
      pool = [
        ...pickRoles(townsfolk, numTownsfolk, tfMandatory),
        ...pickRoles(outsiders, numOutsiders, outMandatory),
        ...pickRoles(minions,   numMinions,   minMandatory),
        ...pickRoles(demons,    numDemons,    demMandatory),
      ];
    } else {
      // Legacy testing mode: mandatory + random fill
      if (mandatoryRoles.length > playerCount) {
        throw new Error('Số lượng thẻ Bắt buộc vượt quá giới hạn của ván đấu. Vui lòng giảm bớt.');
      }
      pool.push(...mandatoryRoles);
      const remainingNeeded = playerCount - pool.length;
      if (remainingNeeded > 0) {
        const allAvailable = [
          ...townsfolk.filter(r => !pool.includes(r)),
          ...minions.filter(r => !pool.includes(r)),
          ...demons.filter(r => !pool.includes(r)),
          ...outsiders.filter(r => !pool.includes(r)),
        ];
        pool.push(...shuffle(allAvailable).slice(0, remainingNeeded));
      }
    }
  } else {
    // Standard rules (≥5 players)
    // Baron mechanic: +2 Outsiders, -2 Townsfolk — only when NOT using custom counts
    // (when using custom counts, the host already factored in Baron via the UI)
    const baronInMandatory = !hasCustomCounts && mandatoryRoles.includes(ClocktowerRole.Baron);
    let adjustedTownsfolk = numTownsfolk;
    let adjustedOutsiders = numOutsiders;
    if (baronInMandatory) {
      adjustedTownsfolk = Math.max(0, numTownsfolk - 2);
      adjustedOutsiders = numOutsiders + 2;
    }

    if (
      tfMandatory.length > adjustedTownsfolk ||
      outMandatory.length > adjustedOutsiders ||
      minMandatory.length > numMinions ||
      demMandatory.length > numDemons
    ) {
      throw new Error('Số lượng thẻ Bắt buộc vượt quá giới hạn của ván đấu. Vui lòng giảm bớt.');
    }

    const pickedMinions = pickRoles(minions, numMinions, minMandatory);
    const baronIncluded = !hasCustomCounts && pickedMinions.includes(ClocktowerRole.Baron);

    // Apply Baron effect only when counts are from the default table
    const finalTownsfolk = baronIncluded ? Math.max(0, numTownsfolk - 2) : numTownsfolk;
    const finalOutsiders = baronIncluded ? numOutsiders + 2 : numOutsiders;

    pool = [
      ...pickRoles(townsfolk, finalTownsfolk, tfMandatory),
      ...pickRoles(outsiders, finalOutsiders, outMandatory),
      ...pickedMinions,
      ...pickRoles(demons, numDemons, demMandatory),
    ];
  }

  if (pool.length < playerCount) {
    throw new Error('Không đủ thẻ bài cho số lượng người chơi. Vui lòng kiểm tra lại cấu hình.');
  }

  return shuffle(pool);
}

// ─── Hook ─────────────────────────────────────────────────────────────
export function useClocktowerRoles(
  roomId: string | undefined,
  players: Player[],
  room: Room | null
) {
  const assignRoles = useCallback(async () => {
    if (!roomId) return;

    const gamePlayers = players.filter((p) => !p.isHost);
    const rolePool = buildRolePool(gamePlayers.length, room?.config);

    // All Townsfolk roles that can serve as the Drunk's fake role
    const townsfolkRoles: ClocktowerRole[] = [
      ClocktowerRole.Washerwoman, ClocktowerRole.Librarian, ClocktowerRole.Investigator,
      ClocktowerRole.Chef, ClocktowerRole.Empath, ClocktowerRole.FortuneTeller,
      ClocktowerRole.Undertaker, ClocktowerRole.Monk, ClocktowerRole.Ravenkeeper,
      ClocktowerRole.Virgin, ClocktowerRole.Slayer, ClocktowerRole.Soldier,
      ClocktowerRole.Mayor,
    ];

    // Build assignment map first so we can cross-reference roles
    const assignments: Array<{ playerId: string; role: ClocktowerRole }> = gamePlayers.map(
      (p, i) => ({ playerId: p.id, role: rolePool[i % rolePool.length] })
    );

    // Fortune Teller red herring: one good player who always registers as Demon to the FT
    const ftAssignment = assignments.find((a) => a.role === ClocktowerRole.FortuneTeller);
    let fortuneTellerRedHerring: string | undefined;
    if (ftAssignment) {
      const goodPlayers = assignments.filter(
        (a) =>
          a.playerId !== ftAssignment.playerId &&
          (ROLE_TEAMS[a.role] === 'townsfolk' || ROLE_TEAMS[a.role] === 'outsider')
      );
      if (goodPlayers.length > 0) {
        fortuneTellerRedHerring = goodPlayers[Math.floor(Math.random() * goodPlayers.length)].playerId;
      }
    }

    // Random seat numbers 1..N (circular seating order for Empath / Chef / neighbours)
    const seatNumbers = shuffle(gamePlayers.map((_, i) => i + 1));

    for (let i = 0; i < gamePlayers.length; i++) {
      const role = rolePool[i % rolePool.length];
      const team = ROLE_TEAMS[role];
      const isDrunk = role === ClocktowerRole.Drunk;

      // Drunk gets a random Townsfolk role as their fake identity (not one already in the game)
      let drunkRole: ClocktowerRole | undefined;
      if (isDrunk) {
        const rolesInGame = new Set<string>(rolePool);
        const available = townsfolkRoles.filter((r) => !rolesInGame.has(r));
        drunkRole = available.length > 0
          ? available[Math.floor(Math.random() * available.length)]
          : townsfolkRoles[Math.floor(Math.random() * townsfolkRoles.length)];
      }

      await gameStorage.updatePlayerGameData(roomId, gamePlayers[i].id, {
        role,
        team,
        isPoisoned: false,
        isDrunk,
        ...(drunkRole && { drunkRole }),
        ...(role === ClocktowerRole.FortuneTeller && fortuneTellerRedHerring
          ? { fortuneTellerRedHerring }
          : {}),
        hasUsedAbility: false,
        nightOrder: i,
        seatNumber: seatNumbers[i],
      });
    }

    await gameStorage.updateRoomGameState(roomId, { rolesAssigned: true, dayCount: 0 });
  }, [roomId, players, room]);

  return { assignRoles };
}
