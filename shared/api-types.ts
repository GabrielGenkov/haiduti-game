/**
 * Shared REST API types for frontend/backend communication.
 * Both sides import from this file to ensure type consistency.
 */

// Re-export game types
export type { GameState } from './gameData';
export type { GameAction } from './gameEngine';

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

// ─── Rooms ───────────────────────────────────────────────────────────────────

export interface CreateRoomRequest {
  name: string;
  gameLength: 'short' | 'medium' | 'long';
  maxPlayers: number;
}

export interface JoinRoomRequest {
  code: string;
  playerName?: string;
}

export interface RoomResponse {
  id: number;
  code: string;
  name: string;
  hostId: number;
  status: 'waiting' | 'playing' | 'finished';
  gameLength: 'short' | 'medium' | 'long';
  maxPlayers: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoomPlayerResponse {
  id: number;
  roomId: number;
  userId: number;
  playerName: string;
  seatIndex: number;
  isConnected: boolean;
  joinedAt: string;
  lastSeenAt: string;
}

export interface RoomWithPlayersResponse {
  room: RoomResponse;
  players: RoomPlayerResponse[];
}

export interface MyActiveRoomResponse {
  room: RoomResponse;
  players: RoomPlayerResponse[];
  myPlayer: RoomPlayerResponse;
}

// ─── WebSocket Messages ──────────────────────────────────────────────────────

export interface WsPlayerInfo {
  userId: number;
  playerName: string;
  seatIndex: number;
  isConnected: boolean;
}

export interface WsRoomInfo {
  id: number;
  code: string;
  name: string;
  hostId: number;
  status: string;
  gameLength: string;
  maxPlayers: number;
}
