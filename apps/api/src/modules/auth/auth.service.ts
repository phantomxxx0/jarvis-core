import { randomUUID } from 'node:crypto';

import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import ms from 'ms';
import type { SignOptions } from 'jsonwebtoken';

import { AuditService } from '../audit/audit.service';
import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { SessionMetadata } from './interfaces/session-metadata.interface';

type JwtExpiresIn = NonNullable<SignOptions['expiresIn']>;
type TokenUser = { id: string; email: string; role: string };
type RefreshTokenPayload = TokenUser & { sub: string };

export interface SessionSummary {
  id: string;
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  isRevoked: boolean;
  lastUsedAt: Date;
  createdAt: Date;
  expiresAt: Date;
}

const parseDuration = ms as unknown as (value: string) => number;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
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
      this.auditService.loginFailure({
        email: dto.email,
        ipAddress: sessionMetadata.ipAddress ?? null,
        userAgent: sessionMetadata.userAgent ?? null,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!(await argon2.verify(user.passwordHash, dto.password))) {
      this.auditService.loginFailure({
        email: dto.email,
        ipAddress: sessionMetadata.ipAddress ?? null,
        userAgent: sessionMetadata.userAgent ?? null,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.usersService.updateLastLogin(user.id);

    const tokens = await this.issueTokenPair(user, sessionMetadata);

    this.auditService.loginSuccess({
      userId: user.id,
      email: user.email,
      ipAddress: sessionMetadata.ipAddress ?? null,
      userAgent: sessionMetadata.userAgent ?? null,
    });

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
      return this.handleRefreshTokenReuse(payload.sub);
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
    this.auditService.logout({ sessionId });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionsService.revokeAllForUser(userId);
    this.auditService.logoutAll({ userId });
  }

  async listSessions(userId: string): Promise<SessionSummary[]> {
    const sessions = await this.sessionsService.findByUserId(userId);

    return sessions.map((session): SessionSummary => ({
      id: session.id,
      deviceName: session.deviceName,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      isRevoked: session.isRevoked,
      lastUsedAt: session.lastUsedAt,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionsService.findById(sessionId);

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Session not found');
    }

    await this.sessionsService.revoke(sessionId);
  }

  private async handleRefreshTokenReuse(userId: string): Promise<never> {
    await this.sessionsService.revokeAllForUser(userId);

    this.auditService.refreshTokenReuse({ userId });

    throw new UnauthorizedException('Invalid or expired refresh token');
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
