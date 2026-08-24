import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GameEvent, GameState } from '../engine/types';

// Persistence + stats. Best-effort: a DB hiccup must never crash a live game,
// so writes are guarded and logged, not awaited by the game loop.
@Injectable()
export class GameService {
  private readonly logger = new Logger('GameService');

  constructor(private readonly prisma: PrismaService) {}

  async persistEvents(gameId: string, events: GameEvent[]) {
    if (!events.length) return;
    try {
      await this.prisma.gameEvent.createMany({
        data: events.map((e) => ({
          gameId,
          type: e.type,
          playerId: e.playerId ?? null,
          message: e.message,
          data: (e.data ?? {}) as object,
        })),
      });
    } catch (err) {
      this.logger.warn(`No se pudieron persistir eventos: ${(err as Error).message}`);
    }
  }

  async finishGame(state: GameState) {
    try {
      const ranking = [...state.players].sort((a, b) => {
        if (a.bankrupt !== b.bankrupt) return a.bankrupt ? 1 : -1;
        return b.money - a.money;
      });
      await this.prisma.game.update({
        where: { id: state.id },
        data: { status: 'FINISHED', winnerId: state.winnerId, finishedAt: new Date() },
      });
      const durationSec = Math.round((Date.now() - state.startedAt) / 1000);
      for (let i = 0; i < ranking.length; i++) {
        const p = ranking[i];
        await this.prisma.gameResult.upsert({
          where: { gameId_userId: { gameId: state.id, userId: p.userId } },
          create: { gameId: state.id, userId: p.userId, placement: i + 1, finalMoney: p.money, isWinner: p.id === state.winnerId },
          update: { placement: i + 1, finalMoney: p.money, isWinner: p.id === state.winnerId },
        });
        await this.prisma.gamePlayer.updateMany({
          where: { gameId: state.id, userId: p.userId },
          data: { finalMoney: p.money, isWinner: p.id === state.winnerId },
        });
        await this.prisma.user.update({
          where: { id: p.userId },
          data: {
            gamesPlayed: { increment: 1 },
            wins: { increment: p.id === state.winnerId ? 1 : 0 },
            losses: { increment: p.id === state.winnerId ? 0 : 1 },
            bankruptcies: { increment: p.bankrupt ? 1 : 0 },
            moneyEarned: { increment: p.totalEarned },
            moneyLost: { increment: p.totalSpent },
            propsAcquired: { increment: p.propsBought },
            timePlayedSec: { increment: durationSec },
          },
        });
      }
    } catch (err) {
      this.logger.warn(`No se pudo cerrar la partida en DB: ${(err as Error).message}`);
    }
  }
}
