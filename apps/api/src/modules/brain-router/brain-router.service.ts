import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { BrainService } from '../brain/brain.service';
import { BrainV2Service } from '../brain-v2/brain-v2.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BrainRouterService {
  private readonly logger = new Logger(BrainRouterService.name);
  private readonly useV2: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly brainV1: BrainService,
    private readonly brainV2: BrainV2Service,
  ) {
    this.useV2 = this.config.get<string>('USE_BRAIN_V2') === 'true';
    if (this.useV2) {
      this.logger.log('Brain Router initialized: Routing to Brain V2');
    } else {
      this.logger.log('Brain Router initialized: Routing to Brain V1');
    }
  }

  /**
   * Universal entry point for AI processing.
   * Routes to the appropriate Brain version based on feature flags.
   */
  async processRequest(
    message: string,
    userId: string,
    sessionId: string,
  ): Promise<{ answer: string; traceId?: string }> {
    if (this.useV2) {
      this.logger.debug(`[BrainRouter] Routing to V2 for session=${sessionId}`);
      const output = await this.brainV2.process({
        userId,
        sessionId,
        timestamp: new Date(),
        modality: 'text',
        rawInput: message,
        metadata: {},
      });
      return {
        answer: output.content,
        traceId: output.cognitiveTrace?.traceId,
      };
    } else {
      this.logger.debug(`[BrainRouter] Routing to V1 for session=${sessionId}`);
      const result = await this.brainV1.processChat(
        [{ role: 'user', content: message }],
        userId,
      );
      return {
        answer: result.answer,
      };
    }
  }

  /**
   * Streaming entry point.
   *
   * V1: delegates directly to BrainService.think(), forwarding onProgress
   * unchanged. V1 has no internal error handling (see brain.service.ts —
   * think()/processChat() have no try/catch anywhere in the chain), so
   * any failure propagates as a thrown error exactly as it always has.
   * Callers (e.g. AIController.streamChat()) already rely on this to
   * produce an SSE 'error' event.
   *
   * V2: delegates to BrainV2Service.processStream(), forwarding each
   * generated chunk through onProgress as a 'token' event so callers
   * already built around onProgress-based streaming (like
   * AIController.streamChat()) receive genuine incremental output.
   *
   * Error normalization (V2 only, at this boundary only):
   * processStream() has a deliberate two-part contract — pre-generation
   * failures return a graceful fallback BrainOutput
   * (cognitiveTrace.usedFallback === true) rather than throwing, while
   * post-generation failures throw directly. To preserve V1-equivalent
   * behavior at this router boundary (all failures surface as thrown
   * errors to the caller), a fallback result is normalized into a
   * synthetic thrown Error here. This does NOT modify BrainV2Service or
   * its fallback design in any way — the normalization is purely a
   * router-level translation, and it triggers only on the existing
   * cognitiveTrace.usedFallback marker, never by inspecting content.
   */
  async think(
    prompt: string,
    userId: string,
    onProgress?: (event: string, data: any) => void,
  ): Promise<string> {
    if (this.useV2) {
      const sessionId = randomUUID();
      this.logger.debug(
        `[BrainRouter] Streaming via Brain V2 for user=${userId} session=${sessionId}`,
      );

      const result = await this.brainV2.processStream(
        {
          userId,
          sessionId,
          timestamp: new Date(),
          modality: 'text',
          rawInput: prompt,
          metadata: {},
        },
        (chunk: string) => {
          onProgress?.('token', { content: chunk });
        },
      );

      if (result.cognitiveTrace?.usedFallback === true) {
        this.logger.error(
          `[BrainRouter] V2 streaming returned a fail-closed fallback for session=${sessionId}; normalizing to thrown error.`,
        );
        throw new Error(
          'Brain V2 streaming cognitive cycle failed before generation.',
        );
      }

      return result.content;
    }

    return this.brainV1.think(prompt, userId, onProgress);
  }
}
