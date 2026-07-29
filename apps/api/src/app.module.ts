import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { DatabaseModule } from './database';
import { validate } from './config/env.validation';
import { loggerConfig } from './config/logger.config';

import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
      validate,
    }),

    LoggerModule.forRoot(loggerConfig),

    DatabaseModule,

    HealthModule,

    UsersModule,

    AuthModule,
  ],
})
export class AppModule {}
