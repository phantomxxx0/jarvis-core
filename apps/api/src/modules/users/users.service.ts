import { Injectable } from '@nestjs/common';

import { UserRole } from '@jarvis/database';

import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
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
}
