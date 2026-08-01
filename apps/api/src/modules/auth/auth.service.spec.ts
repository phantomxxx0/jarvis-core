import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuditService } from '../audit/audit.service';
import { SessionsService } from '../sessions/sessions.service';
import { AuthService } from './auth.service';
jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));
describe('AuthService.login', () => {
  const user = {
    id: 'user-id',
    email: 'user@example.com',
    passwordHash: 'stored-hash',
    role: 'USER',
    name: 'Test User',
    isActive: true,
    failedLoginAttempts: 0,
    lockoutUntil: null as Date | null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
  const sessionMetadata = {
    deviceName: 'Chrome on macOS',
    userAgent: 'Mozilla/5.0',
    ipAddress: '127.0.0.1',
  };
  const usersService = {
    findByEmail: jest.fn(),
    updateLastLogin: jest.fn(),
    recordFailedLogin: jest.fn(),
    recordSuccessfulLogin: jest.fn(),
  };
  const sessionsService = {
    createSession: jest.fn(),
  };
  const jwtService = {
    signAsync: jest.fn(),
  };
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('secret'),
  };
  const auditService: Partial<AuditService> = {
    loginSuccess: jest.fn(),
    loginFailure: jest.fn(),
    accountLocked: jest.fn(),
  };
  const service = new AuthService(
    usersService,
    sessionsService as unknown as SessionsService,
    jwtService as unknown as JwtService,
    configService as never,
    auditService as unknown as AuditService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    configService.getOrThrow.mockReturnValue('secret');
    (argon2.verify as unknown as jest.Mock).mockResolvedValue(true);
    (argon2.hash as unknown as jest.Mock).mockResolvedValue('token-hash');
    jwtService.signAsync.mockResolvedValue('token');
    usersService.findByEmail.mockResolvedValue(user);
    usersService.updateLastLogin.mockResolvedValue(undefined);
    usersService.recordSuccessfulLogin.mockResolvedValue(undefined);
    usersService.recordFailedLogin.mockResolvedValue({
      wasJustLocked: false,
      currentAttempts: 1,
      lockoutUntil: null,
    });
    sessionsService.createSession.mockResolvedValue({ id: 'session-id' });
  });

  it('logs LoginSuccess after a successful login', async () => {
    await service.login(
      { email: user.email, password: 'correct-password' },
      sessionMetadata,
    );

    expect(auditService.loginSuccess).toHaveBeenCalledWith({
      userId: user.id,
      email: user.email,
      ipAddress: sessionMetadata.ipAddress,
      userAgent: sessionMetadata.userAgent,
    });
    expect(auditService.loginFailure).not.toHaveBeenCalled();
    expect(usersService.recordSuccessfulLogin).toHaveBeenCalledWith(user.id);
    expect(usersService.updateLastLogin).toHaveBeenCalledWith(user.id);
  });

  it('logs LoginFailure for an invalid password', async () => {
    (argon2.verify as unknown as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login(
        { email: user.email, password: 'wrong-password' },
        sessionMetadata,
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(auditService.loginFailure).toHaveBeenCalledWith({
      email: user.email,
      ipAddress: sessionMetadata.ipAddress,
      userAgent: sessionMetadata.userAgent,
    });
    expect(auditService.loginSuccess).not.toHaveBeenCalled();
  });

  it('logs LoginFailure for an unknown email', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.login(
        { email: 'missing@example.com', password: 'any-password' },
        sessionMetadata,
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(auditService.loginFailure).toHaveBeenCalledWith({
      email: 'missing@example.com',
      ipAddress: sessionMetadata.ipAddress,
      userAgent: sessionMetadata.userAgent,
    });
    expect(auditService.loginSuccess).not.toHaveBeenCalled();
  });
  it('rejects with the generic message when the account is actively locked', async () => {
    usersService.findByEmail.mockResolvedValue({
      ...user,
      lockoutUntil: new Date(Date.now() + 15 * 60_000),
    });

    await expect(
      service.login(
        { email: user.email, password: 'correct-password' },
        sessionMetadata,
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(argon2.verify).not.toHaveBeenCalled();
    expect(usersService.recordFailedLogin).not.toHaveBeenCalled();
    expect(usersService.recordSuccessfulLogin).not.toHaveBeenCalled();
    expect(auditService.loginFailure).toHaveBeenCalledTimes(1);
    expect(auditService.accountLocked).not.toHaveBeenCalled();
  });

  it('emits AccountLocked exactly once when a failed login crosses the lockout threshold', async () => {
    (argon2.verify as unknown as jest.Mock).mockResolvedValue(false);
    const lockoutUntil = new Date(Date.now() + 15 * 60_000);
    usersService.recordFailedLogin.mockResolvedValue({
      wasJustLocked: true,
      currentAttempts: 5,
      lockoutUntil,
    });

    await expect(
      service.login(
        { email: user.email, password: 'wrong-password' },
        sessionMetadata,
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(usersService.recordFailedLogin).toHaveBeenCalledTimes(1);
    expect(auditService.accountLocked).toHaveBeenCalledTimes(1);
    expect(auditService.accountLocked).toHaveBeenCalledWith({
      userId: user.id,
      email: user.email,
      lockoutUntil,
    });
    expect(auditService.loginFailure).toHaveBeenCalledTimes(1);
  });
});
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
  const auditService: Partial<AuditService> = {
    refreshTokenReuse: jest.fn(),
  };
  const service = new AuthService(
    usersService,
    sessionsService as unknown as SessionsService,
    jwtService as unknown as JwtService,
    configService as never,
    auditService as unknown as AuditService,
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
    expect(auditService.refreshTokenReuse).not.toHaveBeenCalled();
  });
  it('rejects when no session matches the stored refresh token hash', async () => {
    (argon2.verify as unknown as jest.Mock).mockResolvedValue(false);
    await expect(service.refresh('old-refresh-token')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(sessionsService.updateRefreshTokenHash).not.toHaveBeenCalled();
    expect(sessionsService.revokeAllForUser).toHaveBeenCalledWith('user-id');
    expect(sessionsService.revokeAllForUser).toHaveBeenCalledTimes(1);
    expect(auditService.refreshTokenReuse).toHaveBeenCalledWith({
      userId: 'user-id',
    });
  });
  it('treats refresh token reuse as a security event: revokes all sessions and rejects', async () => {
    (argon2.verify as unknown as jest.Mock).mockResolvedValue(false);

    await expect(service.refresh('stolen-refresh-token')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(sessionsService.revokeAllForUser).toHaveBeenCalledWith('user-id');
    expect(sessionsService.revokeAllForUser).toHaveBeenCalledTimes(1);
    expect(auditService.refreshTokenReuse).toHaveBeenCalledWith({
      userId: 'user-id',
    });
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
  const auditService: Partial<AuditService> = {
    logout: jest.fn(),
  };
  const service = new AuthService(
    usersService,
    sessionsService as unknown as SessionsService,
    jwtService as unknown as JwtService,
    configService as never,
    auditService as unknown as AuditService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('revokes the session for a valid sessionId', async () => {
    sessionsService.revoke.mockResolvedValue({ id: 'session-id' });

    await expect(service.logout('session-id')).resolves.toBeUndefined();
    expect(sessionsService.revoke).toHaveBeenCalledWith('session-id');
    expect(auditService.logout).toHaveBeenCalledWith({
      sessionId: 'session-id',
    });
  });

  it('does not throw when the session is already revoked or missing', async () => {
    sessionsService.revoke.mockResolvedValue(null);

    await expect(service.logout('session-id')).resolves.toBeUndefined();
    expect(sessionsService.revoke).toHaveBeenCalledWith('session-id');
    expect(auditService.logout).toHaveBeenCalledWith({
      sessionId: 'session-id',
    });
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
  const auditService: Partial<AuditService> = {
    logoutAll: jest.fn(),
  };
  const service = new AuthService(
    usersService,
    sessionsService as unknown as SessionsService,
    jwtService as unknown as JwtService,
    configService as never,
    auditService as unknown as AuditService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('revokes all sessions for the given userId', async () => {
    sessionsService.revokeAllForUser.mockResolvedValue(undefined);

    await expect(service.logoutAll('user-id')).resolves.toBeUndefined();
    expect(sessionsService.revokeAllForUser).toHaveBeenCalledWith('user-id');
    expect(auditService.logoutAll).toHaveBeenCalledWith({ userId: 'user-id' });
  });

  it('does not throw when the user has no active sessions', async () => {
    sessionsService.revokeAllForUser.mockResolvedValue(undefined);

    await expect(service.logoutAll('user-id')).resolves.toBeUndefined();
    expect(sessionsService.revokeAllForUser).toHaveBeenCalledWith('user-id');
    expect(auditService.logoutAll).toHaveBeenCalledWith({ userId: 'user-id' });
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
  const auditService: Partial<AuditService> = {
    logout: jest.fn(),
  };
  const service = new AuthService(
    usersService,
    sessionsService as unknown as SessionsService,
    jwtService as unknown as JwtService,
    configService as never,
    auditService as unknown as AuditService,
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
