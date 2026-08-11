import { Module } from '@nestjs/common';
import { PersonalityService } from './personality.service';

/**
 * PersonalityModule (Brain V2)
 *
 * Provides Jarvis's stable personality character for injection
 * into Language Generator prompts.
 *
 * Zero external dependencies — personality is fully declarative.
 */
@Module({
  providers: [PersonalityService],
  exports: [PersonalityService],
})
export class PersonalityModule {}
