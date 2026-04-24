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
function buildRolePool(playerCount: number): ClocktowerRole[] {
  // Base roles for Trouble Brewing balanced setup
  const townsfolk: ClocktowerRole[] = [
    ClocktowerRole.Washerwoman, ClocktowerRole.Librarian, ClocktowerRole.Investigator,
    ClocktowerRole.Chef, ClocktowerRole.Empath, ClocktowerRole.FortuneTeller,
    ClocktowerRole.Undertaker, ClocktowerRole.Monk, ClocktowerRole.Ravenkeeper,
    ClocktowerRole.Virgin, ClocktowerRole.Slayer, ClocktowerRole.Soldier,
    ClocktowerRole.Mayor,
  ];
  const outsiders: ClocktowerRole[] = [
    ClocktowerRole.Butler, ClocktowerRole.Drunk, ClocktowerRole.Recluse, ClocktowerRole.Saint,
  ];
  const minions: ClocktowerRole[] = [
    ClocktowerRole.Poisoner, ClocktowerRole.Spy, ClocktowerRole.ScarletWoman, ClocktowerRole.Baron,
  ];

  // Determine role distribution by player count
  let numTownsfolk: number, numOutsiders: number, numMinions: number;

  if (playerCount <= 5) {
    numTownsfolk = 3; numOutsiders = 0; numMinions = 1;
  } else if (playerCount <= 7) {
    numTownsfolk = 3; numOutsiders = 1; numMinions = 1;
  } else if (playerCount <= 9) {
    numTownsfolk = 5; numOutsiders = 1; numMinions = 1;
  } else if (playerCount <= 12) {
    numTownsfolk = 7; numOutsiders = 1; numMinions = 2;
  } else if (playerCount <= 15) {
    numTownsfolk = 9; numOutsiders = 1; numMinions = 3;
  } else {
    numTownsfolk = 10; numOutsiders = 2; numMinions = 3;
  }

  const pool: ClocktowerRole[] = [
    ...shuffle(townsfolk).slice(0, numTownsfolk),
    ...shuffle(outsiders).slice(0, numOutsiders),
    ...shuffle(minions).slice(0, numMinions),
    ClocktowerRole.Imp, // always 1 demon
  ];

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
        const newRoomId = await gameStorage.createRoom({ hostId, gameType, config });
        await gameStorage.addPlayer(newRoomId, { id: hostId, name: hostName, isHost: true });
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
        if (!existingPlayer && foundRoom.status !== 'lobby') {
          throw new Error('Game already in progress');
        }
        
        await gameStorage.addPlayer(foundRoom.id, { id: pId, name: playerName, isHost: false });
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
        if (!existingPlayer && foundRoom.status !== 'lobby') {
          throw new Error('Game already in progress');
        }

        await gameStorage.addPlayer(rId, { id: pId, name: playerName, isHost: false });
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
      const rolePool = buildRolePool(gamePlayers.length);

      for (let i = 0; i < gamePlayers.length; i++) {
        const role = rolePool[i % rolePool.length];
        const team = ROLE_TEAMS[role];
        await gameStorage.updatePlayerGameData(roomId, gamePlayers[i].id, {
          role,
          team,
          isPoisoned: false,
          isDrunk: role === ClocktowerRole.Drunk,
          hasUsedAbility: false,
          nightOrder: i,
        });
      }

      await gameStorage.updateRoomGameState(roomId, { rolesAssigned: true, dayCount: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign roles');
    }
  }, [roomId, players]);

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
    leaveRoom,
    assignRoles,
    startGame,
    deleteRoom,
    resetRoom,
  };
}
