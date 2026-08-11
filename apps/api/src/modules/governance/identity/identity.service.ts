import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UserRole } from '@jarvis/database';
import { UsersService } from '../../users/users.service';
import { ROLE_PERMISSIONS } from '../enums/role-permissions.map';
import type { ExecutionContext } from '../interfaces/execution-context.interface';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

/**
 * The minimum caller identity needed to build an ExecutionContext.
 * Deliberately narrower than JwtPayload: role is always re-read from the
 * DB (never trusted from a token or caller-supplied value), and email is
 * not needed for authorization at all. Callers that only have a userId/
 * sessionId pair (e.g. BrainV2Service) don't need to fabricate the rest
 * of a JwtPayload just to call buildContext().
 */
type IdentitySource = Pick<JwtPayload, 'id' | 'sessionId'>;

/**
 * IdentityService
 *
 * Constructs exactly one ExecutionContext per request. This is the
 * fail-closed boundary: any missing/inactive/unrecognized-role user,
 * or any DB failure, throws — it never returns a context with an
 * empty or partial permission set. A thrown error here MUST be treated
 * by callers as "deny the request," not "proceed with defaults."
 *
 * Role is re-read from the database on every call, never trusted from
 * the JWT. The JWT proves who the user claims to be; it does not prove
 * what they're currently allowed to do — a role change must take effect
 * immediately, not after token expiry.
 */
@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(private readonly usersService: UsersService) {}

  async buildContext(jwtPayload: IdentitySource): Promise<ExecutionContext> {
    let user: Awaited<ReturnType<UsersService['findById']>>;

    try {
      user = await this.usersService.findById(jwtPayload.id);
    } catch (err) {
      this.logger.error(
        `[IdentityService] DB lookup failed for user=${jwtPayload.id}: ${(err as Error).message}`,
      );
      throw new UnauthorizedException('Identity could not be verified');
    }

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is not active');
    }

    const role = this.resolveRole(user.role);
    if (!role) {
      // Unrecognized role string in the DB is a data-integrity problem,
      // not something to guess about. Deny.
      this.logger.error(
        `[IdentityService] Unrecognized role "${user.role}" for user=${user.id}`,
      );
      throw new UnauthorizedException('Identity could not be verified');
    }

    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) {
      throw new UnauthorizedException('Identity could not be verified');
    }

    return {
      principal: {
        id: user.id,
        principalType: 'USER',
        role,
        permissions,
        sessionId: jwtPayload.sessionId,
        authenticationMethod: 'JWT',
        authenticatedAt: new Date(),
        displayName: user.name ?? undefined,
        // preferredAddress is populated separately by BrainV2Service from
        // PreferenceMemoryService — identity construction doesn't reach
        // into user preferences, to keep this boundary narrow and fast.
      },
      requestId: randomUUID(),
      traceId: randomUUID(),
      createdAt: new Date(),
    };
  }

  private resolveRole(roleValue: string): UserRole | undefined {
    return Object.values(UserRole).includes(roleValue as UserRole)
      ? (roleValue as UserRole)
      : undefined;
  }
}
