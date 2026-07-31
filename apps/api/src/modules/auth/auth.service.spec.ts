import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));
describe('AuthService.refresh', () => {
  const user = {
    id: 'user-id',
    email: 'user@example.com',
    role: 'USER',
    isActive: true,
  };
  const usersService = { findById: jest.fn() };
  const sessionsService = {
    findActiveByUserId: jest.fn(),
    updateRefreshTokenHash: jest.fn(),
    updateLastUsedAt: jest.fn(),
    revoke: jest.fn(),
    revokeAllForUser: jest.fn(),
  };
  const jwtService = {
    verifyAsync: jest.fn(),
    signAsync: jest.fn(),
  };
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('secret'),
  };
  const service = new AuthService(
    usersService as unknown as UsersService,
    sessionsService as unknown as SessionsService,
    jwtService as unknown as JwtService,
    configService as never,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    (argon2.verify as unknown as jest.Mock).mockResolvedValue(true);
    (argon2.hash as unknown as jest.Mock).mockResolvedValue(
      'rotated-token-hash',
    );
    configService.getOrThrow.mockReturnValue('secret');
    jwtService.verifyAsync.mockResolvedValue({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    jwtService.signAsync.mockResolvedValue('rotated-token');
    usersService.findById.mockResolvedValue(user);
    sessionsService.findActiveByUserId.mockResolvedValue([
      {
        id: 'session-id',
        userId: user.id,
        refreshTokenHash: 'stored-token-hash',
      },
    ]);
    sessionsService.updateRefreshTokenHash.mockResolvedValue({
      id: 'session-id',
    });
  });
  it('rotates a valid refresh token', async () => {
    await expect(service.refresh('refresh-token')).resolves.toEqual({
      accessToken: 'rotated-token',
      refreshToken: 'rotated-token',
    });
    expect(sessionsService.updateRefreshTokenHash).toHaveBeenCalledWith(
      'session-id',
      'rotated-token-hash',
    );
    expect(sessionsService.updateLastUsedAt).toHaveBeenCalledWith('session-id');
  });
  it('rejects when no session matches the stored refresh token hash', async () => {
    (argon2.verify as unknown as jest.Mock).mockResolvedValue(false);
    await expect(service.refresh('old-refresh-token')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(sessionsService.updateRefreshTokenHash).not.toHaveBeenCalled();
    expect(sessionsService.revokeAllForUser).toHaveBeenCalledWith('user-id');
    expect(sessionsService.revokeAllForUser).toHaveBeenCalledTimes(1);
  });
  it('treats refresh token reuse as a security event: revokes all sessions and rejects', async () => {
    (argon2.verify as unknown as jest.Mock).mockResolvedValue(false);

    await expect(service.refresh('stolen-refresh-token')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(sessionsService.revokeAllForUser).toHaveBeenCalledWith('user-id');
    expect(sessionsService.revokeAllForUser).toHaveBeenCalledTimes(1);
  });
});
describe('AuthService.logout', () => {
  const usersService = { findById: jest.fn() };
  const sessionsService = {
    revoke: jest.fn(),
  };
  const jwtService = {
    verifyAsync: jest.fn(),
    signAsync: jest.fn(),
  };
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('secret'),
  };
  const service = new AuthService(
    usersService as unknown as UsersService,
    sessionsService as unknown as SessionsService,
    jwtService as unknown as JwtService,
    configService as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('revokes the session for a valid sessionId', async () => {
    sessionsService.revoke.mockResolvedValue({ id: 'session-id' });

    await expect(service.logout('session-id')).resolves.toBeUndefined();
    expect(sessionsService.revoke).toHaveBeenCalledWith('session-id');
  });

  it('does not throw when the session is already revoked or missing', async () => {
    sessionsService.revoke.mockResolvedValue(null);

    await expect(service.logout('session-id')).resolves.toBeUndefined();
    expect(sessionsService.revoke).toHaveBeenCalledWith('session-id');
  });
});
describe('AuthService.logoutAll', () => {
  const usersService = { findById: jest.fn() };
  const sessionsService = {
    revokeAllForUser: jest.fn(),
  };
  const jwtService = {
    verifyAsync: jest.fn(),
    signAsync: jest.fn(),
  };
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('secret'),
  };
  const service = new AuthService(
    usersService as unknown as UsersService,
    sessionsService as unknown as SessionsService,
    jwtService as unknown as JwtService,
    configService as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('revokes all sessions for the given userId', async () => {
    sessionsService.revokeAllForUser.mockResolvedValue(undefined);

    await expect(service.logoutAll('user-id')).resolves.toBeUndefined();
    expect(sessionsService.revokeAllForUser).toHaveBeenCalledWith('user-id');
  });

  it('does not throw when the user has no active sessions', async () => {
    sessionsService.revokeAllForUser.mockResolvedValue(undefined);

    await expect(service.logoutAll('user-id')).resolves.toBeUndefined();
    expect(sessionsService.revokeAllForUser).toHaveBeenCalledWith('user-id');
  });
});
describe('AuthService.sessions', () => {
  const usersService = { findById: jest.fn() };
  const sessionsService = {
    findByUserId: jest.fn(),
    findById: jest.fn(),
    revoke: jest.fn(),
  };
  const jwtService = {
    verifyAsync: jest.fn(),
    signAsync: jest.fn(),
  };
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('secret'),
  };
  const service = new AuthService(
    usersService as unknown as UsersService,
    sessionsService as unknown as SessionsService,
    jwtService as unknown as JwtService,
    configService as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('listSessions', () => {
    it('returns mapped sessions without refreshTokenHash or userId', async () => {
      sessionsService.findByUserId.mockResolvedValue([
        {
          id: 'session-id',
          userId: 'user-id',
          refreshTokenHash: 'secret-hash',
          deviceName: 'Chrome on macOS',
          userAgent: 'Mozilla/5.0',
          ipAddress: '127.0.0.1',
          isRevoked: false,
          lastUsedAt: new Date('2026-01-01T00:00:00Z'),
          createdAt: new Date('2026-01-01T00:00:00Z'),
          expiresAt: new Date('2026-02-01T00:00:00Z'),
        },
      ]);

      const result = await service.listSessions('user-id');

      expect(result).toEqual([
        {
          id: 'session-id',
          deviceName: 'Chrome on macOS',
          userAgent: 'Mozilla/5.0',
          ipAddress: '127.0.0.1',
          isRevoked: false,
          lastUsedAt: new Date('2026-01-01T00:00:00Z'),
          createdAt: new Date('2026-01-01T00:00:00Z'),
          expiresAt: new Date('2026-02-01T00:00:00Z'),
        },
      ]);
      expect(result[0]).not.toHaveProperty('refreshTokenHash');
      expect(result[0]).not.toHaveProperty('userId');
    });
  });

  describe('revokeSession', () => {
    it('revokes a session owned by the current user', async () => {
      sessionsService.findById.mockResolvedValue({
        id: 'session-id',
        userId: 'user-id',
      });
      sessionsService.revoke.mockResolvedValue({ id: 'session-id' });

      await expect(
        service.revokeSession('user-id', 'session-id'),
      ).resolves.toBeUndefined();
      expect(sessionsService.revoke).toHaveBeenCalledWith('session-id');
    });

    it('throws NotFoundException when the session does not exist', async () => {
      sessionsService.findById.mockResolvedValue(null);

      await expect(
        service.revokeSession('user-id', 'missing-session'),
      ).rejects.toThrow(NotFoundException);
      expect(sessionsService.revoke).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the session belongs to another user', async () => {
      sessionsService.findById.mockResolvedValue({
        id: 'session-id',
        userId: 'other-user-id',
      });

      await expect(
        service.revokeSession('user-id', 'session-id'),
      ).rejects.toThrow(NotFoundException);
      expect(sessionsService.revoke).not.toHaveBeenCalled();
    });
  });
});
