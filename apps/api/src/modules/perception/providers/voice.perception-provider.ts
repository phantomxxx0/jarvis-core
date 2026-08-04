import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PerceptionProvider } from '../contracts/perception-provider.interface';
import {
  PerceptionEvent,
  PerceptionSourceType,
} from '../contracts/perception-event.interface';
import { PerceptionManagerService } from '../perception-manager.service';

export interface VoicePayload {
  readonly audioBuffer: Buffer;
  readonly durationMs: number;
  readonly sampleRate: number;
  readonly channels: number;
  readonly isWakeWordDetected: boolean;
  readonly detectedWakeWord?: string;
  readonly confidenceScore?: number;
}

@Injectable()
export class VoicePerceptionProvider implements PerceptionProvider {
  public readonly name = 'VoicePerceptionProvider';
  public readonly sourceType: PerceptionSourceType = 'VOICE';
  private readonly logger = new Logger(VoicePerceptionProvider.name);

  // Configuration for audio buffering
  private audioBuffer: Buffer[] = [];
  private currentBufferDurationMs = 0;
  private readonly maxBufferDurationMs = 10000; // Max 10 seconds per flushed event chunk

  constructor(private readonly perceptionManager: PerceptionManagerService) {}

  isHealthy(): boolean {
    // Health checks for audio hardware (e.g. active microphone stream) could be evaluated here.
    return true;
  }

  /**
   * Ingests raw audio packets from an external microphone stream or websocket.
   */
  async ingestAudioPacket(
    packet: Buffer,
    packetDurationMs: number,
    sampleRate = 16000,
    channels = 1,
  ): Promise<void> {
    try {
      this.audioBuffer.push(packet);
      this.currentBufferDurationMs += packetDurationMs;

      // Simulate a rudimentary wake-word check or acoustic trigger threshold.
      // In a real scenario, this buffer would be passed to a VAD (Voice Activity Detection)
      // or a local wake-word engine (like Porcupine or standard energy thresholds).
      const isWakeWordDetected = this.simulateWakeWordDetection(packet);

      if (
        isWakeWordDetected ||
        this.currentBufferDurationMs >= this.maxBufferDurationMs
      ) {
        await this.flushAudioBuffer(isWakeWordDetected, sampleRate, channels);
      }
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Error ingesting audio packet: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Mock logic for local wake-word detection (e.g. Porcupine PCM frame processing).
   */
  private simulateWakeWordDetection(packet: Buffer): boolean {
    // Returning false currently as we are scaffolding the architecture, not the ML engine.
    void packet;
    return false;
  }

  /**
   * Forces a flush of the current audio buffer and emits a standardized Voice Perception Event.
   */
  public async flushAudioBuffer(
    isWakeWordDetected: boolean,
    sampleRate: number,
    channels: number,
  ): Promise<void> {
    if (this.audioBuffer.length === 0) return;

    const combinedBuffer = Buffer.concat(this.audioBuffer);
    const duration = this.currentBufferDurationMs;

    // Reset buffer state immediately to cleanly ingest subsequent packets without dropping frames.
    this.audioBuffer = [];
    this.currentBufferDurationMs = 0;

    const payload: VoicePayload = {
      audioBuffer: combinedBuffer,
      durationMs: duration,
      sampleRate,
      channels,
      isWakeWordDetected,
      detectedWakeWord: isWakeWordDetected ? 'jarvis' : undefined,
      confidenceScore: isWakeWordDetected ? 0.95 : undefined,
    };

    const event: PerceptionEvent<VoicePayload> = {
      id: randomUUID(),
      sourceType: this.sourceType,
      sourceId: 'mic-primary', // Hardcoded primary mic, could be dynamic per client stream
      timestamp: new Date(),
      payload,
    };

    try {
      await this.perceptionManager.ingestEvent(event);
      this.logger.debug(
        `Emitted VOICE perception event [ID: ${event.id}] - Duration: ${duration}ms, WakeWord: ${isWakeWordDetected}`,
      );
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to emit VOICE event: ${err.message}`,
        err.stack,
      );
    }
  }
}
