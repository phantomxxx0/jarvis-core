import { Test, TestingModule } from '@nestjs/testing';
import { MemoryValidatorService } from './memory-validator.service';
import { ExtractedMemory } from '../extractors/memory-extractor.interface';

describe('MemoryValidatorService', () => {
  let service: MemoryValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MemoryValidatorService],
    }).compile();

    service = module.get<MemoryValidatorService>(MemoryValidatorService);
  });

  it('should reject low confidence memories', () => {
    const memories: ExtractedMemory[] = [
      { type: 'FACT', data: { fact: 'High conf' }, confidence: 90 },
      { type: 'FACT', data: { fact: 'Low conf' }, confidence: 20 },
    ];
    const validated = service.validate(memories);
    expect(validated.length).toBe(1);
    expect(validated[0].data.fact).toBe('High conf');
  });

  it('should remove exact duplicates', () => {
    const memories: ExtractedMemory[] = [
      { type: 'FACT', data: { fact: 'Same' }, confidence: 90 },
      { type: 'FACT', data: { fact: 'Same' }, confidence: 95 },
    ];
    const validated = service.validate(memories);
    expect(validated.length).toBe(1);
    expect(validated[0].confidence).toBe(95);
  });

  it('should normalize names', () => {
    const memories: ExtractedMemory[] = [
      { type: 'PROJECT', data: { name: '  Project A  ' }, confidence: 90 },
    ];
    const validated = service.validate(memories);
    expect(validated[0].data.name).toBe('Project A');
  });
});
