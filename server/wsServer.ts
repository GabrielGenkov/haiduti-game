/**
 * WebSocket server for Хайдути multiplayer.
 *
 * Protocol (JSON messages):
 *
 * Client → Server:
 *   { type: 'AUTH',           token: string }                  — first message after connect
 *   { type: 'JOIN_ROOM',      roomCode: string }               — join a room channel
 *   { type: 'ACTION',         payload: GameAction }            — dispatch a game action
 *   { type: 'PING' }                                           — keepalive
 *
 * Server → Client:
 *   { type: 'AUTH_OK',        userId: number, name: string }
 *   { type: 'AUTH_ERROR',     message: string }
 *   { type: 'ROOM_STATE',     room: RoomInfo, players: PlayerInfo[], gameState?: GameState }
 *   { type: 'STATE_UPDATE',   gameState: GameState, version: number }
 *   { type: 'PLAYER_JOINED',  player: PlayerInfo }
 *   { type: 'PLAYER_LEFT',    userId: number, playerName: string }
 *   { type: 'PLAYER_RECONNECTED', userId: number, playerName: string }
 *   { type: 'GAME_STARTED',   gameState: GameState }
 *   { type: 'GAME_OVER',      scores: ScoreEntry[] }
 *   { type: 'ERROR',          message: string }
 *   { type: 'PONG' }
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';
import { parse as parseCookies } from 'cookie';
import { verifyJWT } from './auth';
import { COOKIE_NAME } from '../shared/const';
import {
  getRoomByCode, getRoomById, getRoomPlayers, getRoomPlayerByUserId,
  addPlayerToRoom, removePlayerFromRoom, updatePlayerConnection,
  updateRoomStatus, saveGameState, loadGameState, getUserById
} from './db';
import { gameReducer } from '../shared/gameEngine';
import type { GameAction } from '../shared/gameEngine';
import { createInitialGameState } from '../shared/gameData';
import type { GameState } from '../shared/gameData';
import type { Room, RoomPlayer } from '../drizzle/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthenticatedClient {
  ws: WebSocket;
  userId: number;
  userName: string;
  roomId?: number;
}

interface RoomInfo {
  id: number;
  code: string;
  name: string;
  hostId: number;
  status: string;
  gameLength: string;
  maxPlayers: number;
}

interface PlayerInfo {
  userId: number;
  playerName: string;
  seatIndex: number;
  isConnected: boolean;
}

// ─── In-memory state ──────────────────────────────────────────────────────────

/** Map of WebSocket → authenticated client info */
const clients = new Map<WebSocket, AuthenticatedClient>();

/** Map of roomId → in-memory GameState (cache to avoid DB round-trips) */
const roomGameStates = new Map<number, GameState>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function send(ws: WebSocket, msg: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcastToRoom(roomId: number, msg: object, excludeWs?: WebSocket) {
  for (const [ws, client] of Array.from(clients.entries())) {
    if (client.roomId === roomId && ws !== excludeWs) {
      send(ws, msg);
    }
  }
}

function sendToRoom(roomId: number, msg: object) {
  broadcastToRoom(roomId, msg);
}

function roomInfoFromRow(room: Room): RoomInfo {
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    hostId: room.hostId,
    status: room.status,
    gameLength: room.gameLength,
    maxPlayers: room.maxPlayers,
  };
}

function playerInfoFromRow(rp: RoomPlayer): PlayerInfo {
  return {
    userId: rp.userId,
    playerName: rp.playerName,
    seatIndex: rp.seatIndex,
    isConnected: rp.isConnected === 1,
  };
}

// ─── Message handlers ─────────────────────────────────────────────────────────

