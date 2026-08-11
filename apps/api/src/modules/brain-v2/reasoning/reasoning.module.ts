import { Module } from '@nestjs/common';
import { ReasoningGateway } from './reasoning.service';
import { InferenceModule } from '../../workers/inference/inference.module';

/**
 * ReasoningModule (Brain V2)
 *
 * Native V2 reasoning module. Provides ReasoningGateway, which performs
 * structured LLM-based reasoning directly via InferenceService — no V1
 * dependency.
 *
 * The ExecutiveModule imports this to invoke reasoning
 * only when the ExecutiveDecision requires it.
 *
 * Exported:
 *   - ReasoningGateway: the V2-facing reasoning interface.
 */
@Module({
  imports: [InferenceModule],
  providers: [ReasoningGateway],
  exports: [ReasoningGateway],
})
export class ReasoningModule {}
