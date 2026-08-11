import { Test, TestingModule } from '@nestjs/testing';
import { TaskPlannerService } from './task-planner.service';
import { CapabilityRegistryService } from './capability-registry.service';
import {
  CapabilityNotFoundException,
  NoEligibleWorkerException,
  PlannerValidationException,
} from '../exceptions/planner.exceptions';

describe('TaskPlannerService', () => {
  let planner: TaskPlannerService;
  let registry: { getCapability: jest.Mock; getWorker: jest.Mock };

  beforeEach(async () => {
    // Create a mock for CapabilityRegistryService
    registry = {
      getCapability: jest.fn(),
      getWorker: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskPlannerService,
        {
          provide: CapabilityRegistryService,
          useValue: registry,
        },
      ],
    }).compile();

    planner = module.get<TaskPlannerService>(TaskPlannerService);
  });

  it('should throw PlannerValidationException if capabilityId is missing', () => {
    expect(() => planner.planTask({ capabilityId: '', input: {} })).toThrow(
      PlannerValidationException,
    );
  });

  it('should throw CapabilityNotFoundException if capability is not in registry', () => {
    registry.getCapability.mockReturnValue(undefined);

    expect(() =>
      planner.planTask({ capabilityId: 'unknown.cap', input: {} }),
    ).toThrow(CapabilityNotFoundException);
    expect(registry.getCapability).toHaveBeenCalledWith('unknown.cap');
  });

  it('should throw NoEligibleWorkerException if capability has no workers', () => {
    registry.getCapability.mockReturnValue({
      workerIds: [],
    });

    expect(() =>
      planner.planTask({ capabilityId: 'system.info', input: {} }),
    ).toThrow(NoEligibleWorkerException);
  });

  it('should throw NoEligibleWorkerException if matching workers are OFFLINE', () => {
    registry.getCapability.mockReturnValue({
      workerIds: ['worker-1'],
    });
    registry.getWorker.mockReturnValue({
      id: 'worker-1',
      status: 'OFFLINE',
    });

    expect(() =>
      planner.planTask({ capabilityId: 'system.info', input: {} }),
    ).toThrow(NoEligibleWorkerException);
  });

  it('should successfully plan task for a single ACTIVE worker', () => {
    registry.getCapability.mockReturnValue({
      workerIds: ['worker-1'],
    });
    registry.getWorker.mockReturnValue({
      id: 'worker-1',
      status: 'ACTIVE',
    });

    const plan = planner.planTask({ capabilityId: 'system.info', input: {} });
    expect(plan.workerId).toBe('worker-1');
    expect(plan.capabilityId).toBe('system.info');
    expect(plan.reason).toBeDefined();
  });

  it('should deterministically select the first ACTIVE worker when multiple qualify', () => {
    registry.getCapability.mockReturnValue({
      workerIds: ['worker-b', 'worker-a', 'worker-c'],
    });
    registry.getWorker.mockImplementation((id: string) => ({
      id,
      status: 'ACTIVE',
    }));

    const plan1 = planner.planTask({ capabilityId: 'system.info', input: {} });
    const plan2 = planner.planTask({ capabilityId: 'system.info', input: {} });

    // Based on deterministic sorting in FirstAvailableStrategy, 'worker-a' should be chosen
    expect(plan1.workerId).toBe('worker-a');
    expect(plan2.workerId).toBe('worker-a');
  });

  it('should skip offline workers and select an ACTIVE one', () => {
    registry.getCapability.mockReturnValue({
      workerIds: ['worker-a', 'worker-b'],
    });

    registry.getWorker.mockImplementation((id: string) => {
      if (id === 'worker-a') return { id, status: 'OFFLINE' };
      if (id === 'worker-b') return { id, status: 'ACTIVE' };
      return undefined;
    });

    const plan = planner.planTask({ capabilityId: 'system.info', input: {} });

    expect(plan.workerId).toBe('worker-b');
  });
});
