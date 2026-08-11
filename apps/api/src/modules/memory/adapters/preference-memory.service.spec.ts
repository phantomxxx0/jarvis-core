import { Test, TestingModule } from '@nestjs/testing';
import { PreferenceMemoryService } from './preference-memory.service';
import { DatabaseService } from '../../../database';

describe('PreferenceMemoryService', () => {
  let service: PreferenceMemoryService;
  let mockDb: {
    select: jest.Mock;
    from: jest.Mock;
    where: jest.Mock;
    limit: jest.Mock;
  };

  const preferences = [
    {
      id: 'pref-1',
      userId: 'user-1',
      category: 'coding',
      key: 'editor',
      value: 'VS Code',
      confidence: 95,
    },
    {
      id: 'pref-2',
      userId: 'user-1',
      category: 'communication',
      key: 'style',
      value: 'concise',
      confidence: 90,
    },
  ];

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(preferences),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferenceMemoryService,
        {
          provide: DatabaseService,
          useValue: { db: mockDb },
        },
      ],
    }).compile();

    service = module.get<PreferenceMemoryService>(PreferenceMemoryService);
  });

  it('returns all preferences for the user when query is empty', async () => {
    const result = await service.retrieve({
      userId: 'user-1',
      query: '',
      limit: 50,
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'pref-1',
      category: 'coding',
      key: 'editor',
      value: 'VS Code',
      confidence: 95,
    });

    expect(mockDb.where).toHaveBeenCalledTimes(1);
    expect(mockDb.limit).toHaveBeenCalledWith(50);
  });

  it('applies the category filter when query is non-empty', async () => {
    await service.retrieve({
      userId: 'user-1',
      query: 'coding',
      limit: 10,
    });

    expect(mockDb.where).toHaveBeenCalledTimes(1);

    const whereExpression = mockDb.where.mock.calls[0][0];

    expect(whereExpression).toBeDefined();
    expect(mockDb.limit).toHaveBeenCalledWith(10);
  });

  it('preserves a larger limit for standing-preference loading', async () => {
    await service.retrieve({
      userId: 'user-1',
      query: '',
      limit: 50,
    });

    expect(mockDb.limit).toHaveBeenCalledWith(50);
  });

  it('uses the default limit when no limit is supplied', async () => {
    await service.retrieve({
      userId: 'user-1',
      query: '',
    });

    expect(mockDb.limit).toHaveBeenCalledWith(10);
  });
});
