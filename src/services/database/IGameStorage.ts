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
  subscribeToRoom(roomId: string, callback: (room: Room | null) => void): () => void;
  deleteRoom(roomId: string): Promise<void>;
  resetRoom(roomId: string): Promise<void>;
  clearGameData(roomId: string): Promise<void>;

  // ─── Player Operations ───────────────────────────────────────────────
  addPlayer(roomId: string, player: CreatePlayerPayload): Promise<void>;
  removePlayer(roomId: string, playerId: string): Promise<void>;
  updatePlayerGameData(roomId: string, playerId: string, data: Partial<BaseGameData>): Promise<void>;
  updatePlayerAlive(roomId: string, playerId: string, isAlive: boolean): Promise<void>;
  getPlayer(roomId: string, playerId: string): Promise<Player | null>;
  getPlayers(roomId: string): Promise<Player[]>;
  subscribeToPlayers(roomId: string, callback: (players: Player[]) => void): () => void;
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
