import { Module } from '@nestjs/common';
import { ReflectionGateway } from './reflection.service';
import { InferenceModule } from '../../workers/inference/inference.module';

/**
 * ReflectionModule (Brain V2)
 *
 * Background-only reflection module. Native V2 implementation —
 * ReflectionGateway performs structured LLM-based reflection directly
 * via InferenceService. No V1 dependency.
 */
@Module({
  imports: [InferenceModule],
  providers: [ReflectionGateway],
  exports: [ReflectionGateway],
})
export class ReflectionModuleV2 {}
