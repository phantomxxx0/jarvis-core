import { Module } from '@nestjs/common';
import { MemoryValidatorService } from './memory-validator.service';

@Module({
  providers: [MemoryValidatorService],
  exports: [MemoryValidatorService],
})
export class ValidationModule {}
