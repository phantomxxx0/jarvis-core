import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowPlannerService } from './workflow-planner.service';
import { WorkflowValidatorService } from './workflow-validator.service';
import { CapabilityRegistryService } from './capability-registry.service';
import { InferenceService } from '../../workers/inference/services/inference.service';

describe('WorkflowPlannerService', () => {
  let service: WorkflowPlannerService;
  let inferenceMock: any;
  let validatorMock: any;
  let registryMock: any;

  beforeEach(async () => {
    inferenceMock = {
      infer: jest.fn()
    };
    
    validatorMock = {
      validate: jest.fn().mockReturnValue({ valid: true, errors: [] })
    };

    registryMock = {
      listCapabilities: jest.fn().mockReturnValue([{ id: 'cap1', description: 'desc1' }])
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowPlannerService,
        { provide: InferenceService, useValue: inferenceMock },
        { provide: WorkflowValidatorService, useValue: validatorMock },
        { provide: CapabilityRegistryService, useValue: registryMock }
      ],
    }).compile();

    service = module.get<WorkflowPlannerService>(WorkflowPlannerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should successfully plan a workflow', async () => {
    inferenceMock.infer.mockResolvedValueOnce({
      content: JSON.stringify({ steps: [{ id: '1', capabilityId: 'cap1', input: {}, dependencies: [] }] })
    });

    const result = await service.plan('do something');
    expect(result).toBeDefined();
    expect(result.steps.length).toBe(1);
    expect(result.planningMetadata?.validationResult).toBe('SUCCESS');
    expect(inferenceMock.infer).toHaveBeenCalledTimes(1);
  });

  it('should attempt repair if validation fails', async () => {
    inferenceMock.infer
      .mockResolvedValueOnce({ content: JSON.stringify({ steps: [] }) }) // Invalid output first time
      .mockResolvedValueOnce({ content: JSON.stringify({ steps: [{ id: '1', capabilityId: 'cap1', input: {}, dependencies: [] }] }) }); // Valid output second time
      
    validatorMock.validate
      .mockReturnValueOnce({ valid: false, errors: ['No steps'] })
      .mockReturnValueOnce({ valid: true, errors: [] });

    const result = await service.plan('do something');
    
    expect(result).toBeDefined();
    expect(result.planningMetadata?.validationResult).toBe('REPAIRED');
    expect(result.planningMetadata?.repairAttempts).toBe(1);
    expect(inferenceMock.infer).toHaveBeenCalledTimes(2);
  });

  it('should fail if repair fails', async () => {
    inferenceMock.infer
      .mockResolvedValueOnce({ content: JSON.stringify({ steps: [] }) })
      .mockResolvedValueOnce({ content: JSON.stringify({ steps: [] }) });
      
    validatorMock.validate
      .mockReturnValue({ valid: false, errors: ['No steps'] });

    await expect(service.plan('do something')).rejects.toThrow('Workflow repair failed');
    expect(inferenceMock.infer).toHaveBeenCalledTimes(2);
  });
});
