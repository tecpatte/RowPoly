import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from '../auth/dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('leaderboard')
  leaderboard(@Query('limit') limit?: string) {
    return this.users.leaderboard(limit ? Number(limit) : 20);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.profile(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/history')
  history(@CurrentUser() user: AuthUser) {
    return this.users.history(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.update(user.id, dto);
  }

  @Get(':id')
  profile(@Param('id') id: string) {
    return this.users.profile(id);
  }
}
