import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from '../auth/dto';
import { computeAchievements } from './achievements';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async profile(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    const { passwordHash, ...safe } = user;
    return { ...safe, achievements: computeAchievements(safe) };
  }

  async history(id: string, limit = 20) {
    const results = await this.prisma.gameResult.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { game: { select: { code: true, finishedAt: true, winnerId: true } } },
    });
    return results.map((r) => ({
      code: r.game.code,
      finishedAt: r.game.finishedAt,
      placement: r.placement,
      finalMoney: r.finalMoney,
      isWinner: r.isWinner,
    }));
  }

  async update(id: string, dto: UpdateProfileDto) {
    await this.prisma.user.update({ where: { id }, data: dto });
    return this.profile(id);
  }

  async leaderboard(limit = 20) {
    const users = await this.prisma.user.findMany({
      where: { isGuest: false },
      orderBy: [{ wins: 'desc' }, { moneyEarned: 'desc' }],
      take: limit,
      select: { id: true, nickname: true, avatar: true, wins: true, gamesPlayed: true, moneyEarned: true },
    });
    return users;
  }
}
