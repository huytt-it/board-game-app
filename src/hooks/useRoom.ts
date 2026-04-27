'use client';

import { useState, useEffect, useCallback } from 'react';
import { gameStorage } from '@/services/database/firebaseAdapter';
import type { Room, RoomStatus, GameType, RoomConfig, RoomGameState } from '@/types/room';
import type { Player } from '@/types/player';

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
  deleteRoom: () => Promise<void>;
  resetRoom: () => Promise<void>;
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
        const nonHostPlayers = currentPlayers.filter((p) => !p.isHost);

        if (!existingPlayer && nonHostPlayers.length >= foundRoom.config.maxPlayers) {
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
        const nonHostPlayers = currentPlayers.filter((p) => !p.isHost);

        if (!existingPlayer && nonHostPlayers.length >= foundRoom.config.maxPlayers) {
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
    deleteRoom,
    resetRoom,
  };
}
