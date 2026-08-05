import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowEngineService } from './workflow-engine.service';
import { DatabaseService } from '../../../database/database.service';
import { ExecutionOrchestratorService } from './execution-orchestrator.service';
import { WorkflowDefinition } from '../contracts/workflow.dto';

describe('WorkflowEngineService', () => {
  let service: WorkflowEngineService;
  let dbMock: {
    db: {
      insert: jest.Mock;
      values: jest.Mock;
      returning: jest.Mock;
      select: jest.Mock;
      from: jest.Mock;
      where: jest.Mock;
      update: jest.Mock;
      set: jest.Mock;
    };
  };
  let orchestratorMock: { submitTask: jest.Mock };
  let eventEmitterMock: { emit: jest.Mock };

  beforeEach(async () => {
    dbMock = {
      db: {
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([
          {
            id: 'wf-1',
            userId: 'user-1',
            status: 'PENDING',
            state: { step1: { status: 'PENDING' } },
            definition: { steps: [] },
          },
        ]),
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([
          {
            id: 'wf-1',
            userId: 'user-1',
            status: 'PENDING',
            state: { step1: { status: 'PENDING' } },
            definition: {
              steps: [
                { id: 'step1', capabilityId: 'cap1', input: { arg: 1 } },
                {
                  id: 'step2',
                  capabilityId: 'cap2',
                  input: { arg: 2 },
                  dependencies: ['step1'],
                },
              ],
            },
          },
        ]),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
      },
    };

    orchestratorMock = {
      submitTask: jest.fn().mockResolvedValue({ id: 'task-1' }),
    };

    eventEmitterMock = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowEngineService,
        { provide: DatabaseService, useValue: dbMock },
        { provide: ExecutionOrchestratorService, useValue: orchestratorMock },
        { provide: EventEmitter2, useValue: eventEmitterMock },
      ],
    }).compile();

    service = module.get<WorkflowEngineService>(WorkflowEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitWorkflow', () => {
    it('should create workflow and start evaluation', async () => {
      const definition: WorkflowDefinition = {
        steps: [{ id: 'step1', capabilityId: 'echo', input: 'hello' }],
      };
      const wf = await service.submitWorkflow('user-1', definition, 'Test WF');

      expect(wf).toBeDefined();
      expect(wf.id).toBe('wf-1');
      expect(dbMock.db.insert).toHaveBeenCalled();
    });
  });

  describe('evaluateDAG', () => {
    it('should submit step1 and leave step2 pending', async () => {
      // Direct call to private method for testing logic
      await (
        service as unknown as { evaluateDAG: (id: string) => Promise<void> }
      ).evaluateDAG('wf-1');

      expect(dbMock.db.update).toHaveBeenCalled();
      expect(orchestratorMock.submitTask).toHaveBeenCalledWith(
        'user-1',
        'cap1',
        { arg: 1 },
        undefined,
        undefined,
      );
      // step2 should not be submitted because step1 is not SUCCESS
      expect(orchestratorMock.submitTask).toHaveBeenCalledTimes(1);
    });

    it('should skip step if condition evaluates to false', async () => {
      dbMock.db.where.mockResolvedValueOnce([
        {
          id: 'wf-2',
          userId: 'user-1',
          status: 'RUNNING',
          state: { step1: { status: 'PENDING' } },
          definition: {
            steps: [
              {
                id: 'step1',
                capabilityId: 'cap1',
                input: {},
                condition: '{"==": [1, 2]}',
              },
            ],
          },
        },
      ]);

      await (
        service as unknown as { evaluateDAG: (id: string) => Promise<void> }
      ).evaluateDAG('wf-2');

      // Should not submit task
      expect(orchestratorMock.submitTask).not.toHaveBeenCalled();
    });

    it('should interpolate variables', async () => {
      dbMock.db.where.mockResolvedValueOnce([
        {
          id: 'wf-3',
          userId: 'user-1',
          status: 'RUNNING',
          state: {
            step1: { status: 'SUCCESS', output: { value: 'world' } },
            step2: { status: 'PENDING' },
          },
          definition: {
            steps: [
              { id: 'step1', capabilityId: 'cap1', input: {} },
              {
                id: 'step2',
                capabilityId: 'cap2',
                input: { msg: 'hello ${step1.output.value}' },
                dependencies: ['step1'],
              },
            ],
          },
        },
      ]);

      await (
        service as unknown as { evaluateDAG: (id: string) => Promise<void> }
      ).evaluateDAG('wf-3');

      expect(orchestratorMock.submitTask).toHaveBeenCalledWith(
        'user-1',
        'cap2',
        { msg: 'hello world' },
        undefined,
        undefined,
      );
    });
  });
});
