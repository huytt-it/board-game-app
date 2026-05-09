import type { IGameStorage } from '../IGameStorage';
import type { Room, CreateRoomPayload, RoomStatus, RoomGameState, RoomConfig } from '@core/types/room';
import type { Player, CreatePlayerPayload, BaseGameData } from '@core/types/player';
import type { GameAction, SubmitActionPayload, ActionResult } from '@core/types/actions';
import type { GameHistoryEvent, AddHistoryEventPayload } from '@core/types/history';
import { tokenStore } from '@core/services/auth/tokenStore';

/**
 * ApiAdapter — REST API + Server-Sent Events implementation of IGameStorage.
 * Realtime subscriptions use SSE (EventSource); mutations use fetch().
 * Configure NEXT_PUBLIC_API_BASE_URL to point at your backend.
 */
export class ApiAdapter implements IGameStorage {
  constructor(private baseUrl: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = tokenStore.get();
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...init,
    });
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  private sse(path: string, callback: (data: unknown) => void): () => void {
    const token = tokenStore.get();
    const url = new URL(`${this.baseUrl}${path}`);
    if (token) url.searchParams.set('token', token);
    const es = new EventSource(url.toString());
    es.onmessage = (e) => { try { callback(JSON.parse(e.data)); } catch {} };
    es.onerror = () => callback(null);
    return () => es.close();
  }

  // ─── Room Operations ───────────────────────────────────────────────
  async createRoom(payload: CreateRoomPayload): Promise<string> {
    const { roomId } = await this.request<{ roomId: string }>('/rooms', {
      method: 'POST', body: JSON.stringify(payload),
    });
    return roomId;
  }

  async getRoom(roomId: string): Promise<Room | null> {
    try { return await this.request<Room>(`/rooms/${roomId}`); }
    catch { return null; }
  }

  async getRoomByCode(roomCode: string): Promise<Room | null> {
    try { return await this.request<Room>(`/rooms/code/${roomCode}`); }
    catch { return null; }
  }

  async updateRoomConfig(roomId: string, config: Partial<RoomConfig>): Promise<void> {
    await this.request(`/rooms/${roomId}/config`, { method: 'PATCH', body: JSON.stringify(config) });
  }

  async updateRoomStatus(roomId: string, status: RoomStatus): Promise<void> {
    await this.request(`/rooms/${roomId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  }

  async updateRoomGameState(roomId: string, state: Partial<RoomGameState>): Promise<void> {
    await this.request(`/rooms/${roomId}/state`, { method: 'PATCH', body: JSON.stringify(state) });
  }

  subscribeToRoom(roomId: string, callback: (room: Room | null) => void): () => void {
    return this.sse(`/rooms/${roomId}/stream`, callback as (d: unknown) => void);
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this.request(`/rooms/${roomId}`, { method: 'DELETE' });
  }

  async resetRoom(roomId: string): Promise<void> {
    await this.request(`/rooms/${roomId}/reset`, { method: 'POST' });
  }

  async clearGameData(roomId: string): Promise<void> {
    await this.request(`/rooms/${roomId}/clear`, { method: 'POST' });
  }

  // ─── Player Operations ─────────────────────────────────────────────
  async addPlayer(roomId: string, player: CreatePlayerPayload): Promise<void> {
    await this.request(`/rooms/${roomId}/players`, { method: 'POST', body: JSON.stringify(player) });
  }

  async removePlayer(roomId: string, playerId: string): Promise<void> {
    try {
      await this.request(`/rooms/${roomId}/players/${playerId}`, { method: 'DELETE' });
    } catch (e) {
      if (e instanceof Error && e.message.includes('404')) return;
      throw e;
    }
  }

  async updatePlayerGameData(roomId: string, playerId: string, data: Partial<BaseGameData>): Promise<void> {
    await this.request(`/rooms/${roomId}/players/${playerId}/gameData`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async updatePlayersGameDataBatch(roomId: string, updates: Array<{ playerId: string; data: Partial<BaseGameData> }>): Promise<void> {
    await this.request(`/rooms/${roomId}/players/batch`, { method: 'PATCH', body: JSON.stringify(updates) });
  }

  async updatePlayerAlive(roomId: string, playerId: string, isAlive: boolean): Promise<void> {
    await this.request(`/rooms/${roomId}/players/${playerId}/alive`, { method: 'PATCH', body: JSON.stringify({ isAlive }) });
  }

  async getPlayer(roomId: string, playerId: string): Promise<Player | null> {
    try { return await this.request<Player>(`/rooms/${roomId}/players/${playerId}`); }
    catch { return null; }
  }

  async getPlayers(roomId: string): Promise<Player[]> {
    try { return await this.request<Player[]>(`/rooms/${roomId}/players`); }
    catch (e) {
      if (e instanceof Error && e.message.includes('404')) return [];
      throw e;
    }
  }

  subscribeToPlayers(roomId: string, callback: (players: Player[]) => void): () => void {
    return this.sse(`/rooms/${roomId}/players/stream`, callback as (d: unknown) => void);
  }

  subscribeToPlayer(roomId: string, playerId: string, callback: (player: Player | null) => void): () => void {
    return this.sse(`/rooms/${roomId}/players/${playerId}/stream`, callback as (d: unknown) => void);
  }

  // ─── Action Operations ─────────────────────────────────────────────
  async submitAction(roomId: string, action: SubmitActionPayload): Promise<string> {
    const { actionId } = await this.request<{ actionId: string }>(`/rooms/${roomId}/actions`, {
      method: 'POST', body: JSON.stringify(action),
    });
    return actionId;
  }

  async resolveAction(roomId: string, actionId: string, result: ActionResult): Promise<void> {
    await this.request(`/rooms/${roomId}/actions/${actionId}/resolve`, { method: 'POST', body: JSON.stringify(result) });
  }

  subscribeToActions(roomId: string, callback: (actions: GameAction[]) => void): () => void {
    return this.sse(`/rooms/${roomId}/actions/stream`, callback as (d: unknown) => void);
  }

  async clearActions(roomId: string): Promise<void> {
    await this.request(`/rooms/${roomId}/actions`, { method: 'DELETE' });
  }

  // ─── Private Messaging ─────────────────────────────────────────────
  async sendPrivateMessage(roomId: string, playerId: string, message: string): Promise<void> {
    await this.updatePlayerGameData(roomId, playerId, { privateMessage: message });
  }

  // ─── Game History ─────────────────────────────────────────────────
  async addHistoryEvent(roomId: string, payload: AddHistoryEventPayload): Promise<void> {
    await this.request(`/rooms/${roomId}/history`, { method: 'POST', body: JSON.stringify(payload) });
  }

  subscribeToHistory(roomId: string, callback: (events: GameHistoryEvent[]) => void): () => void {
    return this.sse(`/rooms/${roomId}/history/stream`, callback as (d: unknown) => void);
  }
}
