import { Test, TestingModule } from '@nestjs/testing';
import { MemoryLifecycleService } from './memory-lifecycle.service';
import { DatabaseService } from '../../../database';

describe('MemoryLifecycleService', () => {
  let service: MemoryLifecycleService;

  beforeEach(async () => {
    const mockDatabase = {
      db: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryLifecycleService,
        { provide: DatabaseService, useValue: mockDatabase },
      ],
    }).compile();

    service = module.get<MemoryLifecycleService>(MemoryLifecycleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize metadata', async () => {
    await expect(
      service.initializeMetadata('user', 'FACT', 'mem-1'),
    ).resolves.toBeUndefined();
  });
});
