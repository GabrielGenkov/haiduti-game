import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RoomsModule } from './rooms/rooms.module';
import { GameModule } from './game/game.module';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    AuthModule,
    RoomsModule,
    GameModule,
  ],
})
export class AppModule {}
