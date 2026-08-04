import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { BrainService } from '../brain/brain.service';
import { ChatDto } from './dto/chat.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AIController {
  constructor(private readonly brainService: BrainService) {}

  @Post('chat')
  async chat(@CurrentUser() user: JwtPayload, @Body() dto: ChatDto) {
    const result = await this.brainService.processChat(dto.messages, user.id);
    return {
      success: true,
      statusCode: 201,
      timestamp: new Date().toISOString(),
      path: '/ai/chat',
      data: result.answer,
    };
  }

  @Post('stream')
  async streamChat(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChatDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      sendEvent('status', { message: 'Initializing cognitive pipeline...' });

      const latestMessage =
        dto.messages[dto.messages.length - 1]?.content || '';

      sendEvent('status', { message: 'Extracting intent and planning...' });
      const answer = await this.brainService.think(
        latestMessage,
        user.id,
        (eventType: string, eventData: any) => {
          sendEvent(eventType, eventData);
        },
      );

      sendEvent('token', { content: answer });
      sendEvent('complete', { success: true });
    } catch (error) {
      sendEvent('error', {
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      res.end();
    }
  }
}
