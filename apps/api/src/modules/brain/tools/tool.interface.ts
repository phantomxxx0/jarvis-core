export interface JarvisTool {
  name: string;
  description: string;
  execute(args: Record<string, unknown>): Promise<unknown>;
  isHealthy?(): boolean;
  getLoad?(): number;
  getLatency?(): number;
}
