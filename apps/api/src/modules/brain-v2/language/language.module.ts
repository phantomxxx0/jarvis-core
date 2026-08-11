import { Module } from '@nestjs/common';
import { LanguageGenerator } from './language.service';
import { PromptBuilder } from './prompt-builder';
import { PersonalityModule } from '../personality/personality.module';
import { WorkingMemoryModule } from '../working-memory/working-memory.module';
import { WorkersModule } from '../../workers/workers.module';

/**
 * LanguageModule (Brain V2)
 *
 * Provides natural language generation. Assembles prompts using Personality
 * and Working Memory, and invokes the InferenceService to generate responses.
 *
 * Exported:
 *   - LanguageGenerator: the entry point for generating language responses.
 */
@Module({
  imports: [PersonalityModule, WorkingMemoryModule, WorkersModule],
  providers: [LanguageGenerator, PromptBuilder],
  exports: [LanguageGenerator],
})
export class LanguageModuleV2 {}
