import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';

import { DatabaseModule } from './database';

import { validate } from './config/env.validation';
import { loggerConfig } from './config/logger.config';

import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { MemoriesModule } from './modules/memories/memories.module';
import { AIModule } from './modules/ai/ai.module';

import { BrainModule } from './modules/brain/brain.module';
import { BrainV2Module } from './modules/brain-v2/brain-v2.module';
import { BrainRouterModule } from './modules/brain-router/brain-router.module';

import { PersonalIntelligenceModule } from './modules/personal-intelligence/personal-intelligence.module';
import { WorldModelModule } from './modules/world-model/world-model.module';
import { ObservationModule } from './modules/observation/observation.module';
import { RuntimeModule } from './modules/runtime/runtime.module';
import { ClusterModule } from './modules/cluster/cluster.module';
import { MemoryModule } from './modules/memory/memory.module';
import { VectorModule } from './modules/vector/vector.module';
import { GovernanceModule } from './modules/governance/governance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
      validate,
    }),

    EventEmitterModule.forRoot(),

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
    MemoriesModule,

    // AI API
    AIModule,

    // Brain Engines
    BrainModule,
    BrainV2Module,

    // Brain Router (switches between V1/V2)
    BrainRouterModule,

    // Cognitive Subsystems
    VectorModule,
    MemoryModule,
    PersonalIntelligenceModule,
    WorldModelModule,
    ObservationModule,
    RuntimeModule,
    ClusterModule,

    // Governance
    GovernanceModule,
  ],
})
export class AppModule {}
