import { Test, TestingModule } from '@nestjs/testing';
import { MemoriesService } from './memories.service';
import { MemoriesRepository } from './repositories/memories.repository';
import { MemoryIndexService } from './services/memory-index.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BrainEvent } from '../brain/events/enums/brain-event.enum';

describe('MemoriesService', () => {
  let service: MemoriesService;
  let memoriesRepository: jest.Mocked<MemoriesRepository>;
  let memoryIndexService: jest.Mocked<MemoryIndexService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    memoriesRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findUnconsolidated: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      archive: jest.fn(),
      updateLastAccessed: jest.fn(),
    } as unknown as jest.Mocked<MemoriesRepository>;

    memoryIndexService = {
      searchSimilar: jest.fn(),
      index: jest.fn(),
    } as unknown as jest.Mocked<MemoryIndexService>;

    eventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;

    service = new MemoriesService(memoriesRepository, memoryIndexService, eventEmitter);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully store memory in PostgreSQL, emit MEMORY_STORED event, and not directly call index', async () => {
      const createData = {
        userId: 'test-user',
        type: 'SEMANTIC_FACT',
        origin: 'TEST',
        content: 'Fact',
      };

      const dbMemoryRow = {
        id: 'mem-123',
        ...createData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      memoriesRepository.create.mockResolvedValue(dbMemoryRow as any);

      const result = await service.create(createData);

      // Verify PostgreSQL insertion succeeds (repository is called)
      expect(memoriesRepository.create).toHaveBeenCalledWith(createData);
      
      // Verify MEMORY_STORED is emitted exactly once
      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
      
      // Verify the emitted object contains the inserted memory ID and required fields
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        BrainEvent.MEMORY_STORED,
        { memory: dbMemoryRow }
      );

      // Verify indexing is not performed directly bypass
      expect(memoryIndexService.index).not.toHaveBeenCalled();

      // Return value is correct
      expect(result).toEqual(dbMemoryRow);
    });
  });
});
