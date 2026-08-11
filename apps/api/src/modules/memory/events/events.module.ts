import { Module } from '@nestjs/common';
import { SemanticModule } from '../semantic/semantic.module';
import { GraphModule } from '../graph/graph.module';
import { AdaptersModule } from '../adapters/adapters.module';
import { EpisodicModule } from '../episodic/episodic.module';
import { ProceduralModule } from '../procedural/procedural.module';

import { MemoryFactListener } from './listeners/memory-fact.listener';
import { MemoryRelationshipListener } from './listeners/memory-relationship.listener';
import { MemoryPreferenceListener } from './listeners/memory-preference.listener';
import { MemoryGoalListener } from './listeners/memory-goal.listener';
import { MemoryEpisodeListener } from './listeners/memory-episode.listener';
import { MemoryProcedureListener } from './listeners/memory-procedure.listener';
import { MemoryProjectListener } from './listeners/memory-project.listener';
import { MemoryDeviceListener } from './listeners/memory-device.listener';

@Module({
  imports: [
    SemanticModule,
    GraphModule,
    AdaptersModule,
    EpisodicModule,
    ProceduralModule,
  ],
  providers: [
    MemoryFactListener,
    MemoryRelationshipListener,
    MemoryPreferenceListener,
    MemoryGoalListener,
    MemoryEpisodeListener,
    MemoryProcedureListener,
    MemoryProjectListener,
    MemoryDeviceListener,
  ],
})
export class EventsModule {}
