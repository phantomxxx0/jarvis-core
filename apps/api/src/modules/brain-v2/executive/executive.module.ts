import { Module } from '@nestjs/common';
import { ExecutiveService } from './executive.service';
import { ExecutionRouter } from './execution-router';
import { ExecutionEngine } from './execution-engine';
import { MemoryGatewayModule } from '../memory/memory.module';
import { ReasoningModule } from '../reasoning/reasoning.module';
import { PlanningModule } from '../planning/planning.module';
import { SkillsModule } from '../skills/skills.module';
import { WorkingMemoryModule } from '../working-memory/working-memory.module';
import { MetricsModule } from '../metrics/metrics.module';
import { GovernanceModule } from '../../governance/governance.module';
/**
 * ExecutiveModule (Brain V2)
 *
 * Provides the Executive Controller ("Prefrontal Cortex").
 * Makes routing decisions and orchestrates downstream cognitive modules.
 *
 * Exported:
 *   - ExecutiveService: entry point for cognitive routing and execution.
 */
@Module({
  imports: [
    MemoryGatewayModule,
    ReasoningModule,
    PlanningModule,
    SkillsModule,
    WorkingMemoryModule,
    MetricsModule,
    GovernanceModule,
  ],
  providers: [ExecutiveService, ExecutionRouter, ExecutionEngine],
  exports: [ExecutiveService],
})
export class ExecutiveModule {}
