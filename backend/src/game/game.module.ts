import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameStateEntity } from './game-state.entity';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { AuthModule } from '../auth/auth.module';
import { RoomsModule } from '../rooms/rooms.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameStateEntity]),
    AuthModule,
    RoomsModule,
    UsersModule,
  ],
  providers: [GameService, GameGateway],
  exports: [GameService],
})
export class GameModule {}
