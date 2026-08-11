import { Module } from '@nestjs/common';
import { GraphModule } from '../graph/graph.module';
import { EpisodicModule } from '../episodic/episodic.module';
import { SemanticModule } from '../semantic/semantic.module';
import { ProceduralModule } from '../procedural/procedural.module';
import { AdaptersModule } from '../adapters/adapters.module';
import { RankingModule } from '../ranking/ranking.module';
import { ContextComposerService } from './context-composer.service';

import { ConversationsModule } from '../../conversations/conversations.module';
import { LifecycleModule } from '../lifecycle/lifecycle.module';

@Module({
  imports: [
    GraphModule,
    EpisodicModule,
    SemanticModule,
    ProceduralModule,
    AdaptersModule,
    RankingModule,
    ConversationsModule,
    LifecycleModule,
  ],
  providers: [ContextComposerService],
  exports: [ContextComposerService],
})
export class RetrievalModule {}
