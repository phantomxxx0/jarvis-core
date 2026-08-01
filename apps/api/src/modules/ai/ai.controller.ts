import { Body, Controller, Post } from '@nestjs/common';

import { AIService } from './ai.service';
import { ChatDto } from './dto/chat.dto';

@Controller('ai')
export class AIController {
  constructor(
    private readonly aiService: AIService,
  ) {}

  @Post('chat')
  async chat(
    @Body() dto: ChatDto,
  ) {
    const answer = await this.aiService.chat(
      dto.messages,
    );

    return {
      answer,
    };
  }
}
