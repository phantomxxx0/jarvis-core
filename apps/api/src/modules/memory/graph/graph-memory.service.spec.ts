import { Test, TestingModule } from '@nestjs/testing';
import { GraphMemoryService } from './graph-memory.service';
import { GraphRepository } from './graph.repository';

describe('GraphMemoryService', () => {
  let service: GraphMemoryService;
  let graphRepo: jest.Mocked<GraphRepository>;

  beforeEach(async () => {
    graphRepo = {
      searchEntities: jest.fn(),
      searchRelationshipsByRelation: jest.fn(),
      findEntityById: jest.fn(),
      findEntityByName: jest.fn(),
      findRelationshipsByEntityId: jest.fn(),
      createEntity: jest.fn(),
      createRelationship: jest.fn(),
      resolveEntity: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphMemoryService,
        { provide: GraphRepository, useValue: graphRepo },
      ],
    }).compile();

    service = module.get<GraphMemoryService>(GraphMemoryService);
  });

  describe('retrieve', () => {
    it('should map first-person pronouns to the canonical USER entity', async () => {
      // Mock resolveEntity for 'USER'
      graphRepo.resolveEntity.mockResolvedValueOnce({
        id: 'user-entity-id',
        ownerId: 'test-user',
        name: 'USER',
        type: 'person',
        description: null,
        metadata: null,
        scope: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      graphRepo.findRelationshipsByEntityId.mockResolvedValueOnce([
        {
          id: 'rel-1',
          userId: 'test-user',
          fromEntity: 'user-entity-id',
          toEntity: 'aungan-entity-id',
          relation: 'BROTHER',
          confidence: 100,
        } as any,
        {
          id: 'rel-2',
          userId: 'test-user',
          fromEntity: 'soubhik-entity-id',
          toEntity: 'samir-entity-id',
          relation: 'FATHER',
          confidence: 100,
        } as any, // Unrelated relationship that should NOT be returned
      ]);

      graphRepo.findEntityById.mockImplementation(async (userId, id) => {
         if (id === 'user-entity-id') return { name: 'USER' } as any;
         if (id === 'aungan-entity-id') return { name: 'Aungan Sikder' } as any;
         return null;
      });

      const results = await service.retrieve({
        userId: 'test-user',
        query: 'Who is my brother?',
        limit: 10,
      });

      expect(graphRepo.resolveEntity).toHaveBeenCalledWith('test-user', 'USER');
      expect(results).toHaveLength(1);
      expect(results[0].relationships).toHaveLength(1);
      expect(results[0].relationships[0]).toMatchObject({
        from: 'USER',
        relation: 'BROTHER',
        to: 'Aungan Sikder',
      });
      // Negative assertion: Samir Kundu (Soubhik's father) is not present
      expect(results[0].relationships.find(r => r.to === 'Samir Kundu')).toBeUndefined();
    });

    it('should retrieve relationships for a specific subject like Soubhik and exclude unrelated relationships', async () => {
      graphRepo.resolveEntity.mockImplementation(async (userId, term) => {
        if (term === 'Soubhik') {
          return { id: 'soubhik-entity-id', name: 'Soubhik' } as any;
        }
        return null;
      });

      graphRepo.findRelationshipsByEntityId.mockResolvedValueOnce([
        {
          id: 'rel-1',
          userId: 'test-user',
          fromEntity: 'soubhik-entity-id',
          toEntity: 'moti-entity-id',
          relation: 'BROTHER',
          confidence: 100,
        } as any,
      ]);

      graphRepo.findEntityById.mockImplementation(async (userId, id) => {
         if (id === 'soubhik-entity-id') return { name: 'Soubhik' } as any;
         if (id === 'moti-entity-id') return { name: 'Moti' } as any;
         return null;
      });

      const results = await service.retrieve({
        userId: 'test-user',
        query: "Who is Soubhik's brother?",
        limit: 10,
      });

      expect(results).toHaveLength(1);
      expect(results[0].relationships).toHaveLength(1);
      expect(results[0].relationships[0]).toMatchObject({
        from: 'Soubhik',
        relation: 'BROTHER',
        to: 'Moti',
      });
      // Negative assertion: Aungan (USER's brother) is not magically fetched
      expect(results[0].relationships.find(r => r.to === 'Aungan')).toBeUndefined();
    });

    it('should handle unresolved subject behavior (empty array returned)', async () => {
      graphRepo.resolveEntity.mockResolvedValueOnce(null);

      const results = await service.retrieve({
        userId: 'test-user',
        query: 'Who is XYZ?',
        limit: 10,
      });

      expect(results).toHaveLength(0);
      expect(graphRepo.findRelationshipsByEntityId).not.toHaveBeenCalled();
    });

    it('should correctly filter by relationship-type (e.g. father)', async () => {
      graphRepo.resolveEntity.mockResolvedValueOnce({
        id: 'mili-entity-id',
        name: 'Mili Sikder',
      } as any);

      graphRepo.findRelationshipsByEntityId.mockResolvedValueOnce([
        {
          id: 'rel-1',
          userId: 'test-user',
          fromEntity: 'mili-entity-id',
          toEntity: 'bimal-entity-id',
          relation: 'FATHER',
          confidence: 100,
        } as any,
        {
          id: 'rel-2',
          userId: 'test-user',
          fromEntity: 'mili-entity-id',
          toEntity: 'anjali-entity-id',
          relation: 'MOTHER',
          confidence: 100,
        } as any,
      ]);

      graphRepo.findEntityById.mockImplementation(async (userId, id) => {
         if (id === 'mili-entity-id') return { name: 'Mili Sikder' } as any;
         if (id === 'bimal-entity-id') return { name: 'Bimal Mondal' } as any;
         if (id === 'anjali-entity-id') return { name: 'Anjali Mondal' } as any;
         return null;
      });

      const results = await service.retrieve({
        userId: 'test-user',
        query: 'Who is Mili\'s father?',
        limit: 10,
      });

      expect(results).toHaveLength(1);
      expect(results[0].relationships).toHaveLength(1);
      expect(results[0].relationships[0]).toMatchObject({
        from: 'Mili Sikder',
        relation: 'FATHER',
        to: 'Bimal Mondal',
      });
      expect(results[0].relationships.find(r => r.to === 'Anjali Mondal')).toBeUndefined();
    });

    it('should handle alias resolution and find the canonical entity', async () => {
      // Setup the mock to simulate alias behavior from the repository
      // If we ask for 'Mili Mondal', it resolves to the canonical 'Mili Sikder'
      graphRepo.resolveEntity.mockImplementation(async (userId, name) => {
        if (name === 'Mili Mondal') {
          return { id: 'mili-canonical-id', name: 'Mili Sikder' } as any;
        }
        return null;
      });

      graphRepo.findRelationshipsByEntityId.mockResolvedValueOnce([
        {
          id: 'rel-alias',
          userId: 'test-user',
          fromEntity: 'mili-canonical-id',
          toEntity: 'bimal-entity-id',
          relation: 'FATHER',
          confidence: 100,
        } as any,
      ]);

      graphRepo.findEntityById.mockImplementation(async (userId, id) => {
         if (id === 'mili-canonical-id') return { name: 'Mili Sikder' } as any;
         if (id === 'bimal-entity-id') return { name: 'Bimal Mondal' } as any;
         return null;
      });

      const results = await service.retrieve({
        userId: 'test-user',
        query: 'Who is Mili Mondal\'s father?',
        limit: 10,
      });

      expect(graphRepo.resolveEntity).toHaveBeenCalledWith('test-user', 'Mili Mondal');
      expect(results).toHaveLength(1);
      expect(results[0].relationships).toHaveLength(1);
      expect(results[0].relationships[0]).toMatchObject({
        from: 'Mili Sikder', // The canonical name returned from graph retrieval
        relation: 'FATHER',
        to: 'Bimal Mondal',
      });
    });
  });
});
