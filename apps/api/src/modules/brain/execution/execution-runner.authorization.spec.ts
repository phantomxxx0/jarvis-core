import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@jarvis/database';
import { ExecutionRunnerService } from './execution-runner.service';
import { PlannerService } from '../planner/planner.service';
import { CapabilityRegistryService } from '../../registry/capability-registry.service';
import { TaskRouterService } from '../router/task-router.service';
import { ObservationManagerService } from '../../observation/services/observation-manager.service';
import { InferenceService } from '../../workers/inference/services/inference.service';
import { AuthorizationService } from '../../governance/authorization/authorization.service';
import { PolicyEngine } from '../../governance/authorization/policy-engine.service';
import { PermissionMapper } from '../../governance/authorization/permission-mapper.service';
import { AuditService } from '../../audit/audit.service';
import { Permission } from '../../governance/enums/permission.enum';
import { ROLE_PERMISSIONS } from '../../governance/enums/role-permissions.map';
import type { ExecutionContext } from '../../governance/interfaces/execution-context.interface';

/**
 * execution-runner.authorization.spec.ts
 *
 * Proves the authorization boundary inside ExecutionRunnerService.executeTask():
 * when the dispatched capability's definition declares a requiredPermission,
 * an unauthorized ExecutionContext must never reach provider.execute(), and
 * an authorized one must reach it exactly once, with authorization checked
 * strictly before dispatch.
 *
 * This proves the GATING MECHANISM inside ExecutionRunnerService works
 * correctly when a capability declares a requiredPermission. It does NOT
 * prove that any currently-registered production capability actually
 * declares one today (as of this writing, the only real registered
 * CapabilityRegistryService providers observed at boot — worker-inference,
 * worker-embedding — are deliberately ungated, per the fifth test below,
 * which mirrors that exact real behavior).
 *
 * Uses a REAL AuthorizationService (with real PolicyEngine and
 * PermissionMapper) — only AuditService is mocked (nestjs-pino wiring not
 * set up in this test module), plus every other ExecutionRunnerService
 * dependency unrelated to the authorization boundary itself
 * (PlannerService, TaskRouterService, ObservationManagerService,
 * InferenceService), and CapabilityRegistryService, whose
 * getCapabilityDefinition()/getCandidates() are mocked to return a
 * deterministic capability + provider pair for this test.
 *
 * Does NOT modify production code.
 */

const mockAuditService = {
  authorizationDecision: jest.fn(),
};

