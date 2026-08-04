export class PlannerException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class CapabilityNotFoundException extends PlannerException {
  constructor(capabilityId: string) {
    super(`Capability '${capabilityId}' not found in registry`);
  }
}

export class NoEligibleWorkerException extends PlannerException {
  constructor(capabilityId: string) {
    super(`No eligible workers found for capability '${capabilityId}'`);
  }
}

export class WorkerOfflineException extends PlannerException {
  constructor(workerId: string) {
    super(`Worker '${workerId}' is offline or not active`);
  }
}

export class PlannerValidationException extends PlannerException {
  constructor(message: string) {
    super(`Planner validation error: ${message}`);
  }
}
