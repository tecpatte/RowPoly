import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { GuestDto, LoginDto, RegisterDto } from './dto';

export interface JwtPayload {
  sub: string;
  nickname: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const clash = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { nickname: dto.nickname }] },
    });
    if (clash) throw new ConflictException('El correo o el nickname ya están en uso.');
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: { email: dto.email, nickname: dto.nickname, passwordHash },
    });
    return this.tokensFor(user.id, user.nickname, user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.isGuest) throw new UnauthorizedException('Credenciales inválidas.');
    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas.');
    return this.tokensFor(user.id, user.nickname, user);
  }

  async guest(dto: GuestDto) {
    // Guests get a throwaway account so they can join rooms and be tracked.
    const suffix = Math.random().toString(36).slice(2, 7);
    const user = await this.prisma.user.create({
      data: {
        email: `guest_${suffix}@rowpoly.local`,
        nickname: `${dto.nickname}#${suffix}`,
        passwordHash: 'guest',
        isGuest: true,
      },
    });
    return this.tokensFor(user.id, user.nickname, user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'rowpoly_refresh_dev',
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new Error('gone');
      return this.tokensFor(user.id, user.nickname, user);
    } catch {
      throw new UnauthorizedException('Sesión expirada.');
    }
  }

  private async tokensFor(sub: string, nickname: string, user: { id: string; nickname: string; email: string; avatar: string | null; isGuest: boolean }) {
    const payload: JwtPayload = { sub, nickname };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_SECRET ?? 'rowpoly_dev',
      expiresIn: process.env.JWT_EXPIRES ?? '2h',
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET ?? 'rowpoly_refresh_dev',
      expiresIn: process.env.JWT_REFRESH_EXPIRES ?? '7d',
    });
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, nickname: user.nickname, email: user.email, avatar: user.avatar, isGuest: user.isGuest },
    };
  }

  // Used by the WebSocket gateway to authenticate a socket handshake.
  async verifyAccess(token: string): Promise<JwtPayload> {
    return this.jwt.verifyAsync<JwtPayload>(token, {
      secret: process.env.JWT_SECRET ?? 'rowpoly_dev',
    });
  }
}
