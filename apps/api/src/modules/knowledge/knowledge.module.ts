import { Module } from '@nestjs/common';

import { MemoriesModule } from '../memories/memories.module';

import { KnowledgeService } from './knowledge.service';

@Module({
  imports: [
    MemoriesModule,
  ],

  providers: [
    KnowledgeService,
  ],

  exports: [
    KnowledgeService,
  ],
})
export class KnowledgeModule {}