async function handleAuth(ws: WebSocket, token: string) {
  try {
    const payload = await verifyJWT(token);
    if (!payload) {
      send(ws, { type: 'AUTH_ERROR', message: 'Invalid token' });
      return;
    }
    const userId = parseInt(payload.sub, 10);
    const user = await getUserById(userId);
    if (!user) {
      send(ws, { type: 'AUTH_ERROR', message: 'User not found' });
      return;
    }
    clients.set(ws, { ws, userId: user.id, userName: user.name });
    send(ws, { type: 'AUTH_OK', userId: user.id, name: user.name });
  } catch (e) {
    send(ws, { type: 'AUTH_ERROR', message: 'Auth failed' });
  }
}

async function handleJoinRoom(ws: WebSocket, client: AuthenticatedClient, roomCode: string) {
  const room = await getRoomByCode(roomCode);
  if (!room) {
    send(ws, { type: 'ERROR', message: 'Стаята не е намерена' });
    return;
  }
  if (room.status === 'finished') {
    send(ws, { type: 'ERROR', message: 'Играта в тази стая е приключила' });
    return;
  }

  const players = await getRoomPlayers(room.id);
  let existingPlayer = players.find(p => p.userId === client.userId);

  if (!existingPlayer) {
    // New player joining
    if (room.status === 'playing') {
      send(ws, { type: 'ERROR', message: 'Играта вече е започнала' });
      return;
    }
    if (players.length >= room.maxPlayers) {
      send(ws, { type: 'ERROR', message: 'Стаята е пълна' });
      return;
    }
    const seatIndex = players.length;
    existingPlayer = await addPlayerToRoom(room.id, client.userId, client.userName, seatIndex);
    client.roomId = room.id;
    await updatePlayerConnection(room.id, client.userId, true);

    // Notify others
    broadcastToRoom(room.id, {
      type: 'PLAYER_JOINED',
      player: playerInfoFromRow(existingPlayer),
    }, ws);
  } else {
    // Reconnecting player
    client.roomId = room.id;
    await updatePlayerConnection(room.id, client.userId, true);
    broadcastToRoom(room.id, {
      type: 'PLAYER_RECONNECTED',
      userId: client.userId,
      playerName: existingPlayer.playerName,
    }, ws);
  }

  // Send full room state to the joining client
  const updatedPlayers = await getRoomPlayers(room.id);
  const gameState = roomGameStates.get(room.id) ?? (await loadGameStateForRoom(room.id));

  send(ws, {
    type: 'ROOM_STATE',
    room: roomInfoFromRow(room),
    players: updatedPlayers.map(playerInfoFromRow),
    gameState: gameState ?? null,
  });
}

async function loadGameStateForRoom(roomId: number): Promise<GameState | null> {
  const saved = await loadGameState(roomId);
  if (!saved) return null;
  try {
    const state = JSON.parse(saved.stateJson) as GameState;
    roomGameStates.set(roomId, state);
    return state;
  } catch {
    return null;
  }
}

async function handleStartGame(ws: WebSocket, client: AuthenticatedClient) {
  if (!client.roomId) { send(ws, { type: 'ERROR', message: 'Не си в стая' }); return; }
  const room = await getRoomById(client.roomId);
  if (!room) { send(ws, { type: 'ERROR', message: 'Стаята не е намерена' }); return; }
  if (room.hostId !== client.userId) { send(ws, { type: 'ERROR', message: 'Само домакинът може да стартира играта' }); return; }
  if (room.status !== 'waiting') { send(ws, { type: 'ERROR', message: 'Играта вече е започнала' }); return; }

  const players = await getRoomPlayers(room.id);
  if (players.length < 2) { send(ws, { type: 'ERROR', message: 'Нужни са поне 2 играча' }); return; }

  // Build player names list in seat order
  const playerNames = players.map(p => p.playerName);
  const gameState = createInitialGameState(playerNames, room.gameLength as 'short' | 'medium' | 'long');

  // Persist and cache
  roomGameStates.set(room.id, gameState);
  await saveGameState(room.id, JSON.stringify(gameState));
  await updateRoomStatus(room.id, 'playing');

  sendToRoom(room.id, { type: 'GAME_STARTED', gameState });
}

