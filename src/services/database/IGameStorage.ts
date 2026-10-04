import type { Room, CreateRoomPayload, RoomStatus, RoomGameState, RoomConfig } from '@/types/room';
import type { Player, CreatePlayerPayload, BaseGameData } from '@/types/player';
import type { GameAction, SubmitActionPayload, ActionResult } from '@/types/actions';
import type { GameHistoryEvent, AddHistoryEventPayload } from '@/types/history';

/**
 * IGameStorage — Adapter Pattern interface for all database interactions.
 * Implement this interface to swap database backends without changing business logic.
 */
export interface IGameStorage {
  // ─── Room Operations ─────────────────────────────────────────────────
  createRoom(payload: CreateRoomPayload): Promise<string>;
  getRoom(roomId: string): Promise<Room | null>;
  getRoomByCode(roomCode: string): Promise<Room | null>;
  updateRoomConfig(roomId: string, config: Partial<RoomConfig>): Promise<void>;
  updateRoomStatus(roomId: string, status: RoomStatus): Promise<void>;
  updateRoomGameState(roomId: string, state: Partial<RoomGameState>): Promise<void>;
  /** `onError` fires if the listener is terminated (e.g. permission denied); it is never retried. */
  subscribeToRoom(
    roomId: string,
    callback: (room: Room | null) => void,
    onError?: (error: Error) => void
  ): () => void;
  /**
   * Compare-and-set on the room's gameState: applies `patch` (plus an optional
   * status / per-player gameData change) in ONE transaction, but only if every
   * `expected` field still equals what is stored. Returns false when it does not,
   * i.e. someone already moved on — so a stale or duplicate write (a device that
   * was asleep or offline, two clients racing) can never overwrite newer state.
   * `expected` must list every gameState field the caller's DECISION was based on
   * (not just the phase): a client whose view is stale — dead listener, slow
   * network — then fails the check instead of acting on old data. Values are
   * compared deeply; `expectPlayerData` does the same for per-player gameData.
   * Throws when offline instead of queueing the write for later.
   */
  casGameState(
    roomId: string,
    expected: Record<string, unknown>,
    patch: Record<string, unknown>,
    opts?: {
      status?: RoomStatus;
      playerData?: Array<{ playerId: string; data: Partial<BaseGameData> }>;
      expectPlayerData?: Array<{ playerId: string; data: Partial<BaseGameData> }>;
    }
  ): Promise<boolean>;
  /** `online` is false while the client cannot reach the backend. */
  subscribeToConnection(roomId: string, callback: (online: boolean) => void): () => void;
  /** Deletes the room and every subcollection under it (players, actions, history). */
  deleteRoom(roomId: string): Promise<void>;
  resetRoom(roomId: string): Promise<void>;
  clearGameData(roomId: string): Promise<void>;
  /**
   * Deletes rooms nobody has touched for too long (see FirebaseAdapter for the
   * thresholds) together with all their player/action/history data.
   * Safe to call from any client; returns how many rooms were removed.
   */
  cleanupStaleRooms(): Promise<number>;

  // ─── Player Operations ───────────────────────────────────────────────
  addPlayer(roomId: string, player: CreatePlayerPayload): Promise<void>;
  removePlayer(roomId: string, playerId: string): Promise<void>;
  /** Removes the player, then deletes the whole room if nobody is left in it. */
  leaveRoom(roomId: string, playerId: string): Promise<void>;
  updatePlayerGameData(roomId: string, playerId: string, data: Partial<BaseGameData>): Promise<void>;
  /**
   * Batch update gameData cho nhiều player atomically (Firestore batch / equivalent).
   * Dùng khi cần đảm bảo "all-or-nothing", ví dụ chia bài role lúc bắt đầu game.
   */
  updatePlayersGameDataBatch(
    roomId: string,
    updates: Array<{ playerId: string; data: Partial<BaseGameData> }>
  ): Promise<void>;
  updatePlayerAlive(roomId: string, playerId: string, isAlive: boolean): Promise<void>;
  getPlayer(roomId: string, playerId: string): Promise<Player | null>;
  getPlayers(roomId: string): Promise<Player[]>;
  subscribeToPlayers(
    roomId: string,
    callback: (players: Player[]) => void,
    onError?: (error: Error) => void
  ): () => void;
  subscribeToPlayer(roomId: string, playerId: string, callback: (player: Player | null) => void): () => void;

  // ─── Night Action Operations ─────────────────────────────────────────
  submitAction(roomId: string, action: SubmitActionPayload): Promise<string>;
  resolveAction(roomId: string, actionId: string, result: ActionResult): Promise<void>;
  subscribeToActions(roomId: string, callback: (actions: GameAction[]) => void): () => void;
  clearActions(roomId: string): Promise<void>;

  // ─── Private Messaging ───────────────────────────────────────────────
  sendPrivateMessage(roomId: string, playerId: string, message: string): Promise<void>;

  // ─── Game History ────────────────────────────────────────────────────
  addHistoryEvent(roomId: string, payload: AddHistoryEventPayload): Promise<void>;
  subscribeToHistory(roomId: string, callback: (events: GameHistoryEvent[]) => void): () => void;
}
