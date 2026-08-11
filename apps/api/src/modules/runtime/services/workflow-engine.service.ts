import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { DatabaseService } from '../../../database/database.service';
import { workflowExecutions, taskExecutions } from '@jarvis/database';
import { eq } from 'drizzle-orm';
import * as jsonLogic from 'json-logic-js';
import { ExecutionOrchestratorService } from './execution-orchestrator.service';
import {
  WorkflowDefinition,
  WorkflowExecutionDTO,
  WorkflowExecutionStatus,
} from '../contracts/workflow.dto';
import {
  ExecutionCompletedEvent,
  ExecutionFailedEvent,
  ExecutionTimedOutEvent,
} from '../events/execution.events';
export class WorkflowEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowEngineError';
  }
}

interface WorkflowRecord {
  id: string;
  userId: string;
  name: string | null;
  status: string;
  definition: unknown;
  state: unknown;
  error: unknown;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

interface TaskRecord {
  id: string;
  workflowExecutionId: string | null;
  workflowStepId: string | null;
}

interface StepState {
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  output?: unknown;
  error?: unknown;
  taskId?: string;
}

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);
  private readonly workflowLocks = new Map<string, Promise<void>>();

  constructor(
    private readonly database: DatabaseService,
    private readonly orchestrator: ExecutionOrchestratorService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async submitWorkflow(
    userId: string,
    definition: WorkflowDefinition,
    name?: string,
  ): Promise<WorkflowExecutionDTO> {
    const initialState: Record<string, StepState> = {};
    for (const step of definition.steps) {
      initialState[step.id] = { status: 'PENDING' };
    }

    const result = await this.database.db
      .insert(workflowExecutions)
      .values({
        userId,
        name,
        definition: definition,
        state: initialState,
        status: WorkflowExecutionStatus.PENDING,
      })
      .returning();
    const record = result[0] as unknown as WorkflowRecord;

    const dto = this.mapToDTO(record);
    this.logger.log(`Workflow ${dto.id} created.`);

    // Start evaluation asynchronously
    setImmediate(() => {
      this.evaluateDAG(dto.id).catch((err) =>
        this.logger.error(`Error evaluating DAG for ${dto.id}`, err),
      );
    });

    return dto;
  }

  private async withLock(
    workflowId: string,
    fn: () => Promise<void>,
  ): Promise<void> {
    const prev = this.workflowLocks.get(workflowId) || Promise.resolve();
    let release: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.workflowLocks.set(
      workflowId,
      prev.then(() => next),
    );
    try {
      await prev;
      await fn();
    } finally {
      release!();
      if (this.workflowLocks.get(workflowId) === prev.then(() => next)) {
        this.workflowLocks.delete(workflowId);
      }
    }
  }

  private async evaluateDAG(workflowId: string): Promise<void> {
    await this.withLock(workflowId, async () => {
      const result = await this.database.db
        .select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.id, workflowId));
      const record = result[0] as unknown as WorkflowRecord;
      if (!record) return;
      if (record.status !== 'PENDING' && record.status !== 'RUNNING') return;

      if (record.status === 'PENDING') {
        await this.updateWorkflowStatus(
          workflowId,
          WorkflowExecutionStatus.RUNNING,
          { startedAt: new Date() },
        );
        record.status = 'RUNNING';
      }

      const definition = record.definition as WorkflowDefinition;
      const state = record.state as Record<string, StepState>;

      let isComplete = true;
      let hasFailed = false;
      let madeProgress = false;

      for (const step of definition.steps) {
        const stepState = state[step.id] || { status: 'PENDING' };

        if (stepState.status === 'FAILED') {
          hasFailed = true;
          continue;
        }
        if (stepState.status === 'SUCCESS' || stepState.status === 'SKIPPED') {
          continue;
        }

        isComplete = false;

        if (stepState.status === 'PENDING') {
          // Check dependencies
          let canRun = true;
          let depsFailedOrSkipped = false;

          if (step.dependencies && step.dependencies.length > 0) {
            for (const depId of step.dependencies) {
              const depState = state[depId];
              if (
                !depState ||
                (depState.status !== 'SUCCESS' && depState.status !== 'SKIPPED')
              ) {
                canRun = false;
              }
              if (depState && depState.status === 'FAILED') {
                depsFailedOrSkipped = true;
              }
            }
          }

          if (depsFailedOrSkipped) {
            state[step.id] = { status: 'SKIPPED' };
            madeProgress = true;
            continue;
          }

          if (canRun) {
            // Evaluate condition
            if (step.condition) {
              try {
                // Extract just the outputs for context
                const context = this.buildContext(state);
                const parsedCondition = JSON.parse(
                  step.condition,
                ) as jsonLogic.RulesLogic;
                const conditionResult: unknown = jsonLogic.apply(
                  parsedCondition,
                  context,
                );
                if (!conditionResult) {
                  state[step.id] = { status: 'SKIPPED' };
                  madeProgress = true;
                  continue;
                }
              } catch (err) {
                this.logger.warn(
                  `Failed to evaluate condition for step ${step.id}: ${err}`,
                );
                state[step.id] = {
                  status: 'FAILED',
                  error: 'Condition evaluation failed',
                };
                hasFailed = true;
                madeProgress = true;
                continue;
              }
            }

            // Interpolate inputs
            const context = this.buildContext(state);
            let interpolatedInput;
            try {
              interpolatedInput = this.interpolate(step.input, context);
            } catch {
              state[step.id] = {
                status: 'FAILED',
                error: 'Interpolation failed',
              };
              hasFailed = true;
              madeProgress = true;
              continue;
            }

            // Submit to orchestrator
            state[step.id] = { status: 'RUNNING' };
            madeProgress = true;

            this.logger.log(
              `Submitting task for workflow ${workflowId}, step ${step.id}`,
            );

            try {
              const task = await this.orchestrator.submitTask(
                record.userId,
                step.capabilityId,
                interpolatedInput,
                step.timeoutMs,
                step.maxRetries,
              );

              // Link task to workflow
              await this.database.db
                .update(taskExecutions)
                .set({
                  workflowExecutionId: workflowId,
                  workflowStepId: step.id,
                })
                .where(eq(taskExecutions.id, task.id));

              state[step.id].taskId = task.id;
            } catch (err) {
              this.logger.error(
                `Failed to submit task for step ${step.id}`,
                err,
              );
              state[step.id] = {
                status: 'FAILED',
                error: 'Task submission failed',
              };
              hasFailed = true;
            }
          }
        }
      }

      if (madeProgress) {
        await this.database.db
          .update(workflowExecutions)
          .set({ state, updatedAt: new Date() })
          .where(eq(workflowExecutions.id, workflowId));
      }

      if (hasFailed) {
        await this.updateWorkflowStatus(
          workflowId,
          WorkflowExecutionStatus.FAILED,
          { completedAt: new Date() },
        );
      } else if (isComplete) {
        await this.updateWorkflowStatus(
          workflowId,
          WorkflowExecutionStatus.SUCCESS,
          { completedAt: new Date() },
        );
      } else if (madeProgress) {
        // Loop again if we unblocked something synchronously (like SKIPPED)
        setImmediate(() => {
          this.evaluateDAG(workflowId).catch((err) => this.logger.error(err));
        });
      }
    });
  }

  @OnEvent(ExecutionCompletedEvent.name)
  async handleTaskSuccess(payload: ExecutionCompletedEvent) {
    await this.handleTaskCompletion(
      payload.executionId,
      'SUCCESS',
      payload.output,
    );
  }

  @OnEvent(ExecutionFailedEvent.name)
  async handleTaskFailed(payload: ExecutionFailedEvent) {
    await this.handleTaskCompletion(
      payload.executionId,
      'FAILED',
      null,
      payload.error,
    );
  }

  @OnEvent(ExecutionTimedOutEvent.name)
  async handleTaskTimeout(payload: ExecutionTimedOutEvent) {
    await this.handleTaskCompletion(payload.executionId, 'FAILED', null, {
      message: 'Timed out',
    });
  }

  private async handleTaskCompletion(
    taskId: string,
    status: 'SUCCESS' | 'FAILED',
    output?: unknown,
    error?: unknown,
  ) {
    // Find if task is part of a workflow
    const result = await this.database.db
      .select()
      .from(taskExecutions)
      .where(eq(taskExecutions.id, taskId));
    const task = result[0] as unknown as TaskRecord;

    if (!task || !task.workflowExecutionId || !task.workflowStepId) return;

    const workflowId = task.workflowExecutionId;
    const stepId = task.workflowStepId;

    await this.withLock(workflowId, async () => {
      const result = await this.database.db
        .select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.id, workflowId));
      const workflow = result[0] as unknown as WorkflowRecord;

      if (!workflow) return;

      const state = workflow.state as Record<string, StepState>;
      const stepState = state[stepId];
      if (stepState) {
        stepState.status = status;
        if (status === 'SUCCESS') stepState.output = output;
        if (status === 'FAILED') stepState.error = error;

        await this.database.db
          .update(workflowExecutions)
          .set({ state, updatedAt: new Date() })
          .where(eq(workflowExecutions.id, workflow.id));
      }
    });

    // Evaluate DAG after state update
    this.evaluateDAG(task.workflowExecutionId).catch((err) =>
      this.logger.error(err),
    );
  }

  private buildContext(
    state: Record<string, StepState>,
  ): Record<string, unknown> {
    const context: Record<string, unknown> = {};
    for (const [stepId, stepState] of Object.entries(state)) {
      if (stepState.status === 'SUCCESS') {
        context[stepId] = { output: stepState.output };
      }
    }
    return context;
  }

  private interpolate(
    input: unknown,
    context: Record<string, unknown>,
  ): unknown {
    if (typeof input === 'string') {
      // Very basic string interpolation: "${step1.output.value}"
      return input.replace(/\$\{([^}]+)\}/g, (match: string, path: string) => {
        const value = this.getValueAtPath(context, path);
        return value !== undefined
          ? typeof value === 'object'
            ? JSON.stringify(value)
            : typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean'
              ? String(value)
              : JSON.stringify(value)
          : match;
      });
    } else if (Array.isArray(input)) {
      return input.map((item) => this.interpolate(item, context));
    } else if (input !== null && typeof input === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(input)) {
        // Special case: if value is EXACTLY a template string and evaluates to an object, we keep it as an object
        if (
          typeof value === 'string' &&
          value.startsWith('${') &&
          value.endsWith('}') &&
          value.indexOf('${', 2) === -1
        ) {
          const path = value.slice(2, -1);
          const resolvedValue = this.getValueAtPath(context, path);
          if (resolvedValue !== undefined) {
            result[key] = resolvedValue;
            continue;
          }
        }
        result[key] = this.interpolate(value, context);
      }
      return result;
    }
    return input;
  }

  private getValueAtPath(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((acc: unknown, part: string) => {
      if (acc && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  }

  private async updateWorkflowStatus(
    id: string,
    status: WorkflowExecutionStatus,
    extraFields: Record<string, unknown> = {},
  ) {
    await this.database.db
      .update(workflowExecutions)
      .set({ status, updatedAt: new Date(), ...extraFields })
      .where(eq(workflowExecutions.id, id));
  }

  private mapToDTO(record: WorkflowRecord): WorkflowExecutionDTO {
    return {
      id: record.id,
      userId: record.userId,
      name: record.name || undefined,
      status: record.status as WorkflowExecutionStatus,
      definition: record.definition as WorkflowDefinition,
      state: record.state as Record<string, StepState>,
      error: record.error,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      startedAt: record.startedAt || undefined,
      completedAt: record.completedAt || undefined,
    };
  }
}
