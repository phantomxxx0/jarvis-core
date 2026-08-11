import { Module } from '@nestjs/common';
import { PlanningGateway } from './planning.service';

/**
 * PlanningModule (Brain V2)
 *
 * Native V2 planning module. Provides PlanningGateway, which decomposes
 * goals into ordered steps via TaskDecomposer and Scheduler.
 * The ExecutionRouter imports this to invoke planning only when needed.
 *
 * Exported:
 *   - PlanningGateway: the V2-facing planning interface.
 */
@Module({
  providers: [PlanningGateway],
  exports: [PlanningGateway],
})
export class PlanningModule {}
