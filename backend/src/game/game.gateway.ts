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
import { EventStoreService } from './event-store.service';
import { createInitialGameState, calculateScores } from "@shared/gameData";
import type { GameState } from "@shared/gameData";
import { applyCommand, buildPlayerView } from "@shared/gameEngine";
import type { Command } from "@shared/gameEngine";
import { diagnoseGameState, formatDiagnosticLog, formatDetailedDiagnosticLog } from "@shared/utils/diagnostics";

interface ClientInfo {
  ws: WebSocket;
  userId: number;
  userName: string;
  roomId?: number;
  seatIndex?: number;
}

@WebSocketGateway({ path: '/ws' })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(GameGateway.name);

  /** Authenticated clients */
  private clients = new Map<WebSocket, ClientInfo>();

  /** Per-room command lock to prevent race conditions */
  private roomLocks = new Map<number, Promise<void>>();

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly roomsService: RoomsService,
    private readonly gameService: GameService,
    private readonly eventStoreService: EventStoreService,
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

    // Cache seatIndex for this client
    const mySeat = players.find(p => p.userId === info.userId);
    if (mySeat) info.seatIndex = mySeat.seatIndex;

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
      gameState: gameState && info.seatIndex != null
        ? buildPlayerView(gameState, info.seatIndex)
        : gameState,
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
    await this.eventStoreService.saveInitialState(room.id, gameState);
    this.gameService.setCachedState(room.id, gameState);

    this.logDiagnostics(gameState, `room=${room.id} GAME_START`);
    this.broadcastGameViews(room.id, 'GAME_STARTED', gameState);
  }

  // ─── ACTION ────────────────────────────────────────────────

  private async handleAction(client: WebSocket, payload: Command): Promise<void> {
    const info = this.requireAuth(client);
    if (!info || !info.roomId) {
      this.send(client, { type: 'ERROR', message: 'Not in a room' });
      return;
    }

    // Serialize commands per room to prevent race conditions (duplicate key errors)
    await this.withRoomLock(info.roomId, () => this.processAction(client, info, payload));
  }

  private async processAction(client: WebSocket, info: ClientInfo, payload: Command): Promise<void> {
    const roomId = info.roomId!;
    let gameState = this.gameService.getCachedState(roomId);
    if (!gameState) {
      const loaded = await this.gameService.loadFromDb(roomId);
      if (!loaded) {
        this.send(client, { type: 'ERROR', message: 'No active game' });
        return;
      }
      gameState = loaded.state;
    }

    // Idempotency: if this command was already processed, resend current state
    if (payload.commandId && await this.eventStoreService.isCommandProcessed(payload.commandId)) {
      const seatIndex = info.seatIndex ?? 0;
      this.send(client, {
        type: 'STATE_UPDATE',
        gameState: buildPlayerView(gameState, seatIndex),
        version: gameState.revision,
      });
      return;
    }

    // Apply command (handles turn ownership, revision, and action validation)
    const result = applyCommand(gameState, payload);

    if (!result.ok) {
      this.send(client, {
        type: 'COMMAND_REJECTED',
        commandId: result.rejection.commandId,
        rejection: result.rejection,
      });
      return;
    }

    const { newState, newRevision, events } = result;

    // Persist command, events, state, and conditional snapshot in a single transaction
    await this.eventStoreService.commitTurn(roomId, payload, events, newState, newRevision);
    this.gameService.setCachedState(roomId, newState);

    this.logDiagnostics(newState, `room=${roomId} rev=${newRevision} ${payload.type}`);

    // Broadcast per-player masked views (events stored server-side only, not sent to clients)
    this.broadcastGameViews(roomId, 'STATE_UPDATE', newState, { version: newRevision });

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

  private async withRoomLock(roomId: number, fn: () => Promise<void>): Promise<void> {
    const prev = this.roomLocks.get(roomId) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    this.roomLocks.set(roomId, next.then(() => {}, () => {}));
    return next;
  }

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

  private broadcastGameViews(
    roomId: number,
    type: string,
    state: GameState,
    extra?: Record<string, any>,
  ): void {
    for (const [ws, info] of this.clients.entries()) {
      if (info.roomId !== roomId) continue;
      const viewerIndex = info.seatIndex ?? 0;
      const gameState = buildPlayerView(state, viewerIndex);
      this.send(ws, { type, gameState, ...extra });
    }
  }

  // card state logger (development only)
  private logDiagnostics(state: GameState, label: string): void {
    if (process.env.NODE_ENV === 'production') return;

    const diag = diagnoseGameState(state);
    const summary = formatDiagnosticLog(diag, label);
    const detailed = formatDetailedDiagnosticLog(state, label);
    if (diag.valid) {
      this.logger.log(summary);
      this.logger.verbose(detailed);
    } else {
      this.logger.warn(summary);
      this.logger.warn(detailed);
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
