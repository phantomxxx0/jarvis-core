import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ExecutionOrchestratorService } from './execution-orchestrator.service';
import { TaskPlannerService } from './task-planner.service';
import { TaskExecutionStatus } from '../contracts/execution.dto';
import type { TaskExecution } from '../contracts/execution.dto';
import type { ExecutionTransport } from '../contracts/execution-transport.interface';

@Injectable()
export class TaskDispatcherService {
  private readonly logger = new Logger(TaskDispatcherService.name);
  private transports: ExecutionTransport[] = [];

  constructor(
    private readonly orchestrator: ExecutionOrchestratorService,
    private readonly planner: TaskPlannerService,
  ) {}

  registerTransport(transport: ExecutionTransport) {
    this.transports.push(transport);
  }

  @OnEvent('TaskExecution.QUEUED')
  async handleTaskQueued(execution: TaskExecution) {
    this.logger.log(`Dispatching task ${execution.id} for capability ${execution.capabilityId}`);

    if (this.transports.length === 0) {
      this.logger.error(`No transports registered. Cannot dispatch ${execution.id}`);
      await this.orchestrator.abortTask(execution.id, 'No transports available');
      return;
    }

    try {
      const plan = await this.planner.planTask({
        capabilityId: execution.capabilityId,
        input: execution.input,
      });

      if (!plan || !plan.workerId) {
        throw new Error('No capable workers found');
      }

      await this.orchestrator.setPlanned(execution.id, plan.workerId);

      // Dispatch to the first registered transport (we assume WebSocket Gateway for now)
      const transport = this.transports[0];
      await transport.dispatchExecution(plan.workerId, execution.id, execution.capabilityId, execution.input);

      await this.orchestrator.setDispatched(execution.id);
    } catch (err: any) {
      this.logger.error(`Dispatch failed for task ${execution.id}: ${err.message}`);
      await this.orchestrator.failTask(execution.id, { message: err.message });
    }
  }

  @OnEvent('TaskExecution.CANCELLED')
  async handleTaskCancelled(execution: TaskExecution) {
    if (!execution.workerId) return; // Cannot cancel unassigned tasks on worker

    if (this.transports.length > 0) {
      try {
        await this.transports[0].cancelTask(execution.workerId, execution.id);
      } catch (err: any) {
        this.logger.error(`Failed to send cancel signal for task ${execution.id} to worker ${execution.workerId}: ${err.message}`);
      }
    }
  }
}
