import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@jarvis/database';
import { AuthorizationService } from './authorization.service';
import { PolicyEngine } from './policy-engine.service';
import { PermissionMapper } from './permission-mapper.service';
import { AuditService } from '../../audit/audit.service';
import { Permission } from '../enums/permission.enum';
import type { ExecutionContext } from '../interfaces/execution-context.interface';

function makeContext(
  overrides: Partial<ExecutionContext['principal']> = {},
): ExecutionContext {
  return {
    principal: {
      id: 'user-1',
      principalType: 'USER',
      role: UserRole.USER,
      permissions: [Permission.READ_SELF, Permission.WRITE_SELF],
      sessionId: 'session-1',
      authenticationMethod: 'JWT',
      authenticatedAt: new Date(),
      ...overrides,
    },
    requestId: 'req-1',
    traceId: 'trace-1',
    createdAt: new Date(),
  };
}

// Minimal mock — AuthorizationService only ever calls authorizationDecision().
// A real AuditService pulls in nestjs-pino's InjectPinoLogger, which the
// testing module doesn't set up, so a full instance isn't usable here.
const mockAuditService = {
  authorizationDecision: jest.fn(),
};

// PermissionMapper is a stateless static lookup table — a real instance
// is used instead of a mock; there's no external dependency to fake.
const permissionMapper = new PermissionMapper();

describe('AuthorizationService', () => {
  let service: AuthorizationService;

  beforeEach(async () => {
    mockAuditService.authorizationDecision.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        PolicyEngine,
        { provide: AuditService, useValue: mockAuditService },
        { provide: PermissionMapper, useValue: permissionMapper },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
  });

  it('allows a permission the principal actually has', () => {
    const context = makeContext();
    expect(service.can(context, Permission.READ_SELF)).toBe(true);
  });

  it('denies a permission the principal does not have', () => {
    const context = makeContext();
    expect(service.can(context, Permission.MANAGE_USERS)).toBe(false);
  });

  it('denies when context is missing entirely', () => {
    expect(service.can(undefined, Permission.READ_SELF)).toBe(false);
    expect(service.can(null, Permission.READ_SELF)).toBe(false);
  });

  it('denies when principal is malformed (missing permissions array)', () => {
    const context = makeContext();
    // @ts-expect-error deliberately corrupting for the test
    context.principal.permissions = undefined;
    expect(service.can(context, Permission.READ_SELF)).toBe(false);
  });

  it('denies SELF-scoped permission on a resource owned by someone else', () => {
    const context = makeContext();
    expect(
      service.can(context, Permission.READ_SELF, {
        type: 'User',
        id: 'user-2',
        ownerId: 'user-2',
      }),
    ).toBe(false);
  });

  it('allows SELF-scoped permission on a resource the principal owns', () => {
    const context = makeContext();
    expect(
      service.can(context, Permission.READ_SELF, {
        type: 'User',
        id: 'user-1',
        ownerId: 'user-1',
      }),
    ).toBe(true);
  });

  it('denies cross-organization access for a non-global-scope principal', () => {
    const context = makeContext({
      permissions: [Permission.READ_USERS],
      organizationId: 'org-a',
    });
    expect(
      service.can(context, Permission.READ_USERS, {
        type: 'User',
        organizationId: 'org-b',
      }),
    ).toBe(false);
  });

  it('allows cross-organization access for SUPER_ADMIN (global scope)', () => {
    const context = makeContext({
      role: UserRole.SUPER_ADMIN,
      permissions: Object.values(Permission),
      organizationId: 'org-a',
    });
    expect(
      service.can(context, Permission.READ_USERS, {
        type: 'User',
        organizationId: 'org-b',
      }),
    ).toBe(true);
  });

  it('denies when PolicyEngine narrows an otherwise-allowed permission', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        { provide: PolicyEngine, useValue: { evaluate: () => false } },
        { provide: AuditService, useValue: mockAuditService },
        { provide: PermissionMapper, useValue: permissionMapper },
      ],
    }).compile();

    const policyDenyService =
      module.get<AuthorizationService>(AuthorizationService);
    const context = makeContext();
    expect(policyDenyService.can(context, Permission.READ_SELF)).toBe(false);
  });

  it('fails closed if PolicyEngine throws', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        {
          provide: PolicyEngine,
          useValue: {
            evaluate: () => {
              throw new Error('simulated policy engine crash');
            },
          },
        },
        { provide: AuditService, useValue: mockAuditService },
        { provide: PermissionMapper, useValue: permissionMapper },
      ],
    }).compile();

    const crashingService =
      module.get<AuthorizationService>(AuthorizationService);
    const context = makeContext();
    expect(crashingService.can(context, Permission.READ_SELF)).toBe(false);
  });

  it('records an audit entry for both allow and deny decisions', () => {
    const context = makeContext();

    service.can(context, Permission.READ_SELF);
    expect(mockAuditService.authorizationDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        permission: Permission.READ_SELF,
        allowed: true,
      }),
    );

    service.can(context, Permission.MANAGE_USERS);
    expect(mockAuditService.authorizationDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        permission: Permission.MANAGE_USERS,
        allowed: false,
      }),
    );
  });

  describe('evaluateDecision', () => {
    it('allows useTool when the principal has USE_TOOL', () => {
      const context = makeContext({
        permissions: [
          Permission.READ_SELF,
          Permission.WRITE_SELF,
          Permission.USE_TOOL,
        ],
      });

      const result = service.evaluateDecision(context, { useTool: true });

      expect(result.capabilities.useTool).toBe(true);
      expect(result.denials).toHaveLength(0);
    });

    it('narrows useTool to false and records a denial when USE_TOOL is missing', () => {
      const context = makeContext(); // default permissions have no USE_TOOL

      const result = service.evaluateDecision(context, { useTool: true });

      expect(result.capabilities.useTool).toBe(false);
      expect(result.denials).toEqual([
        expect.objectContaining({ capability: 'useTool' }),
      ]);
    });

    it('leaves an unrequested capability untouched and produces no denial for it', () => {
      const context = makeContext(); // no USE_TOOL

      const result = service.evaluateDecision(context, { useTool: false });

      expect(result.capabilities.useTool).toBe(false);
      expect(result.denials).toHaveLength(0);
    });
  });
});
