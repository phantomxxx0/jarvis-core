import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(
      dto.email,
    );

    if (existingUser) {
      throw new ConflictException(
        'Email already registered',
      );
    }

    const passwordHash = await argon2.hash(
      dto.password,
    );

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });

    const accessToken =
      await this.jwtService.signAsync({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

    return {
      accessToken,
      user,
    };
  }
}
