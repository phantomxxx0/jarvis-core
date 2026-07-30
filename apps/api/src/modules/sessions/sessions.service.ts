import { Injectable } from '@nestjs/common';

import { sessions } from '@jarvis/database';

import { SessionsRepository } from './repositories/sessions.repository';

@Injectable()
export class SessionsService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  async createSession(
    values: typeof sessions.$inferInsert,
  ) {
    return this.sessionsRepository.create(values);
  }

  async findById(id: string) {
    return this.sessionsRepository.findById(id);
  }

  async findActiveById(id: string) {
    return this.sessionsRepository.findActiveById(id);
  }

  async findByUserId(userId: string) {
    return this.sessionsRepository.findByUserId(userId);
  }

  async updateRefreshTokenHash(
    id: string,
    refreshTokenHash: string,
  ) {
    return this.sessionsRepository.updateRefreshTokenHash(
      id,
      refreshTokenHash,
    );
  }

  async updateLastUsedAt(id: string) {
    return this.sessionsRepository.updateLastUsedAt(id);
  }

  async revoke(id: string) {
    return this.sessionsRepository.revoke(id);
  }

  async revokeAllForUser(userId: string) {
    return this.sessionsRepository.revokeAllForUser(userId);
  }

  async deleteExpired() {
    return this.sessionsRepository.deleteExpired();
  }
}
