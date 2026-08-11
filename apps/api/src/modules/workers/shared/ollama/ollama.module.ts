import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OllamaClient } from './ollama.client';

@Module({
  imports: [HttpModule],
  providers: [OllamaClient],
  exports: [OllamaClient],
})
export class OllamaModule {}
