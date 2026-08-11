import { Injectable } from '@nestjs/common';
import { and, eq, gt, lt, ne } from 'drizzle-orm';

import { sessions } from '@jarvis/database';

import { DatabaseService } from '../../../database/database.service';

@Injectable()
export class SessionsRepository {
  constructor(private readonly database: DatabaseService) {}

  protected get db() {
    return this.database.db;
  }

  async create(values: typeof sessions.$inferInsert) {
    const [session] = await this.db.insert(sessions).values(values).returning();

    return session;
  }

  async findById(id: string) {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id));

    return session ?? null;
  }

  async findActiveById(id: string) {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, id),
          eq(sessions.isRevoked, false),
          gt(sessions.expiresAt, new Date()),
        ),
      );

    return session ?? null;
  }

  async findByUserId(userId: string) {
    return this.db.select().from(sessions).where(eq(sessions.userId, userId));
  }

  async findActiveByUserId(userId: string) {
    return this.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          eq(sessions.isRevoked, false),
          gt(sessions.expiresAt, new Date()),
        ),
      );
  }

  async updateRefreshTokenHash(id: string, refreshTokenHash: string) {
    const [session] = await this.db
      .update(sessions)
      .set({
        refreshTokenHash,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, id))
      .returning();

    return session ?? null;
  }

  async updateLastUsedAt(id: string) {
    const [session] = await this.db
      .update(sessions)
      .set({
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, id))
      .returning();

    return session ?? null;
  }

  async revoke(id: string) {
    const [session] = await this.db
      .update(sessions)
      .set({
        isRevoked: true,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, id))
      .returning();

    return session ?? null;
  }

  async revokeAllForUser(userId: string) {
    return this.db
      .update(sessions)
      .set({
        isRevoked: true,
        updatedAt: new Date(),
      })
      .where(eq(sessions.userId, userId));
  }
  async revokeAllForUserExcept(userId: string, exceptSessionId: string) {
    return this.db
      .update(sessions)
      .set({
        isRevoked: true,
        updatedAt: new Date(),
      })
      .where(
        and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId)),
      );
  }

  async deleteExpired() {
    return this.db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  }
}
