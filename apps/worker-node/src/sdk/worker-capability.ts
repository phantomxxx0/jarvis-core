import { JSONSchema7 } from "json-schema";
import { TracingContext } from "./envelopes";

export interface WorkerContext extends TracingContext {
  // Abstraction for future dependency injection
  workerId?: string;
}

export type CapabilityResult = unknown;

export type SupportedPlatform = NodeJS.Platform | "all";

export interface WorkerCapability {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  platform?: SupportedPlatform[];
  inputSchema: JSONSchema7;
  outputSchema?: JSONSchema7;

  execute(input: unknown, context: WorkerContext): Promise<CapabilityResult>;
}
