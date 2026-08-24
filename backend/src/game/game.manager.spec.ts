import { afterAll, describe, expect, it } from 'vitest';
import { GameManager } from './game.manager';
import { GameService } from './game.service';

// Stub Prisma: the live game runs in memory, so persistence can be a no-op here.
// This proves the manager → engine → broadcast → turn-loop wiring end to end
// without needing a real database.
function stubPrisma(): any {
  let n = 0;
  const ok = async () => ({});
  return {
    game: { create: async (a: any) => ({ id: `game${n++}`, maxPlayers: a.data.maxPlayers, isPrivate: a.data.isPrivate }), update: ok, findUnique: async () => null },
    gamePlayer: { upsert: ok, deleteMany: ok, updateMany: ok },
    gameEvent: { createMany: ok },
    gameResult: { upsert: ok },
    user: { update: ok },
  };
}

// Fake Socket.IO server capturing every broadcast.
function fakeServer() {
  const emits: Array<{ room: string; event: string; payload: any }> = [];
  const server: any = { to: (room: string) => ({ emit: (event: string, payload: any) => emits.push({ room, event, payload }) }) };
  return { server, emits };
}

const prisma = stubPrisma();
const games = new GameService(prisma);
const manager = new GameManager(prisma, games);
const { server, emits } = fakeServer();
manager.setServer(server);

afterAll(() => manager.stopAll());

describe('GameManager — flujo multijugador (integración)', () => {
  const ana = { id: 'u1', nickname: 'Ana' };
  const beto = { id: 'u2', nickname: 'Beto' };
  let code = '';

  it('crea sala con el anfitrión como primer miembro', async () => {
    const room = await manager.createRoom(ana, { maxPlayers: 4, startingMoney: 1500 });
    code = room.code;
    expect(room.members).toHaveLength(1);
    expect(room.hostUserId).toBe('u1');
  });

  it('un segundo jugador se une y se difunde la sala', async () => {
    await manager.join(beto, code);
    expect(manager.getRoom(code)!.members).toHaveLength(2);
    expect(emits.some((e) => e.event === 'room_update')).toBe(true);
  });

  it('el anfitrión inicia y se emite el estado del juego', async () => {
    await manager.start('u1', code);
    const room = manager.getRoom(code)!;
    expect(room.status).toBe('PLAYING');
    expect(room.state!.phase).toBe('ROLLING');
    expect(emits.some((e) => e.event === 'game_state')).toBe(true);
  });

  it('rechaza acciones fuera de turno vía el manager', async () => {
    const notCurrent = manager.getRoom(code)!.state!.players[manager.getRoom(code)!.state!.currentTurnIndex].userId === 'u1' ? 'u2' : 'u1';
    await expect(manager.dispatch(notCurrent, code, 'ROLL_DICE', {})).rejects.toThrow('No es tu turno.');
  });

  it('corre la partida: turnos rotan, comandos despachan y se difunde estado', async () => {
    const room = manager.getRoom(code)!;
    const startEmits = emits.length;
    const turnsSeen = new Set<number>();
    // A randomised game without hotels can legitimately never terminate (as in
    // real Monopoly), so we assert the wiring, not a win. Bankruptcy→win is
    // deterministically covered in the engine unit test.
    for (let i = 0; i < 400 && room.state!.phase !== 'ENDED'; i++) {
      const state = room.state!;
      turnsSeen.add(state.currentTurnIndex);
      const user = state.players[state.currentTurnIndex].userId;
      const phase = state.phase;
      try {
        if (phase === 'ROLLING') await manager.dispatch(user, code, 'ROLL_DICE', {});
        else if (phase === 'DECISION') await manager.dispatch(user, code, 'BUY_PROPERTY', {}).catch(() => manager.dispatch(user, code, 'DECLINE_BUY', {}));
        else if (phase === 'ACTION') await manager.dispatch(user, code, 'END_TURN', {});
      } catch {
        if (room.state!.phase === 'ACTION') await manager.dispatch(user, code, 'END_TURN', {}).catch(() => {});
      }
    }
    expect(emits.length).toBeGreaterThan(startEmits + 30); // muchas difusiones
    expect(turnsSeen.size).toBeGreaterThanOrEqual(2); // el turno rotó entre jugadores
    expect(emits.some((e) => e.event === 'game_state')).toBe(true);
    if (room.state!.phase === 'ENDED') expect(room.state!.winnerId).toBeTruthy();
  });

  it('quickPlay mete al jugador en la sala pública abierta', async () => {
    const carla = { id: 'u3', nickname: 'Carla' };
    // La sala de arriba ya está PLAYING; quickPlay debe crear una nueva.
    const room = await manager.quickPlay(carla);
    expect(room.status).toBe('WAITING');
    expect(room.members.some((m) => m.userId === 'u3')).toBe(true);
    // Un segundo quickPlay de otro jugador cae en la MISMA sala abierta.
    const room2 = await manager.quickPlay({ id: 'u4', nickname: 'Dani' });
    expect(room2.code).toBe(room.code);
  });
});