async function handleAction(ws: WebSocket, client: AuthenticatedClient, action: GameAction) {
  if (!client.roomId) { send(ws, { type: 'ERROR', message: 'Не си в стая' }); return; }

  let gameState = roomGameStates.get(client.roomId);
  if (!gameState) {
    const loaded = await loadGameStateForRoom(client.roomId);
    if (!loaded) { send(ws, { type: 'ERROR', message: 'Няма активна игра' }); return; }
    gameState = loaded;
  }

  // Validate that it's this player's turn
  const players = await getRoomPlayers(client.roomId);
  const currentPlayer = players[gameState.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.userId !== client.userId) {
    send(ws, { type: 'ERROR', message: 'Не е твой ход' });
    return;
  }

  try {
    const newState = gameReducer(gameState, action);
    roomGameStates.set(client.roomId, newState);
    await saveGameState(client.roomId, JSON.stringify(newState));

    // Broadcast to all players in the room
    const saved = await loadGameState(client.roomId);
    const version = saved?.version ?? 0;
    sendToRoom(client.roomId, { type: 'STATE_UPDATE', gameState: newState, version });

    // Check if game is over
    if (newState.phase === 'scoring') {
      await updateRoomStatus(client.roomId, 'finished');
    }
  } catch (e) {
    send(ws, { type: 'ERROR', message: `Невалидно действие: ${(e as Error).message}` });
  }
}

async function handleDisconnect(ws: WebSocket) {
  const client = clients.get(ws);
  if (!client) return;

  if (client.roomId) {
    await updatePlayerConnection(client.roomId, client.userId, false);
    broadcastToRoom(client.roomId, {
      type: 'PLAYER_LEFT',
      userId: client.userId,
      playerName: client.userName,
    });
  }

  clients.delete(ws);
}

// ─── Server setup ─────────────────────────────────────────────────────────────

export function setupWebSocketServer(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    // Auto-authenticate from session cookie on connection
    try {
      const cookies = parseCookies(req.headers.cookie ?? '');
      const sessionToken = cookies[COOKIE_NAME];
      if (sessionToken) {
        const payload = await verifyJWT(sessionToken);
        if (payload) {
          const userId = parseInt(payload.sub, 10);
          const user = await getUserById(userId);
          if (user) {
            clients.set(ws, { ws, userId: user.id, userName: user.name });
            send(ws, { type: 'AUTH_OK', userId: user.id, name: user.name });
          }
        }
      }
    } catch (e) {
      // Cookie auth failed — client can still send AUTH message manually
      console.warn('[WS] Cookie auth failed:', (e as Error).message);
    }

    ws.on('message', async (raw) => {
      let msg: { type: string; [key: string]: unknown };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        send(ws, { type: 'ERROR', message: 'Invalid JSON' });
        return;
      }

      const client = clients.get(ws);

      switch (msg.type) {
        case 'AUTH':
          await handleAuth(ws, msg.token as string);
          break;

        case 'JOIN_ROOM':
          if (!client) { send(ws, { type: 'ERROR', message: 'Authenticate first' }); break; }
          await handleJoinRoom(ws, client, msg.roomCode as string);
          break;

        case 'START_GAME':
          if (!client) { send(ws, { type: 'ERROR', message: 'Authenticate first' }); break; }
          await handleStartGame(ws, client);
          break;

        case 'ACTION':
          if (!client) { send(ws, { type: 'ERROR', message: 'Authenticate first' }); break; }
          await handleAction(ws, client, msg.payload as GameAction);
          break;

        case 'PING':
          send(ws, { type: 'PONG' });
          break;

        default:
          send(ws, { type: 'ERROR', message: `Unknown message type: ${msg.type}` });
      }
    });

    ws.on('close', () => handleDisconnect(ws));
    ws.on('error', (err) => {
      console.error('[WS] Error:', err);
      handleDisconnect(ws);
    });
  });

  console.log('[WS] WebSocket server attached at /ws');
  return wss;
}
