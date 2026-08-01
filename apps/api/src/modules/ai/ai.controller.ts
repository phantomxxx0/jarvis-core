import { Body, Controller, Post } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

import { AIService } from './ai.service';
import { ChatDto } from './dto/chat.dto';

@Controller('ai')
export class AIController {
  constructor(
    private readonly aiService: AIService,
  ) {}

  @Post('chat')
  async chat(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChatDto,
  ) {
    const answer = await this.aiService.chat(
      user.id,
      dto.messages,
    );

    return {
      answer,
    };
  }
}
