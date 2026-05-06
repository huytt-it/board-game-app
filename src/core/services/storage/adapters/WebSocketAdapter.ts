import type { IGameStorage } from '../IGameStorage';
import type { Room, CreateRoomPayload, RoomStatus, RoomGameState, RoomConfig } from '@core/types/room';
import type { Player, CreatePlayerPayload, BaseGameData } from '@core/types/player';
import type { GameAction, SubmitActionPayload, ActionResult } from '@core/types/actions';
import type { GameHistoryEvent, AddHistoryEventPayload } from '@core/types/history';

type WsMessage = { channel: string; payload: unknown };
type Listener = (data: unknown) => void;

/**
 * WebSocketAdapter — low-latency realtime implementation of IGameStorage.
 * All subscriptions use a single multiplexed WebSocket connection.
 * Mutations are sent over the same socket as typed messages.
 * Best for games requiring fast turn-by-turn updates (Shadow Hunters, etc.).
 */
export class WebSocketAdapter implements IGameStorage {
  private ws: WebSocket;
  private channels = new Map<string, Set<Listener>>();
  private pendingReplies = new Map<string, (data: unknown) => void>();
  private msgId = 0;

  constructor(wsUrl: string) {
    this.ws = new WebSocket(wsUrl);
    this.ws.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data as string) as WsMessage & { replyTo?: string };
        if (msg.replyTo && this.pendingReplies.has(msg.replyTo)) {
          this.pendingReplies.get(msg.replyTo)!(msg.payload);
          this.pendingReplies.delete(msg.replyTo);
          return;
        }
        this.channels.get(msg.channel)?.forEach((cb) => cb(msg.payload));
      } catch {}
    };
  }

  private send(type: string, payload: unknown): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  private async rpc<T>(type: string, payload: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = String(++this.msgId);
      this.pendingReplies.set(id, (data) => resolve(data as T));
      setTimeout(() => { this.pendingReplies.delete(id); reject(new Error('WS RPC timeout')); }, 10_000);
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type, payload, id }));
      } else {
        this.ws.addEventListener('open', () => {
          this.ws.send(JSON.stringify({ type, payload, id }));
        }, { once: true });
      }
    });
  }

  private subscribe(channel: string, cb: Listener): () => void {
    if (!this.channels.has(channel)) this.channels.set(channel, new Set());
    this.channels.get(channel)!.add(cb);
    this.send('subscribe', { channel });
    return () => {
      this.channels.get(channel)?.delete(cb);
      if (this.channels.get(channel)?.size === 0) {
        this.send('unsubscribe', { channel });
      }
    };
  }

  // ─── Room Operations ───────────────────────────────────────────────
  async createRoom(payload: CreateRoomPayload): Promise<string> {
    return this.rpc<string>('room:create', payload);
  }
  async getRoom(roomId: string): Promise<Room | null> {
    return this.rpc<Room | null>('room:get', { roomId });
  }
  async getRoomByCode(roomCode: string): Promise<Room | null> {
    return this.rpc<Room | null>('room:getByCode', { roomCode });
  }
  async updateRoomConfig(roomId: string, config: Partial<RoomConfig>): Promise<void> {
    return this.rpc('room:updateConfig', { roomId, config });
  }
  async updateRoomStatus(roomId: string, status: RoomStatus): Promise<void> {
    return this.rpc('room:updateStatus', { roomId, status });
  }
  async updateRoomGameState(roomId: string, state: Partial<RoomGameState>): Promise<void> {
    return this.rpc('room:updateState', { roomId, state });
  }
  subscribeToRoom(roomId: string, callback: (room: Room | null) => void): () => void {
    return this.subscribe(`room:${roomId}`, callback as Listener);
  }
  async deleteRoom(roomId: string): Promise<void> {
    return this.rpc('room:delete', { roomId });
  }
  async resetRoom(roomId: string): Promise<void> {
    return this.rpc('room:reset', { roomId });
  }
  async clearGameData(roomId: string): Promise<void> {
    return this.rpc('room:clearGameData', { roomId });
  }

  // ─── Player Operations ─────────────────────────────────────────────
  async addPlayer(roomId: string, player: CreatePlayerPayload): Promise<void> {
    return this.rpc('player:add', { roomId, player });
  }
  async removePlayer(roomId: string, playerId: string): Promise<void> {
    return this.rpc('player:remove', { roomId, playerId });
  }
  async updatePlayerGameData(roomId: string, playerId: string, data: Partial<BaseGameData>): Promise<void> {
    return this.rpc('player:updateGameData', { roomId, playerId, data });
  }
  async updatePlayersGameDataBatch(roomId: string, updates: Array<{ playerId: string; data: Partial<BaseGameData> }>): Promise<void> {
    return this.rpc('player:updateGameDataBatch', { roomId, updates });
  }
  async updatePlayerAlive(roomId: string, playerId: string, isAlive: boolean): Promise<void> {
    return this.rpc('player:updateAlive', { roomId, playerId, isAlive });
  }
  async getPlayer(roomId: string, playerId: string): Promise<Player | null> {
    return this.rpc<Player | null>('player:get', { roomId, playerId });
  }
  async getPlayers(roomId: string): Promise<Player[]> {
    return this.rpc<Player[]>('player:list', { roomId });
  }
  subscribeToPlayers(roomId: string, callback: (players: Player[]) => void): () => void {
    return this.subscribe(`players:${roomId}`, callback as Listener);
  }
  subscribeToPlayer(roomId: string, playerId: string, callback: (player: Player | null) => void): () => void {
    return this.subscribe(`player:${roomId}:${playerId}`, callback as Listener);
  }

  // ─── Action Operations ─────────────────────────────────────────────
  async submitAction(roomId: string, action: SubmitActionPayload): Promise<string> {
    return this.rpc<string>('action:submit', { roomId, action });
  }
  async resolveAction(roomId: string, actionId: string, result: ActionResult): Promise<void> {
    return this.rpc('action:resolve', { roomId, actionId, result });
  }
  subscribeToActions(roomId: string, callback: (actions: GameAction[]) => void): () => void {
    return this.subscribe(`actions:${roomId}`, callback as Listener);
  }
  async clearActions(roomId: string): Promise<void> {
    return this.rpc('action:clearAll', { roomId });
  }

  // ─── Private Messaging ─────────────────────────────────────────────
  async sendPrivateMessage(roomId: string, playerId: string, message: string): Promise<void> {
    return this.updatePlayerGameData(roomId, playerId, { privateMessage: message });
  }

  // ─── Game History ─────────────────────────────────────────────────
  async addHistoryEvent(roomId: string, payload: AddHistoryEventPayload): Promise<void> {
    return this.rpc('history:add', { roomId, payload });
  }
  subscribeToHistory(roomId: string, callback: (events: GameHistoryEvent[]) => void): () => void {
    return this.subscribe(`history:${roomId}`, callback as Listener);
  }
}
