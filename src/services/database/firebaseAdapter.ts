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
import type { Room, CreateRoomPayload, RoomStatus, RoomGameState, RoomConfig } from '@/types/room';
import type { Player, CreatePlayerPayload, BaseGameData } from '@/types/player';
import type { GameAction, SubmitActionPayload, ActionResult } from '@/types/actions';
import type { GameHistoryEvent, AddHistoryEventPayload } from '@/types/history';

// ─── Helpers ──────────────────────────────────────────────────────────
// Sắp xếp player ổn định theo thứ tự join — để các game có "vòng bàn" (Avalon
// rotate Leader, Lady, etc.) hiển thị ghế nhất quán giữa các client và sau
// reload, không phụ thuộc thứ tự document Firestore trả về.
function comparePlayersByJoinedAt(a: Player, b: Player): number {
  const ta = readMillis(a.joinedAt);
  const tb = readMillis(b.joinedAt);
  if (ta !== tb) return ta - tb;
  return a.id.localeCompare(b.id);
}

function readMillis(v: Player['joinedAt']): number {
  if (!v) return 0;
  // Firestore Timestamp → toMillis(); fallback cho serverTimestamp pending.
  const anyV = v as { toMillis?: () => number; seconds?: number };
  if (typeof anyV.toMillis === 'function') return anyV.toMillis();
  if (typeof anyV.seconds === 'number') return anyV.seconds * 1000;
  return 0;
}

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
    // Run cleanup in background
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
        dayCount: 0,
        votes: {},
        rolesAssigned: false,
      },
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
    
    // Delete all players
    const playersSnap = await getDocs(collection(getDb(), 'rooms', roomId, 'players'));
    playersSnap.docs.forEach((d) => batch.delete(d.ref));
    
    // Delete all actions
    const actionsSnap = await getDocs(collection(getDb(), 'rooms', roomId, 'actions'));
    actionsSnap.docs.forEach((d) => batch.delete(d.ref));
    
    // Delete room
    batch.delete(doc(getDb(), 'rooms', roomId));
    await batch.commit();
  }

  async resetRoom(roomId: string): Promise<void> {
    const batch = writeBatch(getDb());
    
    // Reset room — clear entire gameState so stale fields (winner, pendingStarpass, etc.) don't linger
    const roomRef = doc(getDb(), 'rooms', roomId);
    batch.update(roomRef, {
      status: 'lobby',
      gameState: {
        dayCount: 0,
        votes: {},
        rolesAssigned: false,
        winner: null,
        nominations: {},
        votingTarget: null,
        votingTargetName: null,
        lastExecutedPlayerId: null,
        lastExecutedRole: null,
        pendingSlayerAction: null,
        pendingStarpassAction: null,
      },
    });

    // Reset players
    const playersSnap = await getDocs(collection(getDb(), 'rooms', roomId, 'players'));
    playersSnap.docs.forEach((d) => {
      batch.update(d.ref, {
        isAlive: true,
        gameData: {}
      });
    });

    // Delete actions
    const actionsSnap = await getDocs(collection(getDb(), 'rooms', roomId, 'actions'));
    actionsSnap.docs.forEach((d) => batch.delete(d.ref));

    // Delete history
    const historySnap = await getDocs(collection(getDb(), 'rooms', roomId, 'history'));
    historySnap.docs.forEach((d) => batch.delete(d.ref));

    await batch.commit();
  }

  // Clears all per-game data (player gameData, actions, history, gameState) without
  // changing room status — used to start a new round without going through the lobby.
  async clearGameData(roomId: string): Promise<void> {
    const batch = writeBatch(getDb());

    // Reset players (keep them in the room)
    const playersSnap = await getDocs(collection(getDb(), 'rooms', roomId, 'players'));
    playersSnap.docs.forEach((d) => {
      batch.update(d.ref, { isAlive: true, gameData: {} });
    });

    // Delete actions
    const actionsSnap = await getDocs(collection(getDb(), 'rooms', roomId, 'actions'));
    actionsSnap.docs.forEach((d) => batch.delete(d.ref));

    // Delete history
    const historySnap = await getDocs(collection(getDb(), 'rooms', roomId, 'history'));
    historySnap.docs.forEach((d) => batch.delete(d.ref));

    // Reset gameState (status untouched so there is no lobby flash)
    batch.update(doc(getDb(), 'rooms', roomId), {
      gameState: {
        dayCount: 0,
        votes: {},
        rolesAssigned: false,
        winner: null,
        nominations: {},
        votingTarget: null,
        votingTargetName: null,
        lastExecutedPlayerId: null,
        lastExecutedRole: null,
        pendingSlayerAction: null,
        pendingStarpassAction: null,
      },
    });

    await batch.commit();
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
    
    // Check if player already exists to avoid overwriting properties like isHost
    const snap = await getDoc(playerDoc);
    if (snap.exists()) {
      await updateDoc(playerDoc, { name: player.name });
      return;
    }

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
    const playerRef = doc(getDb(), 'rooms', roomId, 'players', playerId);
    await updateDoc(playerRef, { isAlive });
  }

  subscribeToPlayers(roomId: string, callback: (players: Player[]) => void): Unsubscribe {
    const playersCol = collection(getDb(), 'rooms', roomId, 'players');
    return onSnapshot(playersCol, (snap) => {
      const players = (
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Player[]
      ).sort(comparePlayersByJoinedAt);
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

  // ─── Game History ─────────────────────────────────────────────────
  async addHistoryEvent(roomId: string, payload: AddHistoryEventPayload): Promise<void> {
    const eventsCol = collection(getDb(), 'rooms', roomId, 'history');
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== undefined)
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

// ─── Singleton Export ─────────────────────────────────────────────────
export const gameStorage: IGameStorage = new FirebaseAdapter();