function makeContext(
  role: UserRole,
  overrides: Partial<ExecutionContext['principal']> = {},
): ExecutionContext {
  return {
    principal: {
      id: `principal-${role}`,
      principalType: 'USER',
      role,
      permissions: ROLE_PERMISSIONS[role],
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

describe('ExecutionRunnerService — authorization boundary', () => {
  let runner: ExecutionRunnerService;
  let authorizationService: AuthorizationService;
  let canSpy: jest.SpyInstance;
  let mockProvider: { id: string; execute: jest.Mock };
  let mockCapabilityRegistry: {
    getCapabilityDefinition: jest.Mock;
    getCandidates: jest.Mock;
  };
  let mockObservationManager: { ingestObservation: jest.Mock };

  const CAPABILITY_NAME = 'execute_sql';
  const REQUIRED_PERMISSION = Permission.EXECUTE_SQL;

  beforeEach(async () => {
    mockAuditService.authorizationDecision.mockClear();

    mockProvider = {
      id: 'tool-execute_sql',
      execute: jest.fn().mockResolvedValue({ rows: [] }),
    };

    mockCapabilityRegistry = {
      getCapabilityDefinition: jest.fn().mockReturnValue({
        id: CAPABILITY_NAME,
        requiredPermission: REQUIRED_PERMISSION,
      }),
      getCandidates: jest.fn().mockReturnValue([mockProvider]),
    };

    mockObservationManager = {
      ingestObservation: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutionRunnerService,
        { provide: PlannerService, useValue: { createPlan: jest.fn() } },
        { provide: CapabilityRegistryService, useValue: mockCapabilityRegistry },
        { provide: TaskRouterService, useValue: {} },
        { provide: ObservationManagerService, useValue: mockObservationManager },
        { provide: InferenceService, useValue: { infer: jest.fn() } },
        AuthorizationService,
        PolicyEngine,
        { provide: PermissionMapper, useValue: new PermissionMapper() },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    runner = module.get<ExecutionRunnerService>(ExecutionRunnerService);
    authorizationService = module.get<AuthorizationService>(AuthorizationService);
    canSpy = jest.spyOn(authorizationService, 'can');
  });

  afterEach(() => {
    canSpy.mockRestore();
  });

  describe('USER dispatching a capability requiring EXECUTE_SQL', () => {
    it('denies and never calls provider.execute()', async () => {
      const context = makeContext(UserRole.USER);

      expect(ROLE_PERMISSIONS[UserRole.USER]).not.toContain(REQUIRED_PERMISSION);

      await expect(
        runner.executeTask(
          { action: CAPABILITY_NAME, inputs: { query: 'SELECT 1' } },
          {},
          context,
          1,
        ),
      ).rejects.toThrow(/Task failed after 1 attempts/);

      expect(mockProvider.execute).not.toHaveBeenCalled();
      expect(canSpy).toHaveBeenCalledWith(context, REQUIRED_PERMISSION);
    });
  });

  describe('ADMIN dispatching a capability requiring EXECUTE_SQL', () => {
    it('denies (ADMIN does not hold EXECUTE_SQL) and never calls provider.execute()', async () => {
      const context = makeContext(UserRole.ADMIN);

      expect(ROLE_PERMISSIONS[UserRole.ADMIN]).not.toContain(REQUIRED_PERMISSION);

      await expect(
        runner.executeTask(
          { action: CAPABILITY_NAME, inputs: { query: 'SELECT 1' } },
          {},
          context,
          1,
        ),
      ).rejects.toThrow(/Task failed after 1 attempts/);

      expect(mockProvider.execute).not.toHaveBeenCalled();
      expect(canSpy).toHaveBeenCalledWith(context, REQUIRED_PERMISSION);
    });
  });

  describe('SUPER_ADMIN dispatching a capability requiring EXECUTE_SQL', () => {
    it('allows and calls provider.execute() exactly once', async () => {
      const context = makeContext(UserRole.SUPER_ADMIN);

      expect(ROLE_PERMISSIONS[UserRole.SUPER_ADMIN]).toContain(REQUIRED_PERMISSION);

      const output = await runner.executeTask(
        { action: CAPABILITY_NAME, inputs: { query: 'SELECT id FROM users LIMIT 1' } },
        {},
        context,
        1,
      );

      expect(output).toEqual({ rows: [] });
      expect(mockProvider.execute).toHaveBeenCalledTimes(1);
      expect(mockProvider.execute).toHaveBeenCalledWith(CAPABILITY_NAME, {
        query: 'SELECT id FROM users LIMIT 1',
      });
      expect(canSpy).toHaveBeenCalledWith(context, REQUIRED_PERMISSION);
    });
  });

  describe('capability with no requiredPermission (matches real, currently-registered inference/embedding providers)', () => {
    it('is dispatched without any authorization check (ungated by design)', async () => {
      mockCapabilityRegistry.getCapabilityDefinition.mockReturnValue({
        id: 'embed_text',
        // no requiredPermission — mirrors the real CapabilityDefinition
        // shape for worker-inference/worker-embedding providers observed
        // at boot, per direct inspection of ExecutionRunnerService's
        // `if (definition?.requiredPermission)` conditional guard.
      });
      const ungatedProvider = { id: 'worker-embedding', execute: jest.fn().mockResolvedValue({ vector: [] }) };
      mockCapabilityRegistry.getCandidates.mockReturnValue([ungatedProvider]);

      const context = makeContext(UserRole.USER);

      const output = await runner.executeTask(
        { action: 'embed_text', inputs: { text: 'hello' } },
        {},
        context,
        1,
      );

      expect(output).toEqual({ vector: [] });
      expect(ungatedProvider.execute).toHaveBeenCalledTimes(1);
      expect(canSpy).not.toHaveBeenCalled();
    });
  });

  describe('denial ordering — authorization must precede execution', () => {
    it('never invokes provider.execute() before AuthorizationService.can() has returned false', async () => {
      const context = makeContext(UserRole.USER);
      const callOrder: string[] = [];

      canSpy.mockImplementation(
        (...args: Parameters<AuthorizationService['can']>) => {
          callOrder.push('authorization');
          return AuthorizationService.prototype.can.apply(authorizationService, args);
        },
      );
      mockProvider.execute.mockImplementation(async () => {
        callOrder.push('execution');
        return { rows: [] };
      });

      await expect(
        runner.executeTask(
          { action: CAPABILITY_NAME, inputs: { query: 'SELECT 1' } },
          {},
          context,
          1,
        ),
      ).rejects.toThrow();

      expect(callOrder).toEqual(['authorization']);
      expect(callOrder).not.toContain('execution');
    });
  });
});
