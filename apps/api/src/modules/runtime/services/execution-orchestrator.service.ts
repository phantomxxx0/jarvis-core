import { Injectable, Logger, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from '../../../database';
import { taskExecutions } from '@jarvis/database';
import { eq } from 'drizzle-orm';
import { TaskExecutionStatus, TaskExecution } from '../contracts/execution.dto';
import {
  ExecutionCreatedEvent,
  ExecutionStartedEvent,
  ExecutionProgressEvent,
  ExecutionCompletedEvent,
  ExecutionFailedEvent,
  ExecutionTimedOutEvent,
  ExecutionCancelledEvent,
} from '../events/execution.events';

@Injectable()
export class ExecutionOrchestratorService {
  private readonly logger = new Logger(ExecutionOrchestratorService.name);
  private readonly executionTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly database: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async submitTask(
    userId: string,
    capabilityId: string,
    input: any,
    timeoutMs: number = 60000,
    maxRetries: number = 0,
  ): Promise<TaskExecution> {
    const [record] = await this.database.db.insert(taskExecutions).values({
      userId,
      capabilityId,
      input,
      timeoutMs,
      maxRetries,
      status: 'PENDING',
    }).returning();

    this.logger.log(`Task ${record.id} submitted for capability ${capabilityId}`);
    
    this.eventEmitter.emit(ExecutionCreatedEvent.name, new ExecutionCreatedEvent(record.id));

    // Transition to QUEUED to kick off dispatch
    await this.updateStatus(record.id, TaskExecutionStatus.QUEUED);
    
    return this.mapToDTO(record);
  }

  async getExecution(id: string): Promise<TaskExecution | null> {
    const [record] = await this.database.db.select().from(taskExecutions).where(eq(taskExecutions.id, id));
    if (!record) return null;
    return this.mapToDTO(record);
  }

  async setPlanned(id: string, workerId: string): Promise<void> {
    await this.updateStatus(id, TaskExecutionStatus.PLANNED, { workerId });
  }

  async setDispatched(id: string): Promise<void> {
    await this.updateStatus(id, TaskExecutionStatus.DISPATCHED);
  }

  async setRunning(id: string): Promise<void> {
    await this.updateStatus(id, TaskExecutionStatus.RUNNING, { startedAt: new Date() });
    
    // Start dual timeout tracker
    const execution = await this.getExecution(id);
    if (execution && execution.timeoutMs) {
      this.startTimeTracker(id, execution.timeoutMs);
    }
  }

  async updateProgress(id: string, progress: number): Promise<void> {
    await this.database.db.update(taskExecutions).set({ progress, updatedAt: new Date() }).where(eq(taskExecutions.id, id));
    this.eventEmitter.emit(ExecutionProgressEvent.name, new ExecutionProgressEvent(id, progress));
  }

  async completeTask(id: string, output: any): Promise<void> {
    const execution = await this.getExecution(id);
    if (!execution || this.isTerminalState(execution.status)) return;
    this.stopTimeTracker(id);
    await this.updateStatus(id, TaskExecutionStatus.SUCCESS, { output, completedAt: new Date(), progress: 100 });
  }

  async failTask(id: string, error: any): Promise<void> {
    const execution = await this.getExecution(id);
    if (!execution || this.isTerminalState(execution.status)) return;
    
    this.stopTimeTracker(id);

    if (execution.attempts < execution.maxRetries) {
      this.logger.warn(`Task ${id} failed (attempt ${execution.attempts}). Retrying...`);
      await this.database.db.update(taskExecutions)
        .set({ attempts: execution.attempts + 1, error, updatedAt: new Date() })
        .where(eq(taskExecutions.id, id));
      await this.updateStatus(id, TaskExecutionStatus.RETRYING);
      
      // Re-queue after brief delay
      setTimeout(() => {
        this.updateStatus(id, TaskExecutionStatus.QUEUED);
      }, 1000);
    } else {
      await this.updateStatus(id, TaskExecutionStatus.FAILED, { error, completedAt: new Date() });
    }
  }

  async cancelTask(id: string): Promise<void> {
    const execution = await this.getExecution(id);
    if (!execution || this.isTerminalState(execution.status)) return;
    this.stopTimeTracker(id);
    await this.updateStatus(id, TaskExecutionStatus.CANCELLED, { completedAt: new Date() });
  }

  async abortTask(id: string, reason: string): Promise<void> {
    const execution = await this.getExecution(id);
    if (!execution || this.isTerminalState(execution.status)) return;
    this.stopTimeTracker(id);
    await this.updateStatus(id, TaskExecutionStatus.ABORTED, { error: { message: reason }, completedAt: new Date() });
  }

  private isTerminalState(status: TaskExecutionStatus): boolean {
    return [
      TaskExecutionStatus.SUCCESS,
      TaskExecutionStatus.FAILED,
      TaskExecutionStatus.CANCELLED,
      TaskExecutionStatus.ABORTED,
      TaskExecutionStatus.TIMED_OUT
    ].includes(status);
  }

  private startTimeTracker(id: string, timeoutMs: number) {
    this.stopTimeTracker(id);
    const timeout = setTimeout(async () => {
      this.logger.warn(`Task ${id} timed out after ${timeoutMs}ms (Core Enforcement)`);
      await this.updateStatus(id, TaskExecutionStatus.TIMED_OUT, { completedAt: new Date() });
    }, timeoutMs);
    this.executionTimeouts.set(id, timeout);
  }

  private stopTimeTracker(id: string) {
    const timeout = this.executionTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.executionTimeouts.delete(id);
    }
  }

  private async updateStatus(id: string, status: TaskExecutionStatus, extraFields: any = {}): Promise<void> {
    await this.database.db.update(taskExecutions)
      .set({ status, updatedAt: new Date(), ...extraFields })
      .where(eq(taskExecutions.id, id));
      
    this.logger.log(`Task ${id} -> ${status}`);
    const updated = await this.getExecution(id);
    
    // Also emit the old dynamic event for backward-compatibility with generic listeners like TaskDispatcherService
    this.eventEmitter.emit(`TaskExecution.${status}`, updated);

    if (updated) {
      if (status === TaskExecutionStatus.RUNNING) {
        this.eventEmitter.emit(ExecutionStartedEvent.name, new ExecutionStartedEvent(id));
      } else if (status === TaskExecutionStatus.SUCCESS) {
        this.eventEmitter.emit(ExecutionCompletedEvent.name, new ExecutionCompletedEvent(id, updated.output));
      } else if (status === TaskExecutionStatus.FAILED || status === TaskExecutionStatus.ABORTED) {
        this.eventEmitter.emit(ExecutionFailedEvent.name, new ExecutionFailedEvent(id, updated.error));
      } else if (status === TaskExecutionStatus.TIMED_OUT) {
        this.eventEmitter.emit(ExecutionTimedOutEvent.name, new ExecutionTimedOutEvent(id));
      } else if (status === TaskExecutionStatus.CANCELLED) {
        this.eventEmitter.emit(ExecutionCancelledEvent.name, new ExecutionCancelledEvent(id));
      }
    }
  }

  private mapToDTO(record: any): TaskExecution {
    return {
      id: record.id,
      userId: record.userId,
      capabilityId: record.capabilityId,
      status: record.status as TaskExecutionStatus,
      input: record.input,
      output: record.output,
      error: record.error,
      workerId: record.workerId,
      progress: record.progress,
      attempts: record.attempts,
      maxRetries: record.maxRetries,
      timeoutMs: record.timeoutMs,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
    };
  }
}
