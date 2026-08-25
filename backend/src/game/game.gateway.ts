import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { GameManager } from './game.manager';

interface SocketUser {
  id: string;
  nickname: string;
  rooms: Set<string>;
}

@WebSocketGateway({ cors: { origin: (process.env.CORS_ORIGIN ?? '*').split(',') } })
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger('GameGateway');
  @WebSocketServer() server!: Server;

  constructor(
    private readonly manager: GameManager,
    private readonly auth: AuthService,
  ) {}

  afterInit(server: Server) {
    this.manager.setServer(server);
  }

  async handleConnection(socket: Socket) {
    const token = socket.handshake.auth?.token || (socket.handshake.query?.token as string);
    if (!token) return socket.disconnect(true);
    try {
      const payload = await this.auth.verifyAccess(token);
      const user: SocketUser = { id: payload.sub, nickname: payload.nickname, rooms: new Set() };
      socket.data.user = user;
    } catch {
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    const user: SocketUser | undefined = socket.data.user;
    if (!user) return;
    for (const code of user.rooms) {
      this.manager.setConnected(user.id, code, false);
      const room = this.manager.getRoom(code);
      if (room) this.manager.broadcastRoom(room);
    }
  }

  private user(socket: Socket): SocketUser {
    const u = socket.data.user;
    if (!u) throw new Error('No autenticado.');
    return u;
  }

  @SubscribeMessage('join_room')
  async joinRoom(@ConnectedSocket() socket: Socket, @MessageBody() body: { code: string }) {
    const user = this.user(socket);
    const code = String(body.code).toUpperCase();
    try {
      await this.manager.join(user, code);
      socket.join(code);
      user.rooms.add(code);
      this.manager.setConnected(user.id, code, true);
      const snap = this.manager.snapshotFor(code);
      socket.emit('snapshot', snap);
      const room = this.manager.getRoom(code);
      if (room) this.manager.broadcastRoom(room);
    } catch (err) {
      socket.emit('error_msg', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('get_state')
  getState(@ConnectedSocket() socket: Socket, @MessageBody() body: { code: string }) {
    const code = String(body.code).toUpperCase();
    socket.join(code);
    this.user(socket).rooms.add(code);
    socket.emit('snapshot', this.manager.snapshotFor(code));
  }

  @SubscribeMessage('leave_room')
  async leaveRoom(@ConnectedSocket() socket: Socket, @MessageBody() body: { code: string }) {
    const user = this.user(socket);
    const code = String(body.code).toUpperCase();
    await this.manager.leave(user.id, code);
    socket.leave(code);
    user.rooms.delete(code);
  }

  @SubscribeMessage('start_game')
  async startGame(@ConnectedSocket() socket: Socket, @MessageBody() body: { code: string }) {
    try {
      await this.manager.start(this.user(socket).id, String(body.code).toUpperCase());
    } catch (err) {
      socket.emit('error_msg', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('command')
  async command(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { code: string; command: string; payload?: any },
  ) {
    const user = this.user(socket);
    try {
      await this.manager.dispatch(user.id, String(body.code).toUpperCase(), body.command as any, body.payload ?? {});
    } catch (err) {
      socket.emit('error_msg', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('chat')
  chat(@ConnectedSocket() socket: Socket, @MessageBody() body: { code: string; text: string }) {
    const user = this.user(socket);
    const text = String(body.text ?? '').slice(0, 300);
    if (!text.trim()) return;
    // Simple per-socket throttle: max ~5 messages per 5s window.
    const now = Date.now();
    const win: number[] = (socket.data.chatWindow ??= []);
    while (win.length && now - win[0] > 5000) win.shift();
    if (win.length >= 5) return socket.emit('error_msg', { message: 'Vas muy rápido con el chat, respira 😅.' });
    win.push(now);
    this.server.to(String(body.code).toUpperCase()).emit('chat', {
      nickname: user.nickname.split('#')[0], // hide the guest #suffix
      text,
      at: Date.now(),
    });
  }
}
