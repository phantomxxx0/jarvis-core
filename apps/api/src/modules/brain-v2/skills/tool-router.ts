import { Injectable, Logger } from '@nestjs/common';
import type { ISkill, SkillResult } from './skill-router';
import { ToolRegistryService } from '../../tools/tool-registry.service';
import { AuthorizationService } from '../../governance/authorization/authorization.service';
import type { ExecutionContext } from '../../governance/interfaces/execution-context.interface';

/**
 * ToolRouter (Brain V2)
 *
 * Adapts V1's ToolRegistryService to V2's ISkill interface.
 * Routes tool invocations through the V1 tool registry
 * without V2 needing to know about V1's tool implementation details.
 *
 * Governance: this is the second authorization gate in the tool
 * execution path. Executive already checked USE_TOOL before a request
 * ever reaches here — that only confirms tool dispatch is allowed in
 * general. ToolRouter separately checks the specific tool's own
 * requiredPermission before invoking it, so a bypass or misconfiguration
 * of the Executive-level check cannot, by itself, run a tool it
 * shouldn't.
 *
 * Phase 1: Thin delegation to V1 registry.
 * Phase 2: V2-native skill implementations replace V1 tools progressively.
 */
@Injectable()
export class ToolRouter {
  private readonly logger = new Logger(ToolRouter.name);

  constructor(
    private readonly v1Registry: ToolRegistryService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  /**
   * Lists all available tools as SkillResult-compatible names.
   */
  listAvailableSkills(): string[] {
    return this.v1Registry.getAvailableTools().map((t) => t.name);
  }

  /**
   * Invokes a skill by name via the V1 tool registry, after checking the
   * tool's own requiredPermission against the caller's ExecutionContext.
   *
   * @param skillName        - The skill/tool name to invoke.
   * @param input             - The input payload.
   * @param executionContext  - The governance context for this turn.
   * @returns A SkillResult.
   */
  async invoke(
    skillName: string,
    input: Record<string, unknown>,
    executionContext: ExecutionContext,
  ): Promise<SkillResult> {
    const startTime = Date.now();
    this.logger.log(`[ToolRouter] Invoking skill: ${skillName}`);

    const tools = this.v1Registry.getAvailableTools();
    const tool = tools.find((t) => t.name === skillName);

    if (!tool) {
      return {
        skillName,
        success: false,
        output: null,
        error: `Skill '${skillName}' not found in V1 registry.`,
        executionMs: Date.now() - startTime,
      };
    }

    const allowed = this.authorizationService.can(
      executionContext,
      tool.requiredPermission,
    );

    if (!allowed) {
      this.logger.warn(
        `[ToolRouter] DENY — principal=${executionContext?.principal?.id} lacks ${tool.requiredPermission} for skill=${skillName}`,
      );
      return {
        skillName,
        success: false,
        output: null,
        error: `Permission denied: '${skillName}' requires ${tool.requiredPermission}.`,
        executionMs: Date.now() - startTime,
      };
    }

    try {
      const output = await tool.execute(input);
      return {
        skillName,
        success: true,
        output,
        executionMs: Date.now() - startTime,
      };
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`[ToolRouter] Skill ${skillName} failed: ${message}`);
      return {
        skillName,
        success: false,
        output: null,
        error: message,
        executionMs: Date.now() - startTime,
      };
    }
  }
}
