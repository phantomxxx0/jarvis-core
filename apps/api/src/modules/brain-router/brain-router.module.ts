import { Module } from '@nestjs/common';
import { BrainRouterService } from './brain-router.service';
import { BrainModule } from '../brain/brain.module';
import { BrainV2Module } from '../brain-v2/brain-v2.module';

@Module({
  imports: [BrainModule, BrainV2Module],
  providers: [BrainRouterService],
  exports: [BrainRouterService],
})
export class BrainRouterModule {}
