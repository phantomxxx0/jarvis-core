import { Injectable } from '@nestjs/common';
import type { ExecutionContext } from '../interfaces/execution-context.interface';
import type { Permission } from '../enums/permission.enum';
import type { Resource } from '../interfaces/resource.interface';

/**
 * PolicyEngine
 *
 * Evaluates dynamic, contextual rules that can only NARROW what
 * ROLE_PERMISSIONS already granted — never widen it. Today this is a
 * pass-through (no policies configured yet); the contract exists so
 * AuthorizationService never needs to change when real policies land.
 *
 * Composition rule: AuthorizationService.can() is only true if BOTH
 * the static permission check AND this evaluate() call allow it.
 * Deny wins.
 */
@Injectable()
export class PolicyEngine {
  evaluate(
    context: ExecutionContext,
    permission: Permission,
    resource?: Resource,
  ): boolean {
    // No configured policies yet — allow by default at this layer.
    // (The static ROLE_PERMISSIONS check in AuthorizationService is the
    // actual gate today; this only ever narrows, never substitutes for it.)
    return true;
  }
}
