import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Room } from './room.entity';
import { RoomPlayer } from './room-player.entity';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
    @InjectRepository(RoomPlayer)
    private readonly playerRepo: Repository<RoomPlayer>,
  ) {}

  async listOpen(): Promise<Room[]> {
    return this.roomRepo.find({
      where: { status: 'waiting' },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  async findByCode(code: string): Promise<Room | null> {
    return this.roomRepo.findOne({ where: { code } });
  }

  async findById(id: number): Promise<Room | null> {
    return this.roomRepo.findOne({ where: { id } });
  }

  async getPlayersForRoom(roomId: number): Promise<RoomPlayer[]> {
    return this.playerRepo.find({
      where: { roomId },
      order: { seatIndex: 'ASC' },
    });
  }

  async createRoom(
    hostId: number,
    hostName: string,
    data: { name: string; gameLength: 'short' | 'medium' | 'long'; maxPlayers: number },
  ): Promise<{ room: Room; player: RoomPlayer }> {
    // Generate unique code
    let code: string;
    let attempts = 0;
    do {
      code = generateRoomCode();
      const existing = await this.roomRepo.findOne({ where: { code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new HttpException(
        'Failed to generate unique room code',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const room = this.roomRepo.create({
      code,
      name: data.name,
      hostId,
      status: 'waiting',
      gameLength: data.gameLength,
      maxPlayers: data.maxPlayers,
    });
    const savedRoom = await this.roomRepo.save(room);

    const player = this.playerRepo.create({
      roomId: savedRoom.id,
      userId: hostId,
      playerName: hostName,
      seatIndex: 0,
      isConnected: 1,
    });
    const savedPlayer = await this.playerRepo.save(player);

    return { room: savedRoom, player: savedPlayer };
  }

  async joinRoom(
    userId: number,
    userName: string,
    code: string,
    playerName?: string,
  ): Promise<{ room: Room; player: RoomPlayer }> {
    const room = await this.roomRepo.findOne({ where: { code } });
    if (!room) {
      throw new HttpException('Room not found', HttpStatus.NOT_FOUND);
    }

    if (room.status !== 'waiting') {
      throw new HttpException('Room is not accepting players', HttpStatus.BAD_REQUEST);
    }

    const players = await this.playerRepo.find({ where: { roomId: room.id } });

    // Check if already in room
    const existing = players.find((p) => p.userId === userId);
    if (existing) {
      return { room, player: existing };
    }

    if (players.length >= room.maxPlayers) {
      throw new HttpException('Room is full', HttpStatus.BAD_REQUEST);
    }

    const seatIndex = players.length;
    const player = this.playerRepo.create({
      roomId: room.id,
      userId,
      playerName: playerName ?? userName,
      seatIndex,
      isConnected: 1,
    });
    const savedPlayer = await this.playerRepo.save(player);

    return { room, player: savedPlayer };
  }

  async leaveRoom(roomId: number, userId: number): Promise<void> {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new HttpException('Room not found', HttpStatus.NOT_FOUND);
    }

    await this.playerRepo.delete({ roomId, userId });

    const remaining = await this.playerRepo.find({ where: { roomId } });
    if (remaining.length === 0) {
      await this.roomRepo.delete(roomId);
    } else if (room.hostId === userId) {
      // Transfer host to next player
      room.hostId = remaining[0].userId;
      await this.roomRepo.save(room);
      // Reindex seats
      for (let i = 0; i < remaining.length; i++) {
        remaining[i].seatIndex = i;
        await this.playerRepo.save(remaining[i]);
      }
    }
  }

  async findMyActiveRoom(
    userId: number,
  ): Promise<{ room: Room; players: RoomPlayer[]; myPlayer: RoomPlayer } | null> {
    const myPlayers = await this.playerRepo.find({ where: { userId } });
    if (myPlayers.length === 0) return null;

    const roomIds = myPlayers.map((p) => p.roomId);
    const rooms = await this.roomRepo.find({
      where: { id: In(roomIds), status: In(['waiting', 'playing']) },
    });

    if (rooms.length === 0) return null;

    const room = rooms[0];
    const players = await this.getPlayersForRoom(room.id);
    const myPlayer = players.find((p) => p.userId === userId)!;

    return { room, players, myPlayer };
  }

  async setRoomStatus(
    roomId: number,
    status: 'waiting' | 'playing' | 'finished',
  ): Promise<void> {
    await this.roomRepo.update(roomId, { status });
  }

  async setPlayerConnected(
    roomId: number,
    userId: number,
    connected: boolean,
  ): Promise<void> {
    await this.playerRepo.update(
      { roomId, userId },
      { isConnected: connected ? 1 : 0, lastSeenAt: new Date() },
    );
  }
}
