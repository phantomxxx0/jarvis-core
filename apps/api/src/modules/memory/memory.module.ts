import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database';
import { GraphModule } from './graph/graph.module';
import { EpisodicModule } from './episodic/episodic.module';
import { SemanticModule } from './semantic/semantic.module';
import { ProceduralModule } from './procedural/procedural.module';
import { AdaptersModule } from './adapters/adapters.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { RetrievalModule } from './retrieval/retrieval.module';
import { RankingModule } from './ranking/ranking.module';
import { LifecycleModule } from './lifecycle/lifecycle.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    DatabaseModule,
    GraphModule,
    EpisodicModule,
    SemanticModule,
    ProceduralModule,
    AdaptersModule,
    OrchestratorModule,
    RetrievalModule,
    RankingModule,
    LifecycleModule,
    EventsModule,
  ],
  exports: [RetrievalModule],
})
export class MemoryModule {}
