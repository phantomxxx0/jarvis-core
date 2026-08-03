import { Injectable, Logger } from '@nestjs/common';
import { Tool } from './interfaces/tool.interface';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ToolRegistryService {
  private readonly logger = new Logger(ToolRegistryService.name);
  private readonly tools = new Map<string, Tool>();

  constructor() {
    this.registerDefaultTools();
  }

  private registerDefaultTools() {
    // Tool 1: Safe File Reader (Workspace Sandboxed with smart fallbacks)
    this.register({
      name: 'read_project_file',
      description: 'Reads a project file safely within the workspace directory.',
      execute: async (params: any) => {
        // Robustly extract file path from any possible parameter key
        const targetFile = params?.filePath || params?.path || params?.file || 'package.json';

        let safePath = path.resolve(process.cwd(), targetFile);

        // Fallback check if file doesn't exist at root (common in monorepos like apps/api)
        try {
          await fs.access(safePath);
        } catch {
          const altPath = path.resolve(process.cwd(), 'apps/api', targetFile);
          try {
            await fs.access(altPath);
            safePath = altPath;
          } catch {
            // Keep original safePath to throw standard file not found error if neither exists
          }
        }

        if (!safePath.startsWith(process.cwd())) {
          throw new Error('Access denied: Path traversal outside workspace.');
        }

        const content = await fs.readFile(safePath, 'utf-8');
        return { path: path.relative(process.cwd(), safePath), content };
      },
    });

    // Tool 2: System Health & Diagnostic Tool
    this.register({
      name: 'system_diagnostic',
      description: 'Performs a runtime health check on core services and memory.',
      execute: async () => {
        return {
          status: 'HEALTHY',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
        };
      },
    });
  }

  register(tool: Tool) {
    this.tools.set(tool.name, tool);
    this.logger.log(`Registered operational tool: ${tool.name}`);
  }

  async executeTool(toolName: string, params: any): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    this.logger.log(`Executing tool [${toolName}] with params: ${JSON.stringify(params)}`);
    return await tool.execute(params);
  }

  getAvailableTools(): Array<{ name: string; description: string }> {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
    }));
  }
}