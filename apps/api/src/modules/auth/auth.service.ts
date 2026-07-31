import { randomUUID } from 'node:crypto';

import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import ms from 'ms';
import type { SignOptions } from 'jsonwebtoken';

import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { SessionMetadata } from './interfaces/session-metadata.interface';

type JwtExpiresIn = NonNullable<SignOptions['expiresIn']>;
type TokenUser = { id: string; email: string; role: string };
type RefreshTokenPayload = TokenUser & { sub: string };

const parseDuration = ms as unknown as (value: string) => number;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto, sessionMetadata: SessionMetadata) {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });

    const tokens = await this.issueTokenPair(user, sessionMetadata);

    return { ...tokens, user };
  }

  async login(dto: LoginDto, sessionMetadata: SessionMetadata) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.usersService.updateLastLogin(user.id);

    const tokens = await this.issueTokenPair(user, sessionMetadata);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const activeSessions = await this.sessionsService.findActiveByUserId(
      payload.sub,
    );

    let session: (typeof activeSessions)[number] | undefined;

    for (const candidate of activeSessions) {
      if (await argon2.verify(candidate.refreshTokenHash, refreshToken)) {
        session = candidate;
        break;
      }
    }

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokens = await this.generateTokenPair(user, session.id);
    const refreshTokenHash = await argon2.hash(tokens.refreshToken);
    const updatedSession = await this.sessionsService.updateRefreshTokenHash(
      session.id,
      refreshTokenHash,
    );

    if (!updatedSession) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.sessionsService.updateLastUsedAt(session.id);

    return tokens;
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionsService.revoke(sessionId);
  }

  private async issueTokenPair(
    user: TokenUser,
    sessionMetadata: SessionMetadata,
  ) {
    const sessionId = randomUUID();
    const tokens = await this.generateTokenPair(user, sessionId);

    await this.createSession(
      sessionId,
      user.id,
      tokens.refreshToken,
      sessionMetadata,
    );

    return tokens;
  }

  private async createSession(
    sessionId: string,
    userId: string,
    refreshToken: string,
    sessionMetadata: SessionMetadata,
  ) {
    const refreshTokenHash = await argon2.hash(refreshToken);
    const expiresIn = this.configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    );
    const expiresAt = new Date(Date.now() + parseDuration(expiresIn));

    return this.sessionsService.createSession({
      id: sessionId,
      userId,
      refreshTokenHash,
      deviceName: sessionMetadata.deviceName,
      userAgent: sessionMetadata.userAgent,
      ipAddress: sessionMetadata.ipAddress,
      expiresAt,
    });
  }

  private async generateTokenPair(user: TokenUser, sessionId: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user, sessionId),
      this.generateRefreshToken(user),
    ]);

    return { accessToken, refreshToken };
  }

  private generateAccessToken(user: TokenUser, sessionId: string) {
    return this.jwtService.signAsync(
      { sub: user.id, sid: sessionId, email: user.email, role: user.role },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.getOrThrow<string>(
          'JWT_ACCESS_EXPIRES_IN',
        ) as JwtExpiresIn,
      },
    );
  }

  private generateRefreshToken(user: TokenUser) {
    return this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.getOrThrow<string>(
          'JWT_REFRESH_EXPIRES_IN',
        ) as JwtExpiresIn,
      },
    );
  }
}
