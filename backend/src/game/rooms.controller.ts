import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRoomDto } from './dto';
import { GameManager } from './game.manager';

@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly manager: GameManager) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateRoomDto) {
    const room = await this.manager.createRoom(user, dto);
    return { code: room.code, id: room.id };
  }

  @Get()
  list() {
    return this.manager.listPublic();
  }

  @Post('quickplay')
  async quickplay(@CurrentUser() user: AuthUser) {
    const room = await this.manager.quickPlay(user);
    return { code: room.code, id: room.id };
  }

  @Get(':code')
  get(@Param('code') code: string) {
    const snap = this.manager.snapshotFor(code.toUpperCase());
    if (!snap) throw new NotFoundException('La sala no existe.');
    return snap;
  }

  @Post(':code/join')
  async join(@CurrentUser() user: AuthUser, @Param('code') code: string) {
    const room = await this.manager.join(user, code.toUpperCase());
    return { code: room.code, id: room.id };
  }

  @Post(':code/leave')
  async leave(@CurrentUser() user: AuthUser, @Param('code') code: string) {
    await this.manager.leave(user.id, code.toUpperCase());
    return { ok: true };
  }

  @Post(':code/start')
  async start(@CurrentUser() user: AuthUser, @Param('code') code: string) {
    const room = await this.manager.start(user.id, code.toUpperCase());
    return { code: room.code, status: room.status };
  }
}
