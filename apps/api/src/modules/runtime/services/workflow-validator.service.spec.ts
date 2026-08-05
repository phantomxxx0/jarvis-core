import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowValidatorService } from './workflow-validator.service';
import { CapabilityRegistryService } from './capability-registry.service';

describe('WorkflowValidatorService', () => {
  let service: WorkflowValidatorService;
  let registryMock: any;

  beforeEach(async () => {
    registryMock = {
      getCapability: jest.fn().mockImplementation((id: string) => {
        if (id === 'valid-cap') return { id: 'valid-cap' };
        return undefined;
      })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowValidatorService,
        { provide: CapabilityRegistryService, useValue: registryMock }
      ],
    }).compile();

    service = module.get<WorkflowValidatorService>(WorkflowValidatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should validate a correct workflow', () => {
    const def = {
      steps: [
        { id: '1', capabilityId: 'valid-cap', input: {}, dependencies: [] },
        { id: '2', capabilityId: 'valid-cap', input: { arg: '${1.output.result}' }, dependencies: ['1'] }
      ]
    };
    const res = service.validate(def);
    expect(res.valid).toBe(true);
  });

  it('should invalidate duplicate step ids', () => {
    const def = {
      steps: [
        { id: '1', capabilityId: 'valid-cap', input: {}, dependencies: [] },
        { id: '1', capabilityId: 'valid-cap', input: {}, dependencies: [] }
      ]
    };
    const res = service.validate(def);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('Duplicate step id found');
  });

  it('should invalidate unknown capabilities', () => {
    const def = {
      steps: [
        { id: '1', capabilityId: 'unknown-cap', input: {}, dependencies: [] }
      ]
    };
    const res = service.validate(def);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('Unknown capability required: unknown-cap');
  });

  it('should invalidate unknown dependencies', () => {
    const def = {
      steps: [
        { id: '1', capabilityId: 'valid-cap', input: {}, dependencies: ['2'] }
      ]
    };
    const res = service.validate(def);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('declares an unknown dependency: 2');
  });

  it('should invalidate cyclic dependencies', () => {
    const def = {
      steps: [
        { id: '1', capabilityId: 'valid-cap', input: {}, dependencies: ['2'] },
        { id: '2', capabilityId: 'valid-cap', input: {}, dependencies: ['1'] }
      ]
    };
    const res = service.validate(def);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('Cycle detected');
  });

  it('should invalidate variables that do not reference upstream dependencies', () => {
    const def = {
      steps: [
        { id: '1', capabilityId: 'valid-cap', input: {}, dependencies: [] },
        { id: '2', capabilityId: 'valid-cap', input: { arg: '${1.output.result}' }, dependencies: [] }
      ]
    };
    const res = service.validate(def);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('references 1 which is not an upstream dependency');
  });
});
