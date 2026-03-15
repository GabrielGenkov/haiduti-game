import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameStateEntity } from './game-state.entity';
import { GameCommandEntity } from './game-command.entity';
import { GameEventEntity } from './game-event.entity';
import { GameSnapshotEntity } from './game-snapshot.entity';
import { GameService } from './game.service';
import { EventStoreService } from './event-store.service';
import { GameGateway } from './game.gateway';
import { GameController } from './game.controller';
import { AuthModule } from '../auth/auth.module';
import { RoomsModule } from '../rooms/rooms.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GameStateEntity,
      GameCommandEntity,
      GameEventEntity,
      GameSnapshotEntity,
    ]),
    AuthModule,
    RoomsModule,
    UsersModule,
  ],
  controllers: [GameController],
  providers: [GameService, EventStoreService, GameGateway],
  exports: [GameService],
})
export class GameModule {}
