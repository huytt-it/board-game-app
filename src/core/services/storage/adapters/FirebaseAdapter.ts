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
import { getDb } from '@core/services/firebase/config';
import type { IGameStorage } from '../IGameStorage';
import type { Room, CreateRoomPayload, RoomStatus, RoomGameState, RoomConfig } from '@core/types/room';
import type { Player, CreatePlayerPayload, BaseGameData } from '@core/types/player';
import type { GameAction, SubmitActionPayload, ActionResult } from '@core/types/actions';
import type { GameHistoryEvent, AddHistoryEventPayload } from '@core/types/history';

// ─── Helpers ──────────────────────────────────────────────────────────
function comparePlayersByJoinedAt(a: Player, b: Player): number {
  const ta = readMillis(a.joinedAt);
  const tb = readMillis(b.joinedAt);
  if (ta !== tb) return ta - tb;
  return a.id.localeCompare(b.id);
}

function readMillis(v: Player['joinedAt']): number {
  if (!v) return 0;
  const anyV = v as { toMillis?: () => number; seconds?: number };
  if (typeof anyV.toMillis === 'function') return anyV.toMillis();
  if (typeof anyV.seconds === 'number') return anyV.seconds * 1000;
  return 0;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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

  private async cleanupStaleRooms() {
    try {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const q = query(this.roomsRef, where('createdAt', '<', twelveHoursAgo));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await this.deleteRoom(d.id);
      }
    } catch (err) {
      console.error('Failed to cleanup stale rooms', err);
    }
  }

  // ─── Room Operations ───────────────────────────────────────────────
  async createRoom(payload: CreateRoomPayload): Promise<string> {
    this.cleanupStaleRooms().catch(console.error);

    const roomCode = generateRoomCode();
    const roomDoc = doc(this.roomsRef);
    const roomData: Omit<Room, 'id'> = {
      hostId: payload.hostId,
      gameType: payload.gameType,
      status: 'lobby',
      roomCode,
      config: payload.config,
      gameState: {
        rolesAssigned: false,
        winner: null,
        ...payload.initialGameState,
      },
      createdAt: serverTimestamp() as unknown as Room['createdAt'],
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

  async updateRoomConfig(roomId: string, config: Partial<RoomConfig>): Promise<void> {
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config)) {
      updates[`config.${key}`] = value;
    }
    await updateDoc(doc(getDb(), 'rooms', roomId), updates);
  }

  async updateRoomStatus(roomId: string, status: RoomStatus): Promise<void> {
    await updateDoc(doc(getDb(), 'rooms', roomId), { status });
  }

  async updateRoomGameState(roomId: string, state: Partial<RoomGameState>): Promise<void> {
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(state)) {
      updates[`gameState.${key}`] = value;
    }
    await updateDoc(doc(getDb(), 'rooms', roomId), updates);
  }

  async deleteRoom(roomId: string): Promise<void> {
    const batch = writeBatch(getDb());
    const playersSnap = await getDocs(collection(getDb(), 'rooms', roomId, 'players'));
    playersSnap.docs.forEach((d) => batch.delete(d.ref));
    const actionsSnap = await getDocs(collection(getDb(), 'rooms', roomId, 'actions'));
    actionsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(getDb(), 'rooms', roomId));
    await batch.commit();
  }

  async resetRoom(roomId: string): Promise<void> {
    const batch = writeBatch(getDb());
    const roomRef = doc(getDb(), 'rooms', roomId);
    batch.update(roomRef, {
      status: 'lobby',
      gameState: { rolesAssigned: false, winner: null },
    });
    const playersSnap = await getDocs(collection(getDb(), 'rooms', roomId, 'players'));
    playersSnap.docs.forEach((d) => {
      batch.update(d.ref, { isAlive: true, gameData: {} });
    });
    const actionsSnap = await getDocs(collection(getDb(), 'rooms', roomId, 'actions'));
    actionsSnap.docs.forEach((d) => batch.delete(d.ref));
    const historySnap = await getDocs(collection(getDb(), 'rooms', roomId, 'history'));
    historySnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  async clearGameData(roomId: string): Promise<void> {
    const batch = writeBatch(getDb());
    const playersSnap = await getDocs(collection(getDb(), 'rooms', roomId, 'players'));
    playersSnap.docs.forEach((d) => {
      batch.update(d.ref, { isAlive: true, gameData: {} });
    });
    const actionsSnap = await getDocs(collection(getDb(), 'rooms', roomId, 'actions'));
    actionsSnap.docs.forEach((d) => batch.delete(d.ref));
    const historySnap = await getDocs(collection(getDb(), 'rooms', roomId, 'history'));
    historySnap.docs.forEach((d) => batch.delete(d.ref));
    batch.update(doc(getDb(), 'rooms', roomId), {
      gameState: { rolesAssigned: false, winner: null },
    });
    await batch.commit();
  }

  subscribeToRoom(roomId: string, callback: (room: Room | null) => void): Unsubscribe {
    return onSnapshot(doc(getDb(), 'rooms', roomId), (snap) => {
      if (!snap.exists()) { callback(null); return; }
      callback({ id: snap.id, ...snap.data() } as Room);
    });
  }

  // ─── Player Operations ─────────────────────────────────────────────
  async getPlayer(roomId: string, playerId: string): Promise<Player | null> {
    const snap = await getDoc(doc(getDb(), 'rooms', roomId, 'players', playerId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Player;
  }

  async getPlayers(roomId: string): Promise<Player[]> {
    const snap = await getDocs(collection(getDb(), 'rooms', roomId, 'players'));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Player))
      .sort(comparePlayersByJoinedAt);
  }

  async addPlayer(roomId: string, player: CreatePlayerPayload): Promise<void> {
    const playerDoc = doc(getDb(), 'rooms', roomId, 'players', player.id);
    const snap = await getDoc(playerDoc);
    if (snap.exists()) {
      await updateDoc(playerDoc, { name: player.name });
      return;
    }
    const playerData: Omit<Player, 'id' | 'joinedAt'> & { joinedAt: ReturnType<typeof serverTimestamp> } = {
      name: player.name,
      isAlive: true,
      isHost: player.isHost,
      gameData: {},
      joinedAt: serverTimestamp(),
    };
    await setDoc(playerDoc, playerData);
  }

  async removePlayer(roomId: string, playerId: string): Promise<void> {
    await deleteDoc(doc(getDb(), 'rooms', roomId, 'players', playerId));
  }

  async updatePlayerGameData(roomId: string, playerId: string, data: Partial<BaseGameData>): Promise<void> {
    const playerRef = doc(getDb(), 'rooms', roomId, 'players', playerId);
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      updates[`gameData.${key}`] = value;
    }
    await updateDoc(playerRef, updates);
  }

  async updatePlayersGameDataBatch(
    roomId: string,
    updates: Array<{ playerId: string; data: Partial<BaseGameData> }>
  ): Promise<void> {
    if (updates.length === 0) return;
    const batch = writeBatch(getDb());
    for (const { playerId, data } of updates) {
      const playerRef = doc(getDb(), 'rooms', roomId, 'players', playerId);
      const flat: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        flat[`gameData.${key}`] = value;
      }
      batch.update(playerRef, flat);
    }
    await batch.commit();
  }

  async updatePlayerAlive(roomId: string, playerId: string, isAlive: boolean): Promise<void> {
    await updateDoc(doc(getDb(), 'rooms', roomId, 'players', playerId), { isAlive });
  }

  subscribeToPlayers(roomId: string, callback: (players: Player[]) => void): Unsubscribe {
    const playersCol = collection(getDb(), 'rooms', roomId, 'players');
    return onSnapshot(playersCol, (snap) => {
      const players = (snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Player[])
        .sort(comparePlayersByJoinedAt);
      callback(players);
    });
  }

  subscribeToPlayer(roomId: string, playerId: string, callback: (player: Player | null) => void): Unsubscribe {
    return onSnapshot(doc(getDb(), 'rooms', roomId, 'players', playerId), (snap) => {
      if (!snap.exists()) { callback(null); return; }
      callback({ id: snap.id, ...snap.data() } as Player);
    });
  }

  // ─── Action Operations ─────────────────────────────────────────────
  async submitAction(roomId: string, action: SubmitActionPayload): Promise<string> {
    const actionsCol = collection(getDb(), 'rooms', roomId, 'actions');
    const actionData: Omit<GameAction, 'id'> = {
      ...action,
      status: 'pending',
      createdAt: serverTimestamp() as unknown as GameAction['createdAt'],
    };
    const docRef = await addDoc(actionsCol, actionData);
    return docRef.id;
  }

  async resolveAction(roomId: string, actionId: string, result: ActionResult): Promise<void> {
    await updateDoc(doc(getDb(), 'rooms', roomId, 'actions', actionId), {
      status: 'resolved',
      result,
    });
  }

  subscribeToActions(roomId: string, callback: (actions: GameAction[]) => void): Unsubscribe {
    const actionsCol = collection(getDb(), 'rooms', roomId, 'actions');
    return onSnapshot(actionsCol, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as GameAction[]);
    });
  }

  async clearActions(roomId: string): Promise<void> {
    const snap = await getDocs(collection(getDb(), 'rooms', roomId, 'actions'));
    const batch = writeBatch(getDb());
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // ─── Private Messaging ─────────────────────────────────────────────
  async sendPrivateMessage(roomId: string, playerId: string, message: string): Promise<void> {
    await this.updatePlayerGameData(roomId, playerId, { privateMessage: message });
  }

  // ─── Game History ─────────────────────────────────────────────────
  async addHistoryEvent(roomId: string, payload: AddHistoryEventPayload): Promise<void> {
    const eventsCol = collection(getDb(), 'rooms', roomId, 'history');
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined)
    );
    await addDoc(eventsCol, { ...cleanPayload, createdAt: serverTimestamp() });
  }

  subscribeToHistory(roomId: string, callback: (events: GameHistoryEvent[]) => void): () => void {
    const eventsCol = collection(getDb(), 'rooms', roomId, 'history');
    return onSnapshot(eventsCol, (snap) => {
      const events = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as GameHistoryEvent))
        .sort((a, b) => {
          const aTime = (a.createdAt as any)?.seconds ?? 0;
          const bTime = (b.createdAt as any)?.seconds ?? 0;
          return aTime - bTime;
        });
      callback(events);
    });
  }
}
