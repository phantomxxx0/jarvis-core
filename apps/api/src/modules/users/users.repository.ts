import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { users, UserRole } from '@jarvis/database';

import { DatabaseService } from '../../database';

export interface SecurityStateUpdate {
  failedLoginAttempts?: number;
  lockoutUntil?: Date | null;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly database: DatabaseService) {}

  async findAll() {
    return this.database.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users);
  }

  async findById(id: string) {
    const [user] = await this.database.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id));

    return user;
  }

  async findByEmail(email: string) {
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.email, email));

    return user;
  }

  async create(data: {
    email: string;
    passwordHash: string;
    name?: string;
    role?: UserRole;
  }) {
    const [user] = await this.database.db
      .insert(users)
      .values({
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
        role: data.role ?? UserRole.USER,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    return user;
  }

  async updateLastLogin(id: string) {
    const [user] = await this.database.db
      .update(users)
      .set({
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return user;
  }

  async updateSecurityState(id: string, data: SecurityStateUpdate) {
    const [user] = await this.database.db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();

    return user;
  }
}
