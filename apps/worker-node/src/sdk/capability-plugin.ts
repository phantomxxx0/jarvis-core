import { TracingContext } from "./envelopes";

export abstract class CapabilityPlugin<
  TConfig = unknown,
  TArgs = unknown,
  TResult = unknown,
> {
  abstract readonly id: string;
  abstract readonly version: string;

  abstract initialize(config: TConfig): Promise<void>;
  abstract health(): Promise<"READY" | "DEGRADED" | "UNHEALTHY">;
  abstract shutdown(): Promise<void>;

  abstract execute(args: TArgs, context: TracingContext): Promise<TResult>;
  abstract cancel(executionId: string): Promise<void>;
}
