import { Injectable, Logger } from '@nestjs/common';
import { ReflectionReport } from '../reflection/contracts/reflection-report';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MemoryEvents } from '../../memory/events/memory-events.enum';

@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Consumes a ReflectionReport and synthesizes it into memories.
   * Emits events to be picked up by the Memory Orchestrator.
   */
  public async learn(report: ReflectionReport, userId: string): Promise<void> {
    this.logger.log(`Learning from ReflectionReport for Goal ${report.goalId}`);

    // Store the execution as an episode
    this.eventEmitter.emit(MemoryEvents.MEMORY_EPISODE_EXTRACTED, {
      userId,
      title: `Execution of goal: ${report.goalId}`,
      summary: `Execution success: ${report.success}. Details: ${report.executionMistakes.length} mistakes, ${report.suggestedImprovements.length} improvements.`,
      importance: report.success ? 70 : 90,
      participants: ['Jarvis'],
    });

    if (
      report.suggestedImprovements &&
      report.suggestedImprovements.length > 0
    ) {
      for (const improvement of report.suggestedImprovements) {
        this.eventEmitter.emit(MemoryEvents.MEMORY_FACT_EXTRACTED, {
          userId,
          fact: `Lesson learned: ${improvement}`,
          category: 'HEURISTIC',
          confidence: 90,
        });
      }
    }

    if (report.executionMistakes && report.executionMistakes.length > 0) {
      for (const mistake of report.executionMistakes) {
        this.eventEmitter.emit(MemoryEvents.MEMORY_FACT_EXTRACTED, {
          userId,
          fact: `Past mistake to avoid: ${mistake}`,
          category: 'AVOIDANCE',
          confidence: 85,
        });
      }
    }

    this.logger.log(`Emitted learning events for Goal ${report.goalId}`);
  }
}
