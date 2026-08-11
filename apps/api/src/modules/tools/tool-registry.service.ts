import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { JarvisTool } from './tool.interface';
import { ReadFileTool } from './implementations/read-file.tool';
import { ExecuteSqlTool } from './implementations/execute-sql.tool';
import { OnModuleInit } from '@nestjs/common';
import { CapabilityRegistryService } from '../registry/capability-registry.service';
import { CapabilityProvider } from '../execution/contracts/capability-provider.interface';
import { ProviderType } from '../execution/contracts/provider-type.enum';
import { ProviderHealth } from '../execution/contracts/provider-health.enum';

@Injectable()
export class ToolRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ToolRegistryService.name);
  private readonly tools = new Map<string, JarvisTool>();

  constructor(
    private readonly readFileTool: ReadFileTool,
    private readonly executeSqlTool: ExecuteSqlTool,
    private readonly capabilityRegistry: CapabilityRegistryService,
  ) {
    this.logger.log(
      'Initializing ToolRegistryService and registering native tools.',
    );
    this.registerTool(this.readFileTool);
    this.registerTool(this.executeSqlTool);
  }

  private registerTool(tool: JarvisTool): void {
    if (this.tools.has(tool.name)) {
      this.logger.warn(
        `Tool with name ${tool.name} is already registered. Overwriting.`,
      );
    }
    this.tools.set(tool.name, tool);
    this.logger.log(`Registered tool: ${tool.name}`);
  }

  async onModuleInit() {
    for (const tool of this.tools.values()) {
      const provider = this.wrapToolAsProvider(tool);
      await this.capabilityRegistry.registerProvider(provider);
    }
  }

  private wrapToolAsProvider(tool: JarvisTool): CapabilityProvider {
    return {
      id: `tool-${tool.name}`,
      type: ProviderType.TOOL,
      initialize: async () => {},
      health: async () => {
        await Promise.resolve();
        return tool.isHealthy?.() === false
          ? ProviderHealth.UNHEALTHY
          : ProviderHealth.READY;
      },
      metadata: async () => {
        await Promise.resolve();
        return {
          nodeId: 'local-brain',
          platform: 'nodejs',
          lastHeartbeat: new Date(),
          metrics: { p50LatencyMs: tool.getLatency?.() },
        };
      },
      capabilities: async () => {
        await Promise.resolve();
        const isHighRisk = tool.name === 'execute_sql';
        return [
          {
            id: tool.name,
            version: '1.0.0',
            description: tool.description,
            risk: isHighRisk ? 'HIGH' : 'LOW',
            timeout: 5000,
            estimatedCost: tool.getLoad?.() || 0,
            concurrencyLimit: 1,
            requiresApproval: isHighRisk,
            supportsStreaming: false,
            supportsCancellation: false,
            // Every tool declares its own requiredPermission — this is
            // what lets ExecutionRunnerService (and any other capability
            // dispatcher) enforce the same boundary ToolRouter enforces
            // for the V2 skills path, without duplicating permission logic.
            requiredPermission: tool.requiredPermission,
          },
        ];
      },
      execute: async <TArgs = unknown, TResult = unknown>(
        capId: string,
        args: TArgs,
      ): Promise<TResult> =>
        tool.execute(args as Record<string, unknown>) as Promise<TResult>,
      shutdown: async () => {},
    };
  }

  /**
   * Used by PlannerService to inform the LLM of available capabilities
   */
  public getAvailableTools(): JarvisTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Used by RuntimeContextService to provide LLM with runtime capacity state
   */
  public getCapabilityMetrics(): Record<string, unknown>[] {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      isHealthy: tool.isHealthy ? tool.isHealthy() : true,
      load: tool.getLoad ? tool.getLoad() : 0,
      latencyMs: tool.getLatency ? tool.getLatency() : 0,
    }));
  }

  /**
   * Main execution gateway utilized by the ExecutionRunnerService
   */
  public async executeCapability(
    capability: string,
    args?: unknown,
  ): Promise<unknown> {
    const tool = this.tools.get(capability);

    if (!tool) {
      this.logger.error(
        `Execution failed: Tool capability '${capability}' not found in registry.`,
      );
      throw new BadRequestException(
        `Capability '${capability}' is not registered or available.`,
      );
    }

    const safeArgs = (args as Record<string, unknown>) || {};

    this.logger.log(
      `Routing capability '${capability}' to tool '${tool.name}'...`,
    );

    return tool.execute(safeArgs);
  }
}
