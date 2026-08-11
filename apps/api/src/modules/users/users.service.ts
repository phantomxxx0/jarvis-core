import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@jarvis/database';
import { UsersRepository } from './users.repository';
export interface RecordFailedLoginResult {
  wasJustLocked: boolean;
  currentAttempts: number;
  lockoutUntil: Date | null;
}
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly configService: ConfigService,
  ) {}
  findAll() {
    return this.usersRepository.findAll();
  }
  findById(id: string) {
    return this.usersRepository.findById(id);
  }
  findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }
  findByIdWithPasswordHash(id: string) {
    return this.usersRepository.findByIdWithPasswordHash(id);
  }
  create(data: {
    email: string;
    passwordHash: string;
    name?: string;
    role?: UserRole;
  }) {
    return this.usersRepository.create(data);
  }
  updateLastLogin(id: string) {
    return this.usersRepository.updateLastLogin(id);
  }
  async recordSuccessfulLogin(userId: string) {
    return this.usersRepository.updateSecurityState(userId, {
      failedLoginAttempts: 0,
      lockoutUntil: null,
    });
  }
  async recordFailedLogin(user: {
    id: string;
    failedLoginAttempts: number;
    lockoutUntil: Date | null;
  }): Promise<RecordFailedLoginResult> {
    const now = new Date();
    const lockExpired = user.lockoutUntil !== null && user.lockoutUntil <= now;
    if (user.lockoutUntil && !lockExpired) {
      return {
        wasJustLocked: false,
        currentAttempts: user.failedLoginAttempts,
        lockoutUntil: user.lockoutUntil,
      };
    }
    const maxAttempts = this.configService.getOrThrow<number>(
      'AUTH_MAX_FAILED_ATTEMPTS',
    );
    const lockoutDurationMins = this.configService.getOrThrow<number>(
      'AUTH_LOCKOUT_DURATION_MINS',
    );
    const previousAttempts = lockExpired ? 0 : user.failedLoginAttempts;
    const currentAttempts = previousAttempts + 1;
    const reachedThreshold = currentAttempts >= maxAttempts;
    const wasJustLocked = reachedThreshold && previousAttempts < maxAttempts;
    const lockoutUntil = reachedThreshold
      ? new Date(now.getTime() + lockoutDurationMins * 60_000)
      : null;
    await this.usersRepository.updateSecurityState(user.id, {
      failedLoginAttempts: currentAttempts,
      lockoutUntil,
    });
    return { wasJustLocked, currentAttempts, lockoutUntil };
  }
  async changePassword(id: string, passwordHash: string) {
    return this.usersRepository.updatePassword(id, passwordHash);
  }
}
