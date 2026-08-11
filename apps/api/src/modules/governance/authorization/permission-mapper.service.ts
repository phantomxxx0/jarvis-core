import { Injectable } from '@nestjs/common';
import { Permission } from '../enums/permission.enum';
import type { DecisionCapabilityKey } from '../interfaces/decision-capability.interface';

/**
 * PermissionMapper
 *
 * The one place that knows how a cognitive-module capability flag (e.g.
 * "useTool") maps to a concrete Permission. Cognitive modules never
 * import Permission directly — they ask AuthorizationService to evaluate
 * capability flags, and this mapping happens internally.
 *
 * "useTool" maps to the coarse USE_TOOL permission — "is the Executive
 * allowed to dispatch tools at all." It does NOT grant access to any
 * specific tool; ToolRouter separately checks each tool's own
 * requiredPermission before invoking it. This is intentional
 * defense-in-depth: passing this check only gets you to ToolRouter, not
 * through it.
 */
@Injectable()
export class PermissionMapper {
  private static readonly MAP: Partial<
    Record<DecisionCapabilityKey, Permission>
  > = {
    useTool: Permission.USE_TOOL,
  };

  resolve(capability: DecisionCapabilityKey): Permission | undefined {
    return PermissionMapper.MAP[capability];
  }
}
