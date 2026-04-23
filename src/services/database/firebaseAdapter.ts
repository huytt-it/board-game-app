import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDb } from '@/services/firebase/config';
import type { IGameStorage } from './IGameStorage';
import type { Room, CreateRoomPayload, RoomStatus } from '@/types/room';
import type { Player, CreatePlayerPayload, BaseGameData } from '@/types/player';
import type { GameAction, SubmitActionPayload, ActionResult } from '@/types/actions';

// ─── Room Code Generator ──────────────────────────────────────────────
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ─── Firebase Implementation ──────────────────────────────────────────
export class FirebaseAdapter implements IGameStorage {
  private get roomsRef() {
    return collection(getDb(), 'rooms');
  }

  // ─── Room Operations ───────────────────────────────────────────────
  async createRoom(payload: CreateRoomPayload): Promise<string> {
    const roomCode = generateRoomCode();
    const roomDoc = doc(this.roomsRef);
    const roomData: Omit<Room, 'id'> = {
      hostId: payload.hostId,
      gameType: payload.gameType,
      status: 'lobby',
      roomCode,
      config: payload.config,
      createdAt: serverTimestamp() as Room['createdAt'],
    };
    await setDoc(roomDoc, roomData);
    return roomDoc.id;
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const snap = await getDoc(doc(getDb(), 'rooms', roomId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Room;
  }

  async getRoomByCode(roomCode: string): Promise<Room | null> {
    const q = query(this.roomsRef, where('roomCode', '==', roomCode.toUpperCase()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as Room;
  }

  async updateRoomStatus(roomId: string, status: RoomStatus): Promise<void> {
    await updateDoc(doc(getDb(), 'rooms', roomId), { status });
  }

  subscribeToRoom(roomId: string, callback: (room: Room | null) => void): Unsubscribe {
    return onSnapshot(doc(getDb(), 'rooms', roomId), (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      callback({ id: snap.id, ...snap.data() } as Room);
    });
  }

  // ─── Player Operations ─────────────────────────────────────────────
  async addPlayer(roomId: string, player: CreatePlayerPayload): Promise<void> {
    const playerDoc = doc(getDb(), 'rooms', roomId, 'players', player.id);
    const playerData: Omit<Player, 'id'> = {
      name: player.name,
      isAlive: true,
      isHost: player.isHost,
      gameData: {},
      joinedAt: serverTimestamp() as Player['joinedAt'],
    };
    await setDoc(playerDoc, playerData);
  }

  async removePlayer(roomId: string, playerId: string): Promise<void> {
    await deleteDoc(doc(getDb(), 'rooms', roomId, 'players', playerId));
  }

  async updatePlayerGameData(
    roomId: string,
    playerId: string,
    data: Partial<BaseGameData>
  ): Promise<void> {
    const playerRef = doc(getDb(), 'rooms', roomId, 'players', playerId);
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      updates[`gameData.${key}`] = value;
    }
    await updateDoc(playerRef, updates);
  }

  subscribeToPlayers(roomId: string, callback: (players: Player[]) => void): Unsubscribe {
    const playersCol = collection(getDb(), 'rooms', roomId, 'players');
    return onSnapshot(playersCol, (snap) => {
      const players = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Player[];
      callback(players);
    });
  }

  subscribeToPlayer(
    roomId: string,
    playerId: string,
    callback: (player: Player | null) => void
  ): Unsubscribe {
    return onSnapshot(doc(getDb(), 'rooms', roomId, 'players', playerId), (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      callback({ id: snap.id, ...snap.data() } as Player);
    });
  }

  // ─── Night Action Operations ───────────────────────────────────────
  async submitAction(roomId: string, action: SubmitActionPayload): Promise<string> {
    const actionsCol = collection(getDb(), 'rooms', roomId, 'actions');
    const actionData: Omit<GameAction, 'id'> = {
      ...action,
      status: 'pending',
      createdAt: serverTimestamp() as GameAction['createdAt'],
    };
    const docRef = await addDoc(actionsCol, actionData);
    return docRef.id;
  }

  async resolveAction(roomId: string, actionId: string, result: ActionResult): Promise<void> {
    const actionRef = doc(getDb(), 'rooms', roomId, 'actions', actionId);
    await updateDoc(actionRef, {
      status: 'resolved',
      result,
    });
  }

  subscribeToActions(roomId: string, callback: (actions: GameAction[]) => void): Unsubscribe {
    const actionsCol = collection(getDb(), 'rooms', roomId, 'actions');
    return onSnapshot(actionsCol, (snap) => {
      const actions = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as GameAction[];
      callback(actions);
    });
  }

  async clearActions(roomId: string): Promise<void> {
    const actionsCol = collection(getDb(), 'rooms', roomId, 'actions');
    const snap = await getDocs(actionsCol);
    const batch = writeBatch(getDb());
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // ─── Private Messaging ─────────────────────────────────────────────
  async sendPrivateMessage(roomId: string, playerId: string, message: string): Promise<void> {
    await this.updatePlayerGameData(roomId, playerId, { privateMessage: message });
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────
export const gameStorage: IGameStorage = new FirebaseAdapter();
