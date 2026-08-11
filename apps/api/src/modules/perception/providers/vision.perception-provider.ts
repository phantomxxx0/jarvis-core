import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PerceptionProvider } from '../contracts/perception-provider.interface';
import {
  PerceptionEvent,
  PerceptionSourceType,
} from '../contracts/perception-event.interface';
import { PerceptionManagerService } from '../perception-manager.service';

export interface VisionPayload {
  readonly frameBuffer: Buffer;
  readonly mimeType: string;
  readonly width: number;
  readonly height: number;
  readonly sceneAnalysis?: Record<string, unknown>;
  readonly sourceMetadata?: Record<string, unknown>;
}

@Injectable()
export class VisionPerceptionProvider implements PerceptionProvider {
  public readonly name = 'VisionPerceptionProvider';
  public readonly sourceType: PerceptionSourceType = 'VISION';
  private readonly logger = new Logger(VisionPerceptionProvider.name);

  constructor(private readonly perceptionManager: PerceptionManagerService) {}

  isHealthy(): boolean {
    // Later we can implement health checks for specific camera streams or webRTC connections
    return true;
  }

  /**
   * Ingests a raw image or video frame into the visual perception pipeline.
   */
  async ingestFrame(
    sourceId: string,
    frameBuffer: Buffer,
    mimeType: string,
    width: number,
    height: number,
    sceneAnalysis?: Record<string, unknown>,
    sourceMetadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const payload: VisionPayload = {
        frameBuffer,
        mimeType,
        width,
        height,
        sceneAnalysis,
        sourceMetadata,
      };

      const event: PerceptionEvent<VisionPayload> = {
        id: randomUUID(),
        sourceType: this.sourceType,
        sourceId,
        timestamp: new Date(),
        payload,
      };

      await this.perceptionManager.ingestEvent(event);

      this.logger.debug(
        `Emitted VISION perception event [ID: ${event.id}] - Resolution: ${width}x${height}, Mime: ${mimeType}`,
      );
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to ingest VISION frame: ${err.message}`,
        err.stack,
      );
    }
  }
}
