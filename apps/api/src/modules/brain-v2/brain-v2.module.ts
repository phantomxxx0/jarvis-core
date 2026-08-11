import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { BrainV2Service } from './brain-v2.service';
import { PerceptionModule } from './perception/perception.module';
import { AttentionModule } from './attention/attention.module';
import { ExecutiveModule } from './executive/executive.module';
import { LanguageModuleV2 } from './language/language.module';
import { WorkingMemoryModule } from './working-memory/working-memory.module';
import { EmotionModule } from './emotion/emotion.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ReflectionModuleV2 } from './reflection/reflection.module';
import { LearningModuleV2 } from './learning/learning.module';
import { ConsciousnessModule } from './consciousness/consciousness.module';
import { MetricsModule } from './metrics/metrics.module';
import { BrainV2EventsModule } from './events/events.module';
import { UsersModule } from '../users/users.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { AdaptersModule } from '../memory/adapters/adapters.module';
import { GovernanceModule } from '../governance/governance.module';
// Import Inference dependencies for the warmup script
import { InferenceModule } from '../workers/inference/inference.module';
import { InferenceService } from '../workers/inference/services/inference.service';
import { InferenceProviderType } from '../workers/inference/enums/provider.enum';
@Module({
  imports: [
    PerceptionModule,
    AttentionModule,
    ExecutiveModule,
    LanguageModuleV2,
    WorkingMemoryModule,
    EmotionModule,
    SchedulerModule,
    ReflectionModuleV2,
    LearningModuleV2,
    ConsciousnessModule,
    MetricsModule,
    BrainV2EventsModule,
    InferenceModule,
    UsersModule,
    ConversationsModule,
    AdaptersModule,
    GovernanceModule,
  ],
  providers: [BrainV2Service],
  exports: [BrainV2Service],
})
export class BrainV2Module implements OnModuleInit {
  private readonly logger = new Logger(BrainV2Module.name);
  constructor(private readonly inferenceService: InferenceService) {}
  onModuleInit() {
    this.warmupOllama();
  }
  private async warmupOllama() {
    this.logger.log('Warming up Ollama VRAM in the background...');
    try {
      await this.inferenceService.infer(InferenceProviderType.OLLAMA, {
        modelId: 'llama3.1:8b',
        messages: [{ role: 'user', content: 'warmup' }],
        maxTokens: 1,
        keepAlive: -1,
      });
      this.logger.log(
        '✅ Ollama VRAM warmup complete. llama3.1:8b is locked and ready.',
      );
    } catch (err) {
      this.logger.warn(`⚠️ Ollama warmup failed: ${(err as Error).message}`);
    }
  }
}
