import { Controller, Get } from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@jarvis/database';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Roles(UserRole.ADMIN)
  @Get('admin')
  adminDashboard() {
    return {
      success: true,
      message: 'Welcome Admin',
    };
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('super-admin')
  superAdminDashboard() {
    return {
      success: true,
      message: 'Welcome Super Admin',
    };
  }
}
