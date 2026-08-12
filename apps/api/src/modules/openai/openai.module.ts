import { Module } from '@nestjs/common';
import { OpenAIController } from './openai.controller';
import { BrainRouterModule } from '../brain-router/brain-router.module';

@Module({
  imports: [BrainRouterModule],
  controllers: [OpenAIController],
})
export class OpenAIModule {}
