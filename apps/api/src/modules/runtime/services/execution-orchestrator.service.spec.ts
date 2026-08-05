import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExecutionOrchestratorService } from './execution-orchestrator.service';
import { DatabaseService } from '../../../database';
import { TaskExecutionStatus } from '../contracts/execution.dto';

describe('ExecutionOrchestratorService', () => {
  let service: ExecutionOrchestratorService;
  let dbMock: any;
  let eventEmitterMock: any;

  beforeEach(async () => {
    dbMock = {
      db: {
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'test-id', status: 'PENDING' }]),
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ id: 'test-id', status: 'QUEUED' }]),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
      }
    };

    eventEmitterMock = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutionOrchestratorService,
        { provide: DatabaseService, useValue: dbMock },
        { provide: EventEmitter2, useValue: eventEmitterMock },
      ],
    }).compile();

    service = module.get<ExecutionOrchestratorService>(ExecutionOrchestratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitTask', () => {
    it('should create a task and transition to QUEUED', async () => {
      const task = await service.submitTask('user1', 'shell.exec', { command: 'ls' });
      expect(task).toBeDefined();
      expect(dbMock.db.insert).toHaveBeenCalled();
      expect(dbMock.db.update).toHaveBeenCalled();
      expect(eventEmitterMock.emit).toHaveBeenCalledWith(
        'TaskExecution.QUEUED',
        expect.anything()
      );
    });
  });

  describe('setRunning', () => {
    it('should start dual timeout and transition to RUNNING', async () => {
      // Mock getExecution for the internal lookup
      dbMock.db.where.mockResolvedValueOnce([{ id: 'test-id', timeoutMs: 100, status: 'RUNNING' }]);
      
      await service.setRunning('test-id');
      
      expect(dbMock.db.update).toHaveBeenCalled();
      expect(eventEmitterMock.emit).toHaveBeenCalledWith(
        'TaskExecution.RUNNING',
        expect.anything()
      );
    });
  });

  describe('failTask', () => {
    it('should retry if attempts < maxRetries', async () => {
      dbMock.db.where.mockResolvedValueOnce([{ id: 'test-id', attempts: 0, maxRetries: 3 }]);
      
      await service.failTask('test-id', { message: 'Network error' });
      
      expect(dbMock.db.update).toHaveBeenCalled(); // Increment attempt
      expect(eventEmitterMock.emit).toHaveBeenCalledWith(
        'TaskExecution.RETRYING',
        expect.anything()
      );
    });

    it('should fail if maxRetries reached', async () => {
      dbMock.db.where.mockResolvedValueOnce([{ id: 'test-id', attempts: 3, maxRetries: 3 }]);
      
      await service.failTask('test-id', { message: 'Network error' });
      
      expect(eventEmitterMock.emit).toHaveBeenCalledWith(
        'TaskExecution.FAILED',
        expect.anything()
      );
    });
  });
});
