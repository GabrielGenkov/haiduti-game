import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { GameService } from './game.service';
import { EventStoreService } from './event-store.service';
import { RoomsService } from '../rooms/rooms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { buildPlayerView } from '../../../shared/gameEngine';

@Controller('game')
export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly eventStoreService: EventStoreService,
    private readonly roomsService: RoomsService,
  ) {}

  /**
   * GET /game/:roomId/state
   * Returns the current player view for the authenticated user.
   * Used on reconnect when the WebSocket ROOM_STATE might be stale.
   */
  @UseGuards(JwtAuthGuard)
  @Get(':roomId/state')
  async getState(@Param('roomId') roomId: string, @Request() req: any) {
    const numRoomId = parseInt(roomId, 10);
    const userId = req.user.id as number;

    const seatIndex = await this.findSeatIndex(numRoomId, userId);

    let gameState = this.gameService.getCachedState(numRoomId);
    if (!gameState) {
      const loaded = await this.gameService.loadFromDb(numRoomId);
      if (!loaded) {
        throw new HttpException('No active game', HttpStatus.NOT_FOUND);
      }
      gameState = loaded.state;
    }

    return {
      gameState: buildPlayerView(gameState, seatIndex),
      version: gameState.revision,
    };
  }

  /**
   * GET /game/:roomId/events?sinceRevision=N
   * Returns all events since revision N for client catch-up.
   */
  @UseGuards(JwtAuthGuard)
  @Get(':roomId/events')
  async getEvents(
    @Param('roomId') roomId: string,
    @Query('sinceRevision') sinceRevision: string,
    @Request() req: any,
  ) {
    const numRoomId = parseInt(roomId, 10);
    const userId = req.user.id as number;

    await this.findSeatIndex(numRoomId, userId); // verify membership

    const fromRevision = parseInt(sinceRevision ?? '0', 10);
    const events = await this.eventStoreService.getEventsSince(numRoomId, fromRevision);

    return { events };
  }

  /** Verify the user is a player in this room and return their seat index. */
  private async findSeatIndex(roomId: number, userId: number): Promise<number> {
    const players = await this.roomsService.getPlayersForRoom(roomId);
    const myPlayer = players.find((p) => p.userId === userId);
    if (!myPlayer) {
      throw new HttpException('Not a player in this room', HttpStatus.FORBIDDEN);
    }
    return myPlayer.seatIndex;
  }
}
