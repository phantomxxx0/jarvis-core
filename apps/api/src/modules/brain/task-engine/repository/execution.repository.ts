import { Injectable, Logger } from '@nestjs/common';
import { ExecutionPlan } from '../../contracts/execution-plan';

@Injectable()
export class ExecutionRepository {
  private readonly logger = new Logger(ExecutionRepository.name);

  // In-memory store for now
  private readonly executions = new Map<string, ExecutionPlan>();

  save(execution: ExecutionPlan): void {
    this.logger.log(`Saving ExecutionPlan ${execution.id}`);
    this.executions.set(execution.id, execution);
  }

  update(execution: ExecutionPlan): void {
    this.logger.log(`Updating ExecutionPlan ${execution.id}`);
    this.executions.set(execution.id, execution);
  }

  getById(id: string): ExecutionPlan | null {
    return this.executions.get(id) ?? null;
  }

  getAll(): ExecutionPlan[] {
    return Array.from(this.executions.values());
  }

  /**
   * Checks whether an execution exists.
   */
  exists(executionId: string): boolean {
    return this.executions.has(executionId);
  }

  /**
   * Removes an execution.
   */
  delete(executionId: string): boolean {
    return this.executions.delete(executionId);
  }

  /**
   * Clears the repository.
   */
  clear(): void {
    this.executions.clear();
  }
}
