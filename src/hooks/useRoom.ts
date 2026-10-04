'use client';

import { useState, useEffect, useCallback } from 'react';
import { gameStorage } from '@/services/database/firebaseAdapter';
import type { Room, RoomStatus, GameType, RoomConfig, RoomGameState } from '@/types/room';
import type { Player } from '@/types/player';

export const ACTIVE_ROOM_KEY = 'active_room_id';

interface UseRoomReturn {
  room: Room | null;
  players: Player[];
  isHost: boolean;
  isLoading: boolean;
  error: string | null;
  /** Set when the room/players listener was terminated (e.g. permission denied). */
  loadError: string | null;
  createRoom: (hostId: string, hostName: string, gameType: GameType, config: RoomConfig) => Promise<string>;
  joinRoom: (roomCode: string, playerId: string, playerName: string) => Promise<string>;
  joinRoomById: (roomId: string, playerId: string, playerName: string) => Promise<void>;
  updateStatus: (status: RoomStatus) => Promise<void>;
  updateGameState: (state: Partial<RoomGameState>) => Promise<void>;
  updateConfig: (config: Partial<RoomConfig>) => Promise<void>;
  leaveRoom: (playerId: string) => Promise<void>;
  deleteRoom: () => Promise<void>;
  resetRoom: () => Promise<void>;
}

// A player can only be in one room at a time: joining/creating a room leaves the
// previous one, and a room left with nobody in it is deleted instead of lingering.
async function leavePreviousRoom(playerId: string, nextRoomId?: string): Promise<void> {
  const activeRoomId = localStorage.getItem(ACTIVE_ROOM_KEY);
  if (!activeRoomId || activeRoomId === nextRoomId) return;
  try {
    await gameStorage.leaveRoom(activeRoomId, playerId);
  } catch (e) {
    console.error('Failed to leave old room', e);
  }
}

/**
 * `playerId` must be the authenticated id from useAuth. The Firestore listeners
 * are only attached once it is set: attaching them earlier sends the request
 * without an auth token, Firestore rejects it and the listener is terminated
 * for good (it never retries once auth arrives).
 */
export function useRoom(roomId?: string, playerId?: string | null): UseRoomReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(!!roomId);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isHost = !!(room && playerId && room.hostId === playerId);

  // Subscribe to room updates
  useEffect(() => {
    if (!roomId || !playerId) return;
    const unsub = gameStorage.subscribeToRoom(
      roomId,
      (r) => {
        setRoom(r);
        setIsLoading(false);
        if (!r) {
          setError('Room not found');
          // The room is gone (deleted, or swept as stale) — don't keep pointing at it.
          if (localStorage.getItem(ACTIVE_ROOM_KEY) === roomId) {
            localStorage.removeItem(ACTIVE_ROOM_KEY);
          }
        }
      },
      (err) => {
        setLoadError(err.message);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, [roomId, playerId]);

  // Subscribe to players
  useEffect(() => {
    if (!roomId || !playerId) return;
    const unsub = gameStorage.subscribeToPlayers(
      roomId,
      (p) => {
        setPlayers(p);
      },
      (err) => {
        setLoadError(err.message);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, [roomId, playerId]);

  const createRoom = useCallback(
    async (hostId: string, hostName: string, gameType: GameType, config: RoomConfig) => {
      try {
        setError(null);

        await leavePreviousRoom(hostId);

        const newRoomId = await gameStorage.createRoom({ hostId, gameType, config });
        await gameStorage.addPlayer(newRoomId, { id: hostId, name: hostName, isHost: true });
        localStorage.setItem(ACTIVE_ROOM_KEY, newRoomId);
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
        const nonHostPlayers = currentPlayers.filter((p) => !p.isHost);

        if (!existingPlayer && nonHostPlayers.length >= foundRoom.config.maxPlayers) {
          throw new Error('Room is full');
        }
        if (!existingPlayer && foundRoom.status !== 'lobby') {
          throw new Error('Game already in progress');
        }

        await leavePreviousRoom(pId, foundRoom.id);

        await gameStorage.addPlayer(foundRoom.id, { id: pId, name: playerName, isHost: false });
        localStorage.setItem(ACTIVE_ROOM_KEY, foundRoom.id);
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
        const nonHostPlayers = currentPlayers.filter((p) => !p.isHost);

        if (!existingPlayer && nonHostPlayers.length >= foundRoom.config.maxPlayers) {
          throw new Error('Room is full');
        }
        if (!existingPlayer && foundRoom.status !== 'lobby') {
          throw new Error('Game already in progress');
        }

        await leavePreviousRoom(pId, rId);

        await gameStorage.addPlayer(rId, { id: pId, name: playerName, isHost: false });
        localStorage.setItem(ACTIVE_ROOM_KEY, rId);
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
        localStorage.removeItem(ACTIVE_ROOM_KEY);
        await gameStorage.leaveRoom(roomId, pId);
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

  return {
    room,
    players,
    isHost,
    isLoading,
    error,
    loadError,
    createRoom,
    joinRoom,
    joinRoomById,
    updateStatus,
    updateGameState,
    updateConfig,
    leaveRoom,
    deleteRoom,
    resetRoom,
  };
}
