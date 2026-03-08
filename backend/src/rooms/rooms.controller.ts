import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { IsString, IsIn, IsInt, Min, Max, IsOptional } from 'class-validator';
import { RoomsService } from './rooms.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class CreateRoomDto {
  @IsString()
  name!: string;

  @IsIn(['short', 'medium', 'long'])
  gameLength!: 'short' | 'medium' | 'long';

  @IsInt()
  @Min(2)
  @Max(6)
  maxPlayers!: number;
}

class JoinRoomDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  playerName?: string;
}

function formatRoom(room: any) {
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    hostId: room.hostId,
    status: room.status,
    gameLength: room.gameLength,
    maxPlayers: room.maxPlayers,
    createdAt: room.createdAt instanceof Date ? room.createdAt.toISOString() : room.createdAt,
    updatedAt: room.updatedAt instanceof Date ? room.updatedAt.toISOString() : room.updatedAt,
  };
}

function formatPlayer(p: any) {
  return {
    id: p.id,
    roomId: p.roomId,
    userId: p.userId,
    playerName: p.playerName,
    seatIndex: p.seatIndex,
    isConnected: p.isConnected === 1 || p.isConnected === true,
    joinedAt: p.joinedAt instanceof Date ? p.joinedAt.toISOString() : p.joinedAt,
    lastSeenAt: p.lastSeenAt instanceof Date ? p.lastSeenAt.toISOString() : p.lastSeenAt,
  };
}

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async listRooms() {
    const rooms = await this.roomsService.listOpen();
    return rooms.map(formatRoom);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-active')
  async myActiveRoom(@Request() req: any) {
    const userId = req.user.id as number;
    const result = await this.roomsService.findMyActiveRoom(userId);
    if (!result) {
      return null;
    }
    return {
      room: formatRoom(result.room),
      players: result.players.map(formatPlayer),
      myPlayer: formatPlayer(result.myPlayer),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':code')
  async getRoom(@Param('code') code: string) {
    const room = await this.roomsService.findByCode(code);
    if (!room) {
      throw new HttpException('Room not found', HttpStatus.NOT_FOUND);
    }
    const players = await this.roomsService.getPlayersForRoom(room.id);
    return {
      room: formatRoom(room),
      players: players.map(formatPlayer),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createRoom(@Body() dto: CreateRoomDto, @Request() req: any) {
    const userId = req.user.id as number;
    const userName = req.user.name as string;

    const { room, player } = await this.roomsService.createRoom(
      userId,
      userName,
      {
        name: dto.name,
        gameLength: dto.gameLength,
        maxPlayers: dto.maxPlayers,
      },
    );

    return {
      room: formatRoom(room),
      players: [formatPlayer(player)],
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('join')
  async joinRoom(@Body() dto: JoinRoomDto, @Request() req: any) {
    const userId = req.user.id as number;
    const userName = req.user.name as string;

    const { room, player } = await this.roomsService.joinRoom(
      userId,
      userName,
      dto.code,
      dto.playerName,
    );

    const players = await this.roomsService.getPlayersForRoom(room.id);

    return {
      room: formatRoom(room),
      players: players.map(formatPlayer),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':roomId/leave')
  async leaveRoom(
    @Param('roomId') roomId: string,
    @Request() req: any,
  ) {
    const userId = req.user.id as number;
    await this.roomsService.leaveRoom(parseInt(roomId, 10), userId);
    return { success: true };
  }
}
