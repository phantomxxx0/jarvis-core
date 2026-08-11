import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@jarvis/database';
import { ToolRouter } from './tool-router';
import { ToolRegistryService } from '../../tools/tool-registry.service';
import { AuthorizationService } from '../../governance/authorization/authorization.service';
import { PolicyEngine } from '../../governance/authorization/policy-engine.service';
import { PermissionMapper } from '../../governance/authorization/permission-mapper.service';
import { AuditService } from '../../audit/audit.service';
import { Permission } from '../../governance/enums/permission.enum';
import { ROLE_PERMISSIONS } from '../../governance/enums/role-permissions.map';
import type { ExecutionContext } from '../../governance/interfaces/execution-context.interface';
import type { JarvisTool } from '../../tools/tool.interface';

/**
 * tool-router.authorization.spec.ts
 *
 * Proves the execution-boundary invariant: an unauthorized principal
 * cannot physically reach tool.execute(), regardless of what the LLM
 * planner decides to attempt. This is deliberately independent of any
 * LLM/prompt behavior — ToolRouter.invoke() is called directly.
 *
 * Uses a REAL AuthorizationService (with real PolicyEngine and
 * PermissionMapper) so this is a proof of actual authorization
 * semantics, not a test of mocked-out permission logic. Only
 * AuditService and ToolRegistryService are mocked — the former because
 * a real instance requires nestjs-pino wiring the test module doesn't
 * set up, the latter because we need deterministic tool objects with
 * mocked execute() rather than the real ReadFileTool/ExecuteSqlTool
 * (no real filesystem or database access in this suite).
 *
 * Does NOT modify production authorization logic.
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

function makeMockTool(
  name: string,
  requiredPermission: Permission,
  executeResult: unknown = { ok: true },
): JarvisTool & { execute: jest.Mock } {
  return {
    name,
    description: `Mock tool: ${name}`,
    requiredPermission,
    execute: jest.fn().mockResolvedValue(executeResult),
  };
}

describe('ToolRouter — authorization boundary', () => {
  let toolRouter: ToolRouter;
  let authorizationService: AuthorizationService;
  let canSpy: jest.SpyInstance;
  let mockReadFileTool: ReturnType<typeof makeMockTool>;
  let mockExecuteSqlTool: ReturnType<typeof makeMockTool>;
  let mockV1Registry: { getAvailableTools: jest.Mock };

  beforeEach(async () => {
    mockAuditService.authorizationDecision.mockClear();

    mockReadFileTool = makeMockTool(
      'read_project_file',
      Permission.READ_FILES,
      {
        content: 'mock file contents',
      },
    );
    mockExecuteSqlTool = makeMockTool('execute_sql', Permission.EXECUTE_SQL, {
      rows: [],
    });

    mockV1Registry = {
      getAvailableTools: jest
        .fn()
        .mockReturnValue([mockReadFileTool, mockExecuteSqlTool]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToolRouter,
        { provide: ToolRegistryService, useValue: mockV1Registry },
        AuthorizationService,
        PolicyEngine,
        { provide: PermissionMapper, useValue: new PermissionMapper() },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    toolRouter = module.get<ToolRouter>(ToolRouter);
    authorizationService =
      module.get<AuthorizationService>(AuthorizationService);
    canSpy = jest.spyOn(authorizationService, 'can');
  });

  afterEach(() => {
    canSpy.mockRestore();
  });

  describe('USER invoking execute_sql', () => {
    it('denies, never calls tool.execute(), and checks EXECUTE_SQL', async () => {
      const context = makeContext(UserRole.USER);

      const result = await toolRouter.invoke(
        'execute_sql',
        { query: 'SELECT 1' },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Permission denied/);
      expect(mockExecuteSqlTool.execute).not.toHaveBeenCalled();
      expect(canSpy).toHaveBeenCalledWith(context, Permission.EXECUTE_SQL);
    });
  });

  describe('ADMIN invoking execute_sql', () => {
    it('denies (ADMIN does not hold EXECUTE_SQL) and never calls tool.execute()', async () => {
      const context = makeContext(UserRole.ADMIN);

      // Sanity-check the fixture itself: this test is only meaningful if
      // ADMIN's role map genuinely excludes EXECUTE_SQL.
      expect(ROLE_PERMISSIONS[UserRole.ADMIN]).not.toContain(
        Permission.EXECUTE_SQL,
      );

      const result = await toolRouter.invoke(
        'execute_sql',
        { query: 'SELECT 1' },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Permission denied/);
      expect(mockExecuteSqlTool.execute).not.toHaveBeenCalled();
      expect(canSpy).toHaveBeenCalledWith(context, Permission.EXECUTE_SQL);
    });
  });

  describe('ADMIN invoking read_project_file', () => {
    it('allows (ADMIN holds READ_FILES) and calls tool.execute() exactly once', async () => {
      const context = makeContext(UserRole.ADMIN);

      expect(ROLE_PERMISSIONS[UserRole.ADMIN]).toContain(Permission.READ_FILES);

      const result = await toolRouter.invoke(
        'read_project_file',
        { path: 'README.md' },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.output).toEqual({ content: 'mock file contents' });
      expect(mockReadFileTool.execute).toHaveBeenCalledTimes(1);
      expect(mockReadFileTool.execute).toHaveBeenCalledWith({
        path: 'README.md',
      });
      expect(canSpy).toHaveBeenCalledWith(context, Permission.READ_FILES);
    });
  });

  describe('SUPER_ADMIN invoking execute_sql', () => {
    it('allows (SUPER_ADMIN holds all permissions) and calls tool.execute() exactly once', async () => {
      const context = makeContext(UserRole.SUPER_ADMIN);

      expect(ROLE_PERMISSIONS[UserRole.SUPER_ADMIN]).toEqual(
        Object.values(Permission),
      );

      const result = await toolRouter.invoke(
        'execute_sql',
        { query: 'SELECT id FROM users LIMIT 1' },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.output).toEqual({ rows: [] });
      expect(mockExecuteSqlTool.execute).toHaveBeenCalledTimes(1);
      expect(canSpy).toHaveBeenCalledWith(context, Permission.EXECUTE_SQL);
    });
  });

  describe('denial ordering — authorization must precede execution', () => {
    it('never invokes tool.execute() before AuthorizationService.can() has returned false', async () => {
      const context = makeContext(UserRole.USER);
      const callOrder: string[] = [];

      canSpy.mockImplementation(
        (...args: Parameters<AuthorizationService['can']>) => {
          callOrder.push('can');
          return AuthorizationService.prototype.can.apply(
            authorizationService,
            args,
          );
        },
      );
      mockExecuteSqlTool.execute.mockImplementation(async () => {
        callOrder.push('execute');
        return { rows: [] };
      });

      await toolRouter.invoke('execute_sql', { query: 'SELECT 1' }, context);

      expect(callOrder).toEqual(['can']);
      expect(callOrder).not.toContain('execute');
    });
  });

  describe('unknown skill name', () => {
    it('returns a not-found failure and never checks authorization or calls any tool', async () => {
      const context = makeContext(UserRole.SUPER_ADMIN);

      const result = await toolRouter.invoke(
        'shell',
        { command: 'echo hi' },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.output).toBeNull();
      expect(result.error).toMatch(/Skill 'shell' not found in V1 registry\./);
      expect(canSpy).not.toHaveBeenCalled();
      expect(mockReadFileTool.execute).not.toHaveBeenCalled();
      expect(mockExecuteSqlTool.execute).not.toHaveBeenCalled();
    });
  });
});
