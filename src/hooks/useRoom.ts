'use client';

import { useState, useEffect, useCallback } from 'react';
import { gameStorage } from '@/services/database/firebaseAdapter';
import type { Room, RoomStatus, GameType, RoomConfig, RoomGameState } from '@/types/room';
import type { Player } from '@/types/player';
import { ClocktowerRole, ROLE_TEAMS } from '@/types/games/clocktower';

interface UseRoomReturn {
  room: Room | null;
  players: Player[];
  isHost: boolean;
  isLoading: boolean;
  error: string | null;
  createRoom: (hostId: string, hostName: string, gameType: GameType, config: RoomConfig) => Promise<string>;
  joinRoom: (roomCode: string, playerId: string, playerName: string) => Promise<string>;
  joinRoomById: (roomId: string, playerId: string, playerName: string) => Promise<void>;
  updateStatus: (status: RoomStatus) => Promise<void>;
  updateGameState: (state: Partial<RoomGameState>) => Promise<void>;
  updateConfig: (config: Partial<RoomConfig>) => Promise<void>;
  leaveRoom: (playerId: string) => Promise<void>;
  assignRoles: () => Promise<void>;
  startGame: () => Promise<void>;
  deleteRoom: () => Promise<void>;
  resetRoom: () => Promise<void>;
}

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

  // Determine role distribution by player count
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
    // Testing mode: < 5 players
    if (mandatoryRoles.length > playerCount) {
      throw new Error('Số lượng thẻ Bắt buộc vượt quá giới hạn của ván đấu. Vui lòng giảm bớt.');
    }
    
    // Add all mandatory roles
    pool.push(...mandatoryRoles);

    // Fill the rest with Townsfolk, then anything else
    const remainingNeeded = playerCount - pool.length;
    if (remainingNeeded > 0) {
      const allAvailable = [
        ...townsfolk.filter(r => !pool.includes(r)),
        ...minions.filter(r => !pool.includes(r)),
        ...demons.filter(r => !pool.includes(r)),
        ...outsiders.filter(r => !pool.includes(r))
      ];
      const filler = shuffle(allAvailable).slice(0, remainingNeeded);
      pool.push(...filler);
    }
  } else {
    // Standard rules
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
      ...pickRoles(minions, numMinions, minMandatory),
      ...pickRoles(demons, numDemons, demMandatory),
    ];
  }

  if (pool.length < playerCount) {
    throw new Error('Không đủ thẻ bài cho số lượng người chơi. Vui lòng kiểm tra lại cấu hình.');
  }

  return shuffle(pool);
}

