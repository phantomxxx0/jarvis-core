import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ContextProvider,
  ContextSection,
} from '../../brain/context/contracts/context-provider.interface';
import type { PerceptionEvent } from '../contracts/perception-event.interface';

@Injectable()
export class PerceptionContextProvider implements ContextProvider {
  public readonly name = 'PerceptionContext';
  public readonly defaultTimeoutMs = 1000;
  private readonly logger = new Logger(PerceptionContextProvider.name);

  // In-memory buffer for recent unconsumed events.
  // In a production system, this could be Redis or PostgreSQL to scale horizontally.
  private readonly eventBuffer: PerceptionEvent[] = [];
  private readonly MAX_BUFFER_SIZE = 100;

  isHealthy(): boolean {
    return true;
  }

  @OnEvent('perception.any')
  handlePerceptionEvent(event: PerceptionEvent) {
    this.eventBuffer.push(event);
    if (this.eventBuffer.length > this.MAX_BUFFER_SIZE) {
      this.eventBuffer.shift();
    }
  }

  buildContext(query: string): Promise<ContextSection> {
    // 1. Snapshot and clear the unconsumed buffer (simulate "consumption")
    const unconsumedEvents = [...this.eventBuffer];
    this.eventBuffer.length = 0;

    // Ignore query in this provider; we just flush all recent events
    void query;

    if (unconsumedEvents.length === 0) {
      return Promise.resolve({
        source: this.name,
        title: 'Recent Perception Events',
        content: 'No recent sensory events detected.',
        hasData: false,
        priority: 85,
      });
    }

    // 2. Format the events into a context string
    const formattedEvents = unconsumedEvents.map((event) => {
      let payloadSummary = 'Unknown Payload';
      try {
        if (event.sourceType === 'VOICE' && this.isRecord(event.payload)) {
          const wakeWord =
            typeof event.payload.detectedWakeWord === 'string'
              ? event.payload.detectedWakeWord
              : 'None';
          payloadSummary = `Voice Activity. Wake Word: ${wakeWord}`;
        } else if (
          event.sourceType === 'VISION' &&
          this.isRecord(event.payload)
        ) {
          const w =
            typeof event.payload.width === 'number' ? event.payload.width : 0;
          const h =
            typeof event.payload.height === 'number' ? event.payload.height : 0;
          payloadSummary = `Visual Frame. Resolution: ${w}x${h}`;
        } else if (
          event.sourceType === 'FILESYSTEM' &&
          this.isRecord(event.payload)
        ) {
          const action =
            typeof event.payload.action === 'string'
              ? event.payload.action
              : 'unknown';
          const path =
            typeof event.payload.path === 'string'
              ? event.payload.path
              : 'unknown';
          payloadSummary = `File modified: ${action} on ${path}`;
        } else {
          payloadSummary = JSON.stringify(event.payload);
        }
      } catch (e) {
        const err = e as Error;
        payloadSummary = `Unparsable payload: ${err.message}`;
      }

      return `[${event.timestamp.toISOString()}] [${event.sourceType}] ${event.sourceId} - ${payloadSummary}`;
    });

    this.logger.debug(
      `Flushed ${unconsumedEvents.length} perception events into Context`,
    );

    return Promise.resolve({
      source: this.name,
      title: 'Recent Perception Events (Unconsumed)',
      content: formattedEvents.join('\n'),
      hasData: true,
      priority: 85,
    });
  }

  private isRecord(payload: unknown): payload is Record<string, unknown> {
    return typeof payload === 'object' && payload !== null;
  }
}
