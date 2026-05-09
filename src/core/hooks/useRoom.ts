'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStorage } from '@core/services/storage/StorageContext';
import type { Room, RoomStatus, GameType, RoomConfig, RoomGameState } from '@core/types/room';
import type { Player } from '@core/types/player';

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
  const storage = useStorage();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(!!roomId);
  const [error, setError] = useState<string | null>(null);

  const isHost = !!(room && playerId && room.hostId === playerId);

  useEffect(() => {
    if (!roomId) return;
    setIsLoading(true);
    const unsub = storage.subscribeToRoom(roomId, (r) => {
      setRoom(r);
      setIsLoading(false);
      if (!r) setError('Room not found');
    });
    return () => unsub();
  }, [roomId, storage]);

  useEffect(() => {
    if (!roomId) return;
    const unsub = storage.subscribeToPlayers(roomId, (p) => setPlayers(p));
    return () => unsub();
  }, [roomId, storage]);

  const createRoom = useCallback(
    async (hostId: string, hostName: string, gameType: GameType, config: RoomConfig) => {
      try {
        setError(null);
        const activeRoomId = localStorage.getItem('active_room_id');
        localStorage.removeItem('active_room_id');
        if (activeRoomId) {
          try {
            await storage.removePlayer(activeRoomId, hostId);
            const oldPlayers = await storage.getPlayers(activeRoomId);
            if (oldPlayers.length === 0) await storage.deleteRoom(activeRoomId);
          } catch (e) { console.error('Failed to leave old room', e); }
        }
        const newRoomId = await storage.createRoom({ hostId, gameType, config });
        await storage.addPlayer(newRoomId, { id: hostId, name: hostName, isHost: true });
        localStorage.setItem('active_room_id', newRoomId);
        return newRoomId;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create room';
        setError(msg);
        throw err;
      }
    },
    [storage]
  );

  const joinRoom = useCallback(
    async (roomCode: string, pId: string, playerName: string) => {
      try {
        setError(null);
        const foundRoom = await storage.getRoomByCode(roomCode);
        if (!foundRoom) throw new Error('Room not found');
        const existingPlayer = await storage.getPlayer(foundRoom.id, pId);
        const currentPlayers = await storage.getPlayers(foundRoom.id);
        const nonHostPlayers = currentPlayers.filter((p) => !p.isHost);
        if (!existingPlayer && nonHostPlayers.length >= foundRoom.config.maxPlayers)
          throw new Error('Room is full');
        if (!existingPlayer && foundRoom.status !== 'lobby')
          throw new Error('Game already in progress');
        const activeRoomId = localStorage.getItem('active_room_id');
        if (activeRoomId && activeRoomId !== foundRoom.id) {
          try {
            await storage.removePlayer(activeRoomId, pId);
            const oldPlayers = await storage.getPlayers(activeRoomId);
            if (oldPlayers.length === 0) await storage.deleteRoom(activeRoomId);
          } catch (e) { console.error('Failed to leave old room', e); }
        }
        await storage.addPlayer(foundRoom.id, { id: pId, name: playerName, isHost: false });
        localStorage.setItem('active_room_id', foundRoom.id);
        return foundRoom.id;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to join room';
        setError(msg);
        throw err;
      }
    },
    [storage]
  );

  const joinRoomById = useCallback(
    async (rId: string, pId: string, playerName: string) => {
      try {
        setError(null);
        const foundRoom = await storage.getRoom(rId);
        if (!foundRoom) throw new Error('Room not found');
        const existingPlayer = await storage.getPlayer(rId, pId);
        const currentPlayers = await storage.getPlayers(rId);
        const nonHostPlayers = currentPlayers.filter((p) => !p.isHost);
        if (!existingPlayer && nonHostPlayers.length >= foundRoom.config.maxPlayers)
          throw new Error('Room is full');
        if (!existingPlayer && foundRoom.status !== 'lobby')
          throw new Error('Game already in progress');
        const activeRoomId = localStorage.getItem('active_room_id');
        if (activeRoomId && activeRoomId !== rId) {
          try {
            await storage.removePlayer(activeRoomId, pId);
            const oldPlayers = await storage.getPlayers(activeRoomId);
            if (oldPlayers.length === 0) await storage.deleteRoom(activeRoomId);
          } catch (e) { console.error('Failed to leave old room', e); }
        }
        await storage.addPlayer(rId, { id: pId, name: playerName, isHost: false });
        localStorage.setItem('active_room_id', rId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to join room';
        setError(msg);
        throw err;
      }
    },
    [storage]
  );

  const updateStatus = useCallback(async (status: RoomStatus) => {
    if (!roomId) return;
    try { await storage.updateRoomStatus(roomId, status); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to update status'); }
  }, [roomId, storage]);

  const updateConfig = useCallback(async (config: Partial<RoomConfig>) => {
    if (!roomId) return;
    try { await storage.updateRoomConfig(roomId, config); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to update config'); }
  }, [roomId, storage]);

  const updateGameState = useCallback(async (state: Partial<RoomGameState>) => {
    if (!roomId) return;
    try { await storage.updateRoomGameState(roomId, state); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to update game state'); }
  }, [roomId, storage]);

  const leaveRoom = useCallback(async (pId: string) => {
    if (!roomId) return;
    try {
      await storage.removePlayer(roomId, pId);
      localStorage.removeItem('active_room_id');
      const remaining = await storage.getPlayers(roomId);
      if (remaining.length === 0) await storage.deleteRoom(roomId);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to leave room'); }
  }, [roomId, storage]);

  const deleteRoom = useCallback(async () => {
    if (!roomId) return;
    try { await storage.deleteRoom(roomId); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete room'); }
  }, [roomId, storage]);

  const resetRoom = useCallback(async () => {
    if (!roomId) return;
    try { await storage.resetRoom(roomId); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to reset room'); }
  }, [roomId, storage]);

  return {
    room, players, isHost, isLoading, error,
    createRoom, joinRoom, joinRoomById,
    updateStatus, updateGameState, updateConfig,
    leaveRoom, deleteRoom, resetRoom,
  };
}