export function useRoom(roomId?: string, playerId?: string | null): UseRoomReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(!!roomId);
  const [error, setError] = useState<string | null>(null);

  const isHost = !!(room && playerId && room.hostId === playerId);

  // Subscribe to room updates
  useEffect(() => {
    if (!roomId) return;
    setIsLoading(true);
    const unsub = gameStorage.subscribeToRoom(roomId, (r) => {
      setRoom(r);
      setIsLoading(false);
      if (!r) setError('Room not found');
    });
    return () => unsub();
  }, [roomId]);

  // Subscribe to players
  useEffect(() => {
    if (!roomId) return;
    const unsub = gameStorage.subscribeToPlayers(roomId, (p) => {
      setPlayers(p);
    });
    return () => unsub();
  }, [roomId]);

  const createRoom = useCallback(
    async (hostId: string, hostName: string, gameType: GameType, config: RoomConfig) => {
      try {
        setError(null);
        
        // Auto-leave old room if one exists
        const activeRoomId = localStorage.getItem('active_room_id');
        if (activeRoomId) {
          try {
            await gameStorage.removePlayer(activeRoomId, hostId);
            const oldPlayers = await gameStorage.getPlayers(activeRoomId);
            if (oldPlayers.length === 0) {
              await gameStorage.deleteRoom(activeRoomId);
            }
          } catch (e) {
            console.error('Failed to leave old room', e);
          }
        }

        const newRoomId = await gameStorage.createRoom({ hostId, gameType, config });
        await gameStorage.addPlayer(newRoomId, { id: hostId, name: hostName, isHost: true });
        localStorage.setItem('active_room_id', newRoomId);
        return newRoomId;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create room';
        setError(msg);
        throw err;
      }
    },
    []
  );

  const joinRoom = useCallback(
    async (roomCode: string, pId: string, playerName: string) => {
      try {
        setError(null);
        const foundRoom = await gameStorage.getRoomByCode(roomCode);
        if (!foundRoom) throw new Error('Room not found');
        
        const existingPlayer = await gameStorage.getPlayer(foundRoom.id, pId);
        const currentPlayers = await gameStorage.getPlayers(foundRoom.id);
        
        if (!existingPlayer && currentPlayers.length >= foundRoom.config.maxPlayers) {
          throw new Error('Room is full');
        }
        if (!existingPlayer && foundRoom.status !== 'lobby') {
          throw new Error('Game already in progress');
        }

        // Auto-leave old room
        const activeRoomId = localStorage.getItem('active_room_id');
        if (activeRoomId && activeRoomId !== foundRoom.id) {
          try {
            await gameStorage.removePlayer(activeRoomId, pId);
            const oldPlayers = await gameStorage.getPlayers(activeRoomId);
            if (oldPlayers.length === 0) {
              await gameStorage.deleteRoom(activeRoomId);
            }
          } catch (e) {
            console.error('Failed to leave old room', e);
          }
        }
        
        await gameStorage.addPlayer(foundRoom.id, { id: pId, name: playerName, isHost: false });
        localStorage.setItem('active_room_id', foundRoom.id);
        return foundRoom.id;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to join room';
        setError(msg);
        throw err;
      }
    },
    []
  );

  const joinRoomById = useCallback(
    async (rId: string, pId: string, playerName: string) => {
      try {
        setError(null);
        const foundRoom = await gameStorage.getRoom(rId);
        if (!foundRoom) throw new Error('Room not found');
        
        const existingPlayer = await gameStorage.getPlayer(rId, pId);
        const currentPlayers = await gameStorage.getPlayers(rId);

        if (!existingPlayer && currentPlayers.length >= foundRoom.config.maxPlayers) {
          throw new Error('Room is full');
        }
        if (!existingPlayer && foundRoom.status !== 'lobby') {
          throw new Error('Game already in progress');
        }

        // Auto-leave old room
        const activeRoomId = localStorage.getItem('active_room_id');
        if (activeRoomId && activeRoomId !== rId) {
          try {
            await gameStorage.removePlayer(activeRoomId, pId);
            const oldPlayers = await gameStorage.getPlayers(activeRoomId);
            if (oldPlayers.length === 0) {
              await gameStorage.deleteRoom(activeRoomId);
            }
          } catch (e) {
            console.error('Failed to leave old room', e);
          }
        }

        await gameStorage.addPlayer(rId, { id: pId, name: playerName, isHost: false });
        localStorage.setItem('active_room_id', rId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to join room';
        setError(msg);
        throw err;
      }
    },
    []
  );

  const updateStatus = useCallback(
    async (status: RoomStatus) => {
      if (!roomId) return;
      try {
        await gameStorage.updateRoomStatus(roomId, status);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update status');
      }
    },
    [roomId]
  );

  const updateConfig = useCallback(
    async (config: Partial<RoomConfig>) => {
      if (!roomId) return;
      try {
        await gameStorage.updateRoomConfig(roomId, config);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update config');
      }
    },
    [roomId]
  );

  const updateGameState = useCallback(
    async (state: Partial<RoomGameState>) => {
      if (!roomId) return;
      try {
        await gameStorage.updateRoomGameState(roomId, state);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update game state');
      }
    },
    [roomId]
  );

  const leaveRoom = useCallback(
    async (pId: string) => {
      if (!roomId) return;
      try {
        await gameStorage.removePlayer(roomId, pId);
        localStorage.removeItem('active_room_id');
        
        const remaining = await gameStorage.getPlayers(roomId);
        if (remaining.length === 0) {
          await gameStorage.deleteRoom(roomId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to leave room');
      }
    },
    [roomId]
  );

  const deleteRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      await gameStorage.deleteRoom(roomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete room');
    }
  }, [roomId]);

  const resetRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      await gameStorage.resetRoom(roomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset room');
    }
  }, [roomId]);

  // ─── Assign roles to all non-host players ───────────────────────────
  const assignRoles = useCallback(async () => {
    if (!roomId) return;
    try {
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
          hasUsedAbility: false,
          nightOrder: i,
        });
      }

      await gameStorage.updateRoomGameState(roomId, { rolesAssigned: true, dayCount: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign roles');
      throw err;
    }
  }, [roomId, players, room]);

  // ─── Start game: assign roles then update status ────────────────────
  const startGame = useCallback(async () => {
    if (!roomId) return;
    await assignRoles();
    // Status will be updated by the ClocktowerBoard after animation
  }, [roomId, assignRoles]);

  return {
    room,
    players,
    isHost,
    isLoading,
    error,
    createRoom,
    joinRoom,
    joinRoomById,
    updateStatus,
    updateGameState,
    updateConfig,
    leaveRoom,
    assignRoles,
    startGame,
    deleteRoom,
    resetRoom,
  };
}
