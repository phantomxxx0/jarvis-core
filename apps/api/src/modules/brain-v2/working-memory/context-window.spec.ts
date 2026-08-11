import { Test, TestingModule } from '@nestjs/testing';
import { ContextWindowManager } from './context-window';
import type { WorkingMemoryState } from '../contracts/working-memory';

describe('ContextWindowManager', () => {
  let manager: ContextWindowManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContextWindowManager],
    }).compile();

    manager = module.get(ContextWindowManager);
  });

  describe('fitMemoryContext', () => {
    it('truncates memory text that exceeds the 3,000 token budget', () => {
      const hugeMemory = 'favourite colour is purple. '.repeat(1000);

      const result = manager.fitMemoryContext(hugeMemory);

      expect(result.length).toBeLessThan(hugeMemory.length);
    });

    it('leaves small memory text unchanged', () => {
      const smallMemory = 'User favourite colour is purple.';

      const result = manager.fitMemoryContext(smallMemory);

      expect(result).toBe(smallMemory);
    });

    it('handles empty string without throwing', () => {
      expect(() => manager.fitMemoryContext('')).not.toThrow();
      expect(manager.fitMemoryContext('')).toBe('');
    });
  });

  describe('getMemoryBudget', () => {
    it('returns the full memory budget when history is empty', () => {
      const state: Partial<WorkingMemoryState> = {
        conversationHistory: [],
      };

      const budget = manager.getMemoryBudget(state as WorkingMemoryState);

      expect(budget).toBe(3000);
    });

    it('never returns a negative budget even when history is huge', () => {
      const state: Partial<WorkingMemoryState> = {
        conversationHistory: Array(500).fill({
          role: 'user',
          content: 'a very long message '.repeat(50),
        }),
      };

      const budget = manager.getMemoryBudget(state as WorkingMemoryState);

      expect(budget).toBeGreaterThanOrEqual(0);
    });
  });

  describe('isWithinBudget', () => {
    it('returns true for small combined parts', () => {
      expect(manager.isWithinBudget(['hello', 'world'])).toBe(true);
    });

    it('returns false when combined parts exceed the total 16,000 token budget', () => {
      const huge = 'token '.repeat(20_000);
      expect(manager.isWithinBudget([huge])).toBe(false);
    });
  });
});
