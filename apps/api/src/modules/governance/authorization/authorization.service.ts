import { Injectable, Logger } from '@nestjs/common';
import type { ExecutionContext } from '../interfaces/execution-context.interface';
import type { Resource } from '../interfaces/resource.interface';
import { Permission } from '../enums/permission.enum';
import { PolicyEngine } from './policy-engine.service';
import { AuditService } from '../../audit/audit.service';
import { PermissionMapper } from './permission-mapper.service';
import type {
  DecisionCapabilities,
  GovernanceDecisionResult,
} from '../interfaces/decision-capability.interface';

/**
 * AuthorizationService
 *
 * The single entry point for every permission check in the system.
 * No module should check `principal.role === X` or inspect
 * `principal.permissions` directly — always go through can().
 *
 * FAIL CLOSED: any exception, missing context, or unrecognized
 * permission returns false. Never throws to the caller, never
 * defaults to allow.
 */
@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(
    private readonly policyEngine: PolicyEngine,
    private readonly auditService: AuditService,
    private readonly permissionMapper: PermissionMapper,
  ) {}

  can(
    context: ExecutionContext | undefined | null,
    permission: Permission,
    resource?: Resource,
  ): boolean {
    try {
      if (!context || !context.principal) {
        this.logger.warn(
          `[Authorization] DENY — missing execution context for permission=${permission}`,
        );
        return false;
      }

      const { principal } = context;

      if (!principal.permissions || !Array.isArray(principal.permissions)) {
        this.logger.warn(
          `[Authorization] DENY — malformed permissions for principal=${principal.id}`,
        );
        return false;
      }

      const hasStaticPermission = principal.permissions.includes(permission);
      if (!hasStaticPermission) {
        this.audit(context, permission, resource, false);
        return false;
      }

      // Resource scoping: SELF-scoped permissions require the resource
      // (when present) to actually belong to the requesting principal.
      if (resource && this.isSelfScoped(permission)) {
        if (resource.ownerId && resource.ownerId !== principal.id) {
          this.audit(context, permission, resource, false);
          return false;
        }
      }

      // Org scoping: when a resource declares an organizationId and the
      // principal has one too, they must match, unless the principal
      // holds a permission set that implies global scope (SUPER_ADMIN's
      // permission list is Object.values(Permission) — full set).
      if (
        resource?.organizationId &&
        principal.organizationId &&
        resource.organizationId !== principal.organizationId &&
        !this.hasGlobalScope(principal.permissions)
      ) {
        this.audit(context, permission, resource, false);
        return false;
      }

      const policyAllows = this.policyEngine.evaluate(
        context,
        permission,
        resource,
      );

      const allowed = hasStaticPermission && policyAllows;
      this.audit(context, permission, resource, allowed);
      return allowed;
    } catch (err) {
      this.logger.error(
        `[Authorization] DENY — unexpected error evaluating permission=${permission}: ${(err as Error).message}`,
      );
      // Fail closed. Never rethrow into an allow path.
      return false;
    }
  }

  /**
   * Evaluates cognitive-module capability flags (e.g. "useTool") against
   * an ExecutionContext, translating each to its Permission internally
   * via PermissionMapper. Callers never see or import Permission — they
   * only deal in capability flags.
   *
   * A capability with no PermissionMapper entry is passed through
   * unchanged (ungated). A capability that's mapped but not requested
   * (undefined/false) is left untouched — this only ever narrows what
   * was requested, never widens it.
   */
  evaluateDecision(
    context: ExecutionContext | undefined | null,
    requested: DecisionCapabilities,
  ): GovernanceDecisionResult {
    const capabilities: DecisionCapabilities = { ...requested };
    const denials: GovernanceDecisionResult['denials'] = [];

    for (const key of Object.keys(
      requested,
    ) as (keyof DecisionCapabilities)[]) {
      if (!requested[key]) {
        continue;
      }

      const permission = this.permissionMapper.resolve(key);
      if (!permission) {
        continue; // not currently gated
      }

      if (!this.can(context, permission)) {
        capabilities[key] = false;
        denials.push({
          capability: key,
          reason: `Permission ${permission} was not granted.`,
        });
      }
    }

    return { capabilities, denials };
  }

  private isSelfScoped(permission: Permission): boolean {
    return (
      permission === Permission.READ_SELF ||
      permission === Permission.WRITE_SELF
    );
  }

  private hasGlobalScope(permissions: Permission[]): boolean {
    return permissions.length === Object.values(Permission).length;
  }

  private audit(
    context: ExecutionContext,
    permission: Permission,
    resource: Resource | undefined,
    allowed: boolean,
  ): void {
    this.auditService.authorizationDecision({
      principalId: context.principal.id,
      permission,
      resourceType: resource?.type ?? null,
      resourceId: resource?.id ?? null,
      requestId: context.requestId,
      allowed,
    });
  }
}
