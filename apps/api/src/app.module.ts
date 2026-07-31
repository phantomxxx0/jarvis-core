import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.getOrThrow<number>('THROTTLE_TTL'),
            limit: config.getOrThrow<number>('THROTTLE_LIMIT'),
          },
        ],
      }),
    }),

    LoggerModule.forRoot(loggerConfig),

    DatabaseModule,

    HealthModule,

    UsersModule,

    AuthModule,
  ],
  providers: [
    // NOTE: Execution order relative to AuthModule's GlobalJwtAuthGuard/
    // RolesGuard (registered separately in AuthModule) is NOT guaranteed
    // by NestJS across module boundaries. This is currently safe because
    // every throttled route (register/login/refresh) is also @Public(),
    // so GlobalJwtAuthGuard is a no-op on them regardless of order. If a
    // protected route is throttled in the future, revisit this.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
