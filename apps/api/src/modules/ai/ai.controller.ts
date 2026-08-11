import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'crypto';

import { BrainRouterService } from '../brain-router/brain-router.service';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

import { ChatDto } from './dto/chat.dto';

@Controller('ai')
export class AIController {
  constructor(private readonly brainService: BrainRouterService) {}

  @Post('chat')
  async chat(@Body() dto: ChatDto, @CurrentUser() user: JwtPayload) {
    const sessionId = dto.sessionId || randomUUID();
    const latestMessage = dto.messages[dto.messages.length - 1]?.content || '';

    const result = await this.brainService.processRequest(
      latestMessage,
      user.id,
      sessionId,
    );

    return result.answer;
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

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const sessionId = dto.sessionId || randomUUID();

      sendEvent('session', {
        sessionId,
      });

      sendEvent('status', {
        message: 'Initializing cognitive pipeline...',
      });

      const latestMessage =
        dto.messages[dto.messages.length - 1]?.content || '';

      sendEvent('status', {
        message: 'Extracting intent and planning...',
      });

      // Tracks whether an incremental 'token' event has already been
      // streamed via onProgress (V2 forwards each generated chunk this
      // way). V1 never emits 'token' via onProgress — only 'status' —
      // so this stays false on the V1 path, preserving its existing
      // behavior exactly: the full answer is sent as a single 'token'
      // event below. On the V2 path, tokens have already been streamed
      // incrementally by the time think() resolves, so re-sending the
      // full answer here would duplicate content the client already
      // received — that final send is skipped.
      let tokenStreamed = false;

      const answer = await this.brainService.think(
        latestMessage,
        user.id,
        sessionId,
        (eventType: string, eventData: unknown) => {
          if (eventType === 'token') {
            tokenStreamed = true;
          }
          sendEvent(eventType, eventData);
        },
      );

      if (!tokenStreamed) {
        sendEvent('token', {
          content: answer,
        });
      }

      sendEvent('complete', {
        success: true,
      });
    } catch (error) {
      sendEvent('error', {
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      res.end();
    }
  }
}
