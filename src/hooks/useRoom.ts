'use client';

import { useState, useEffect, useCallback } from 'react';
import { gameStorage } from '@/services/database/firebaseAdapter';
import type { Room, RoomStatus, GameType, RoomConfig } from '@/types/room';
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
  leaveRoom: (playerId: string) => Promise<void>;
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
        if (foundRoom.status !== 'lobby') throw new Error('Game already in progress');
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
        if (foundRoom.status !== 'lobby') throw new Error('Game already in progress');
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
    leaveRoom,
  };
}
