import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import * as WebSocket from 'ws';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { RoomsService } from '../rooms/rooms.service';
import { GameService } from './game.service';
import { createInitialGameState, calculateScores } from "@shared/gameData";
import type { GameState } from "@shared/gameData";
import { gameReducer } from "@shared/gameEngine";
import type { GameAction } from "@shared/gameEngine";

interface ClientInfo {
  ws: WebSocket;
  userId: number;
  userName: string;
  roomId?: number;
}

@WebSocketGateway({ path: '/ws' })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(GameGateway.name);

  /** Authenticated clients */
  private clients = new Map<WebSocket, ClientInfo>();

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly roomsService: RoomsService,
    private readonly gameService: GameService,
  ) {}

  handleConnection(client: WebSocket): void {
    this.logger.log('WebSocket client connected');

    client.on('message', async (rawData: WebSocket.Data) => {
      try {
        const data = JSON.parse(rawData.toString());
        await this.handleMessage(client, data);
      } catch (err: any) {
        this.send(client, { type: 'ERROR', message: err.message ?? 'Internal error' });
      }
    });
  }

  handleDisconnect(client: WebSocket): void {
    const info = this.clients.get(client);
    if (info?.roomId) {
      this.handlePlayerDisconnect(info);
    }
    this.clients.delete(client);
    this.logger.log(`WebSocket client disconnected${info ? ` (user ${info.userId})` : ''}`);
  }

  // ─── Message Router ────────────────────────────────────────

  private async handleMessage(client: WebSocket, msg: any): Promise<void> {
    switch (msg.type) {
      case 'AUTH':
        return this.handleAuth(client, msg.token);
      case 'JOIN_ROOM':
        return this.handleJoinRoom(client, msg.roomCode);
      case 'START_GAME':
        return this.handleStartGame(client);
      case 'ACTION':
        return this.handleAction(client, msg.payload);
      case 'PING':
        this.send(client, { type: 'PONG' });
        return;
      default:
        this.send(client, { type: 'ERROR', message: `Unknown message type: ${msg.type}` });
    }
  }

  // ─── AUTH ──────────────────────────────────────────────────

  private async handleAuth(client: WebSocket, token: string): Promise<void> {
    const payload = this.authService.verifyToken(token);
    if (!payload) {
      this.send(client, { type: 'AUTH_ERROR', message: 'Invalid token' });
      return;
    }

    const userId = parseInt(payload.sub, 10);
    const user = await this.usersService.findById(userId);
    if (!user) {
      this.send(client, { type: 'AUTH_ERROR', message: 'User not found' });
      return;
    }

    this.clients.set(client, {
      ws: client,
      userId: user.id,
      userName: user.name,
    });

    this.send(client, { type: 'AUTH_OK', userId: user.id, name: user.name });
  }

  // ─── JOIN ROOM ─────────────────────────────────────────────

  private async handleJoinRoom(client: WebSocket, roomCode: string): Promise<void> {
    const info = this.requireAuth(client);
    if (!info) return;

    const room = await this.roomsService.findByCode(roomCode);
    if (!room) {
      this.send(client, { type: 'ERROR', message: 'Room not found' });
      return;
    }

    info.roomId = room.id;

    // Mark player as connected
    await this.roomsService.setPlayerConnected(room.id, info.userId, true);

    // Notify others of reconnection
    this.broadcastToRoom(room.id, {
      type: 'PLAYER_RECONNECTED',
      userId: info.userId,
      playerName: info.userName,
    }, client);

    // Send current room state
    const players = await this.roomsService.getPlayersForRoom(room.id);
    const playerInfos = players.map((p) => ({
      userId: p.userId,
      playerName: p.playerName,
      seatIndex: p.seatIndex,
      isConnected: p.isConnected === 1,
    }));

    const roomInfo = {
      id: room.id,
      code: room.code,
      name: room.name,
      hostId: room.hostId,
      status: room.status,
      gameLength: room.gameLength,
      maxPlayers: room.maxPlayers,
    };

    // Load game state if game is in progress
    let gameState: GameState | undefined;
    if (room.status === 'playing') {
      gameState = this.gameService.getCachedState(room.id);
      if (!gameState) {
        const loaded = await this.gameService.loadFromDb(room.id);
        if (loaded) gameState = loaded.state;
      }
    }

    this.send(client, {
      type: 'ROOM_STATE',
      room: roomInfo,
      players: playerInfos,
      gameState,
    });
  }

  // ─── START GAME ────────────────────────────────────────────

  private async handleStartGame(client: WebSocket): Promise<void> {
    const info = this.requireAuth(client);
    if (!info || !info.roomId) {
      this.send(client, { type: 'ERROR', message: 'Not in a room' });
      return;
    }

    const room = await this.roomsService.findById(info.roomId);
    if (!room) {
      this.send(client, { type: 'ERROR', message: 'Room not found' });
      return;
    }

    if (room.hostId !== info.userId) {
      this.send(client, { type: 'ERROR', message: 'Only the host can start the game' });
      return;
    }

    if (room.status !== 'waiting') {
      this.send(client, { type: 'ERROR', message: 'Game already started' });
      return;
    }

    const players = await this.roomsService.getPlayersForRoom(room.id);
    if (players.length < 2) {
      this.send(client, { type: 'ERROR', message: 'Need at least 2 players to start' });
      return;
    }

    const playerNames = players
      .sort((a, b) => a.seatIndex - b.seatIndex)
      .map((p) => p.playerName);

    const gameState = createInitialGameState(playerNames, room.gameLength);

    await this.roomsService.setRoomStatus(room.id, 'playing');
    await this.gameService.saveToDb(room.id, gameState, 1);

    this.broadcastToRoom(room.id, {
      type: 'GAME_STARTED',
      gameState,
    });
  }

  // ─── ACTION ────────────────────────────────────────────────

  private async handleAction(client: WebSocket, payload: GameAction): Promise<void> {
    const info = this.requireAuth(client);
    if (!info || !info.roomId) {
      this.send(client, { type: 'ERROR', message: 'Not in a room' });
      return;
    }

    const roomId = info.roomId;
    let gameState = this.gameService.getCachedState(roomId);
    if (!gameState) {
      const loaded = await this.gameService.loadFromDb(roomId);
      if (!loaded) {
        this.send(client, { type: 'ERROR', message: 'No active game' });
        return;
      }
      gameState = loaded.state;
    }

    // Validate it's this player's turn
    const players = await this.roomsService.getPlayersForRoom(roomId);
    const sortedPlayers = players.sort((a, b) => a.seatIndex - b.seatIndex);
    const currentPlayer = sortedPlayers[gameState.currentPlayerIndex];

    if (!currentPlayer || currentPlayer.userId !== info.userId) {
      this.send(client, { type: 'ERROR', message: 'Not your turn' });
      return;
    }

    // Apply game action
    const newState = gameReducer(gameState, payload);

    // Get new version
    const currentVersion = await this.gameService.getVersion(roomId);
    const newVersion = currentVersion + 1;

    // Save to DB and cache
    await this.gameService.saveToDb(roomId, newState, newVersion);

    // Broadcast state update
    this.broadcastToRoom(roomId, {
      type: 'STATE_UPDATE',
      gameState: newState,
      version: newVersion,
    });

    // Check if game is over
    if (newState.phase === 'scoring') {
      const scores = calculateScores(newState.players);
      await this.roomsService.setRoomStatus(roomId, 'finished');
      this.gameService.removeCachedState(roomId);

      this.broadcastToRoom(roomId, {
        type: 'GAME_OVER',
        scores,
      });
    }
  }

  // ─── Disconnect Handling ───────────────────────────────────

  private async handlePlayerDisconnect(info: ClientInfo): Promise<void> {
    if (!info.roomId) return;

    try {
      await this.roomsService.setPlayerConnected(info.roomId, info.userId, false);

      this.broadcastToRoom(info.roomId, {
        type: 'PLAYER_LEFT',
        userId: info.userId,
        playerName: info.userName,
      }, info.ws);
    } catch (err: any) {
      this.logger.error(`Error handling disconnect: ${err.message}`);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────

  private requireAuth(client: WebSocket): ClientInfo | null {
    const info = this.clients.get(client);
    if (!info) {
      this.send(client, { type: 'ERROR', message: 'Not authenticated. Send AUTH message first.' });
      return null;
    }
    return info;
  }

  private send(client: WebSocket, data: any): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }

  private broadcastToRoom(roomId: number, data: any, exclude?: WebSocket): void {
    for (const [ws, info] of this.clients.entries()) {
      if (info.roomId === roomId && ws !== exclude) {
        this.send(ws, data);
      }
    }
  }
}
