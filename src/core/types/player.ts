export interface BaseGameData {
  role?: string;
  privateMessage?: string;
  [key: string]: unknown;
}

export interface Player {
  id: string;
  name: string;
  isAlive: boolean;
  isHost: boolean;
  gameData: BaseGameData;
  joinedAt: string | Date;
}

export interface CreatePlayerPayload {
  id: string;
  name: string;
  isHost: boolean;
}
