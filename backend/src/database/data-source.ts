import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';
import { Room } from '../rooms/room.entity';
import { RoomPlayer } from '../rooms/room-player.entity';
import { GameStateEntity } from '../game/game-state.entity';

config();

function parseDatabaseUrl(url: string) {
  const match = url.match(
    /^mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)$/,
  );
  if (!match) {
    throw new Error(`Invalid DATABASE_URL format: ${url}`);
  }
  return {
    username: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4], 10),
    database: match[5],
  };
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}
const { username, password, host, port, database } = parseDatabaseUrl(dbUrl);

export default new DataSource({
  type: 'mysql',
  host,
  port,
  username,
  password,
  database,
  entities: [User, Room, RoomPlayer, GameStateEntity],
  migrations: ['src/database/migrations/*.ts'],
  entitySkipConstructor: true,
});