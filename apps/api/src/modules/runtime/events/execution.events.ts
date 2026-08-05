export class ExecutionCreatedEvent {
  constructor(public readonly executionId: string) {}
}

export class ExecutionStartedEvent {
  constructor(public readonly executionId: string) {}
}

export class ExecutionProgressEvent {
  constructor(
    public readonly executionId: string,
    public readonly progress: number,
  ) {}
}

export class ExecutionCompletedEvent {
  constructor(
    public readonly executionId: string,
    public readonly output: any,
  ) {}
}

export class ExecutionFailedEvent {
  constructor(
    public readonly executionId: string,
    public readonly error: any,
  ) {}
}

export class ExecutionTimedOutEvent {
  constructor(public readonly executionId: string) {}
}

export class ExecutionCancelledEvent {
  constructor(public readonly executionId: string) {}
}
