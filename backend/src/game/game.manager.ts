import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { GameService } from './game.service';
import { GameEngine, NewPlayer } from '../engine/game-engine';
import { BOARD, CARDS, GAME_CONFIG, PLAYER_COLORS } from '../engine/board.config';
import { GameConfig, GameEvent, GameState, Phase } from '../engine/types';

export interface Member {
  userId: string;
  nickname: string;
  color: string;
  connected: boolean;
}

export interface Room {
  id: string;
  code: string;
  status: 'WAITING' | 'PLAYING' | 'FINISHED' | 'CANCELLED';
  hostUserId: string;
  maxPlayers: number;
  isPrivate: boolean;
  startingMoney: number;
  members: Member[];
  engine: GameEngine | null;
  state: GameState | null;
  turnTimer: NodeJS.Timeout | null;
  cleanupTimer: NodeJS.Timeout | null;
}

// Grace window before a finished room is evicted from memory, so reconnecting
// clients can still pull the final snapshot / results.
const FINISHED_ROOM_TTL_MS = 5 * 60 * 1000;

// A disconnected player's turn auto-ends after this instead of the full timer.
const DISCONNECTED_TURN_MS = 15 * 1000;

type Command =
  | 'ROLL_DICE'
  | 'BUY_PROPERTY'
  | 'DECLINE_BUY'
  | 'BUILD_HOUSE'
  | 'BUILD_HOTEL'
  | 'END_TURN'
  | 'MORTGAGE'
  | 'UNMORTGAGE'
  | 'SELL_BUILDING'
  | 'PAY_BAIL'
  | 'PROPOSE_TRADE'
  | 'RESPOND_TRADE'
  | 'DECLARE_BANKRUPTCY';

