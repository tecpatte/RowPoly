import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RoomsController } from './rooms.controller';
import { GameGateway } from './game.gateway';
import { GameManager } from './game.manager';
import { GameService } from './game.service';

@Module({
  imports: [AuthModule],
  controllers: [RoomsController],
  providers: [GameManager, GameService, GameGateway],
})
export class GameModule {}
