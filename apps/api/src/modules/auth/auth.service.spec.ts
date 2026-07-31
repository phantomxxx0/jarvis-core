import { UnauthorizedException } from '@nestjs/common';
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
  });
});
