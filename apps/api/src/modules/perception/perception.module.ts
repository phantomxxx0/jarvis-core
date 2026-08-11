import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PerceptionManagerService } from './perception-manager.service';
import { WebhookController } from './controllers/webhook.controller';
import { WebhookProvider } from './providers/webhook/webhook.provider';
import { GithubController } from './controllers/github.controller';
import { GithubProvider } from './providers/github/github.provider';
import { FilesystemProvider } from './providers/filesystem/filesystem.provider';
import { VoicePerceptionProvider } from './providers/voice.perception-provider';
import { VisionPerceptionProvider } from './providers/vision.perception-provider';
import { PerceptionContextProvider } from './providers/perception.context-provider';
import { PERCEPTION_PROVIDERS } from './contracts/perception-provider.interface';
import { CONTEXT_PROVIDERS } from '../brain/context/contracts/context-provider.interface';

const providers = [
  WebhookProvider,
  GithubProvider,
  FilesystemProvider,
  VoicePerceptionProvider,
  VisionPerceptionProvider,
];

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [WebhookController, GithubController],
  providers: [
    PerceptionManagerService,
    PerceptionContextProvider,
    ...providers,
    ...providers.map((provider) => ({
      provide: PERCEPTION_PROVIDERS,
      useExisting: provider,
    })),
    {
      provide: CONTEXT_PROVIDERS,
      useExisting: PerceptionContextProvider,
    },
  ],
  exports: [PerceptionManagerService, PerceptionContextProvider],
})
export class PerceptionModule {}
