import { Test, TestingModule } from '@nestjs/testing';
import { MemoryRankingService } from './memory-ranking.service';
import { DatabaseService } from '../../../database';
import { MemoryContext } from '../interfaces/memory-service.interface';

describe('MemoryRankingService', () => {
  let service: MemoryRankingService;

  beforeEach(async () => {
    const mockDatabase = {
      db: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([
          {
            id: 'mem-1',
            importance: 80,
            lastAccessedAt: new Date(),
            metadata: { accessCount: 5 },
            status: 'active',
          },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryRankingService,
        { provide: DatabaseService, useValue: mockDatabase },
      ],
    }).compile();

    service = module.get<MemoryRankingService>(MemoryRankingService);
  });

  it('should dynamically rank contexts based on metadata', async () => {
    const contexts: MemoryContext[] = [
      { content: 'C1', source: 'FACT', confidence: 50, memoryId: 'mem-1' },
      { content: 'C2', source: 'FACT', confidence: 60, memoryId: 'mem-2' },
    ];

    const ranked = await service.rank(contexts);
    expect(ranked.length).toBe(2);
    // mem-1 has metadata boost, so it should rank higher than mem-2
    expect(ranked[0].memoryId).toBe('mem-1');
  });
});
