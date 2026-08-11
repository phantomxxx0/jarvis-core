import type { Permission } from '../governance/enums/permission.enum';

export interface JarvisTool {
  name: string;
  description: string;

  /**
   * The Permission a caller must hold for ToolRouter to invoke this
   * tool. Required on every tool — there is no "ungated" tool. This is
   * the second, tool-specific authorization gate; the Executive's
   * USE_TOOL check only gets a request as far as ToolRouter, not through
   * it.
   */
  requiredPermission: Permission;

  execute(args: Record<string, unknown>): Promise<unknown>;
  isHealthy?(): boolean;
  getLoad?(): number;
  getLatency?(): number;
}