@Injectable()
export class GameManager {
  private readonly logger = new Logger('GameManager');
  private readonly rooms = new Map<string, Room>(); // keyed by code
  private server: Server | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly games: GameService,
  ) {}

  setServer(server: Server) {
    this.server = server;
  }

  // ---- Lobby --------------------------------------------------------------
  async createRoom(
    user: { id: string; nickname: string },
    opts: { isPrivate?: boolean; maxPlayers?: number; startingMoney?: number },
  ): Promise<Room> {
    const code = await this.uniqueCode();
    const game = await this.prisma.game.create({
      data: {
        code,
        status: 'WAITING',
        isPrivate: opts.isPrivate ?? false,
        maxPlayers: opts.maxPlayers ?? 6,
        hostId: user.id,
        settings: { startingMoney: opts.startingMoney ?? GAME_CONFIG.startingMoney },
      },
    });
    const room: Room = {
      id: game.id,
      code,
      status: 'WAITING',
      hostUserId: user.id,
      maxPlayers: game.maxPlayers,
      isPrivate: game.isPrivate,
      startingMoney: opts.startingMoney ?? GAME_CONFIG.startingMoney,
      members: [],
      engine: null,
      state: null,
      turnTimer: null,
      cleanupTimer: null,
    };
    this.rooms.set(code, room);
    await this.addMember(room, user); // host joins their own room
    return room;
  }

  // Matchmaking: drop the player into the fullest joinable public room, or make
  // a fresh one if none exist.
  async quickPlay(user: { id: string; nickname: string }): Promise<Room> {
    const open = [...this.rooms.values()]
      .filter((r) => r.status === 'WAITING' && !r.isPrivate && r.members.length < r.maxPlayers)
      .sort((a, b) => b.members.length - a.members.length);
    const target = open.find((r) => !r.members.some((m) => m.userId === user.id));
    if (target) return this.join(user, target.code);
    return this.createRoom(user, {});
  }

  listPublic() {
    return [...this.rooms.values()]
      .filter((r) => r.status === 'WAITING' && !r.isPrivate)
      .map((r) => this.summary(r));
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  async join(user: { id: string; nickname: string }, code: string): Promise<Room> {
    const room = this.require(code);
    if (room.status !== 'WAITING') throw new Error('La partida ya empezó.');
    const already = room.members.find((m) => m.userId === user.id);
    if (already) {
      already.connected = true;
      return room;
    }
    if (room.members.length >= room.maxPlayers) throw new Error('La sala está llena.');
    await this.addMember(room, user);
    this.broadcastRoom(room);
    return room;
  }

  async leave(userId: string, code: string): Promise<void> {
    const room = this.getRoom(code);
    if (!room) return;
    room.members = room.members.filter((m) => m.userId !== userId);
    if (room.status === 'WAITING') {
      await this.prisma.gamePlayer.deleteMany({ where: { gameId: room.id, userId } }).catch(() => {});
      if (room.members.length === 0) {
        room.status = 'CANCELLED';
        this.rooms.delete(room.code);
        await this.prisma.game.update({ where: { id: room.id }, data: { status: 'CANCELLED' } }).catch(() => {});
        return;
      }
      if (room.hostUserId === userId) room.hostUserId = room.members[0].userId;
    }
    this.broadcastRoom(room);
  }

  async start(userId: string, code: string): Promise<Room> {
    const room = this.require(code);
    if (room.hostUserId !== userId) throw new Error('Solo el anfitrión puede iniciar.');
    if (room.status !== 'WAITING') throw new Error('La partida ya empezó.');
    if (room.members.length < 2) throw new Error('Se necesitan al menos 2 jugadores.');

    const config: GameConfig = { ...GAME_CONFIG, startingMoney: room.startingMoney };
    room.engine = new GameEngine(BOARD, CARDS, config);
    const players: NewPlayer[] = room.members.map((m) => ({ userId: m.userId, nickname: m.nickname }));
    room.state = room.engine.createGame(room.id, room.code, players, PLAYER_COLORS);
    room.status = 'PLAYING';

    await this.prisma.game.update({ where: { id: room.id }, data: { status: 'PLAYING', startedAt: new Date() } }).catch(() => {});
    await this.games.persistEvents(room.id, room.state.log);
    this.broadcastRoom(room);
    this.broadcastState(room, room.state.log);
    this.scheduleTurnTimer(room);
    return room;
  }

  // ---- Game commands ------------------------------------------------------
  async dispatch(userId: string, code: string, command: Command, payload: any): Promise<void> {
    const room = this.require(code);
    if (!room.engine || !room.state) throw new Error('La partida no está activa.');
    const engine = room.engine;
    const state = room.state;
    let events: GameEvent[] = [];

    switch (command) {
      case 'ROLL_DICE':
        events = engine.rollDice(state, userId);
        break;
      case 'BUY_PROPERTY':
        events = engine.buyProperty(state, userId);
        break;
      case 'DECLINE_BUY':
        events = engine.declineBuy(state, userId);
        break;
      case 'BUILD_HOUSE':
        events = engine.buildHouse(state, userId, Number(payload?.position));
        break;
      case 'BUILD_HOTEL':
        events = engine.buildHotel(state, userId, Number(payload?.position));
        break;
      case 'END_TURN':
        events = engine.endTurn(state, userId);
        break;
      case 'MORTGAGE':
        events = engine.mortgageProperty(state, userId, Number(payload?.position));
        break;
      case 'UNMORTGAGE':
        events = engine.unmortgageProperty(state, userId, Number(payload?.position));
        break;
      case 'SELL_BUILDING':
        events = engine.sellBuilding(state, userId, Number(payload?.position));
        break;
      case 'PAY_BAIL':
        events = engine.payBail(state, userId);
        break;
      case 'PROPOSE_TRADE':
        events = engine.proposeTrade(state, userId, payload.toPlayerId, payload.offer, payload.request).events;
        break;
      case 'RESPOND_TRADE':
        events = engine.respondTrade(state, userId, payload.tradeId, !!payload.accept);
        break;
      case 'DECLARE_BANKRUPTCY':
        events = engine.declareBankruptcy(state, userId);
        break;
      default:
        throw new Error('Comando desconocido.');
    }

    await this.games.persistEvents(room.id, events);
    this.broadcastState(room, events);
    this.scheduleTurnTimer(room);

    if (state.phase === 'ENDED') {
      this.clearTimer(room);
      room.status = 'FINISHED';
      await this.games.finishGame(state);
      this.scheduleCleanup(room);
    }
  }

  setConnected(userId: string, code: string, connected: boolean) {
    const room = this.getRoom(code);
    if (!room) return;
    const member = room.members.find((m) => m.userId === userId);
    if (member) member.connected = connected;
    if (room.engine && room.state) {
      room.engine.setConnected(room.state, userId, connected);
      // A (dis)connection changes how long the current turn should be held.
      if (room.status === 'PLAYING') this.scheduleTurnTimer(room);
    }
  }

  // ---- Broadcasting -------------------------------------------------------
  broadcastRoom(room: Room) {
    this.server?.to(room.code).emit('room_update', this.summary(room));
  }

  broadcastState(room: Room, events: GameEvent[]) {
    if (!room.state) return;
    this.server?.to(room.code).emit('game_state', this.sanitize(room.state));
    if (events.length) this.server?.to(room.code).emit('game_events', events);
  }

  // Full snapshot for a reconnecting / newly-subscribed socket.
  snapshotFor(code: string) {
    const room = this.getRoom(code);
    if (!room) return null;
    return { room: this.summary(room), state: room.state ? this.sanitize(room.state) : null };
  }

  // ---- Turn timer (server-authoritative timeout) --------------------------
  private scheduleTurnTimer(room: Room) {
    this.clearTimer(room);
    const state = room.state;
    if (!state || state.phase === 'ENDED' || !state.turnDeadline) return;
    let ms = Math.max(0, state.turnDeadline - Date.now());
    // A disconnected current player shouldn't hold the table for the full turn.
    const current = state.players[state.currentTurnIndex];
    if (current && !current.connected) ms = Math.min(ms, DISCONNECTED_TURN_MS);
    room.turnTimer = setTimeout(() => this.onTimeout(room), ms);
  }

  private async onTimeout(room: Room) {
    if (!room.engine || !room.state || room.state.phase === 'ENDED') return;
    try {
      const events = room.engine.forceEndTurn(room.state);
      await this.games.persistEvents(room.id, events);
      this.broadcastState(room, events);
      this.scheduleTurnTimer(room);
      if ((room.state.phase as Phase) === 'ENDED') {
        room.status = 'FINISHED';
        await this.games.finishGame(room.state);
        this.scheduleCleanup(room);
      }
    } catch (err) {
      this.logger.warn(`Timeout error: ${(err as Error).message}`);
    }
  }

  private clearTimer(room: Room) {
    if (room.turnTimer) clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }

  // Evict a finished room from memory after a grace window so the Map doesn't
  // grow unbounded on a long-running server.
  private scheduleCleanup(room: Room) {
    if (room.cleanupTimer) return;
    room.cleanupTimer = setTimeout(() => this.rooms.delete(room.code), FINISHED_ROOM_TTL_MS);
  }

  // Clear all pending timers (graceful shutdown / tests).
  stopAll() {
    for (const room of this.rooms.values()) {
      this.clearTimer(room);
      if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
      room.cleanupTimer = null;
    }
  }

  // ---- Helpers ------------------------------------------------------------
  private async addMember(room: Room, user: { id: string; nickname: string }) {
    const color = PLAYER_COLORS[room.members.length % PLAYER_COLORS.length];
    // Show only the chosen name; the "#suffix" (guest uniqueness) is hidden in-game.
    const nickname = user.nickname.split('#')[0];
    room.members.push({ userId: user.id, nickname, color, connected: true });
    await this.prisma.gamePlayer
      .upsert({
        where: { gameId_userId: { gameId: room.id, userId: user.id } },
        create: { gameId: room.id, userId: user.id, nickname, color, order: room.members.length - 1 },
        update: {},
      })
      .catch(() => {});
  }

  private summary(room: Room) {
    return {
      id: room.id,
      code: room.code,
      status: room.status,
      hostUserId: room.hostUserId,
      maxPlayers: room.maxPlayers,
      isPrivate: room.isPrivate,
      startingMoney: room.startingMoney,
      members: room.members,
    };
  }

  // Never leak the shuffled deck order / pointers to clients (would reveal
  // upcoming cards). Trim the log to the recent tail.
  private sanitize(state: GameState) {
    const { deckOrder, deckPointers, log, ...rest } = state;
    return { ...rest, log: log.slice(-60) };
  }

  private require(code: string): Room {
    const room = this.getRoom(code);
    if (!room) throw new Error('La sala no existe.');
    return room;
  }

  private async uniqueCode(): Promise<string> {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempt = 0; attempt < 20; attempt++) {
      let code = '';
      for (let i = 0; i < 5; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
      if (!this.rooms.has(code)) {
        const exists = await this.prisma.game.findUnique({ where: { code } }).catch(() => null);
        if (!exists) return code;
      }
    }
    throw new Error('No se pudo generar un código de sala.');
  }
}
