import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response, Request } from 'express';
import { randomUUID } from 'crypto';
import { BrainRouterService } from '../brain-router/brain-router.service';
import { ApiKeyAuthGuard } from '../auth/guards/api-key-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { ChatCompletionDto } from './dto/chat-completion.dto';

@Public()
@UseGuards(ApiKeyAuthGuard)
@Controller('v1')
export class OpenAIController {
  constructor(private readonly brainService: BrainRouterService) {}

  @Get('models')
  getModels() {
    return {
      object: 'list',
      data: [
        {
          id: 'jarvis-core',
          object: 'model',
          created: 1677610602,
          owned_by: 'jarvis',
        },
      ],
    };
  }

  @Post('chat/completions')
  async chatCompletions(
    @Req() req: Request,
    @Body() dto: ChatCompletionDto,
    @Res() res: Response,
  ) {
    const user = (req as any).user;
    const userId = user?.id || 'system-service-account';
    
    // We generate a transient session ID since REST calls are stateless
    // and OpenAI chat API doesn't pass session IDs natively.
    const sessionId = randomUUID();

    const latestMessage = dto.messages.length > 0
      ? dto.messages[dto.messages.length - 1].content
      : '';

    if (dto.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const sendChunk = (content: string) => {
        const payload = {
          id: `chatcmpl-${sessionId}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: dto.model || 'jarvis-core',
          choices: [
            {
              index: 0,
              delta: { content },
              finish_reason: null,
            },
          ],
        };
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      };

      try {
        let tokenStreamed = false;

        const answer = await this.brainService.think(
          latestMessage,
          userId,
          sessionId,
          (eventType: string, eventData: unknown) => {
            if (eventType === 'token') {
              tokenStreamed = true;
              sendChunk((eventData as any).content || '');
            }
          },
        );

        if (!tokenStreamed) {
          sendChunk(answer);
        }

        // Send final [DONE] chunk
        res.write('data: [DONE]\n\n');
      } catch (error) {
        // Send error chunk if possible, or just close
        const errorPayload = {
          error: {
            message: error instanceof Error ? error.message : 'Internal Server Error',
            type: 'server_error',
          },
        };
        res.write(`data: ${JSON.stringify(errorPayload)}\n\n`);
        res.write('data: [DONE]\n\n');
      } finally {
        res.end();
      }
    } else {
      try {
        const result = await this.brainService.processRequest(
          latestMessage,
          userId,
          sessionId,
        );

        res.json({
          id: `chatcmpl-${sessionId}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: dto.model || 'jarvis-core',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: result.answer,
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        });
      } catch (error) {
        res.status(500).json({
          error: {
            message: error instanceof Error ? error.message : 'Internal Server Error',
            type: 'server_error',
          },
        });
      }
    }
  }
}
