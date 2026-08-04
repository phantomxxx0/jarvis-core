import { TokenBudgetAllocator, TokenAllocation, PrioritizedContext } from '../contracts/context-prioritizer';

export class CoreTokenBudgetAllocator implements TokenBudgetAllocator {
  // Method required by Phase 11.0 base contract
  public allocate(totalBudget: number, prioritizedContext: PrioritizedContext): TokenAllocation {
    return {
      memoryTokens: Math.floor(totalBudget * prioritizedContext.memoryWeight),
      knowledgeTokens: Math.floor(totalBudget * prioritizedContext.knowledgeWeight),
      worldTokens: Math.floor(totalBudget * prioritizedContext.worldWeight),
      personalTokens: Math.floor(totalBudget * prioritizedContext.personalWeight),
    };
  }

  // Requested Phase 11.3 budget logic
  public allocateBudget(totalBudgetTokens: number, categoryRatios?: Map<string, number>): Map<string, number> {
    const ratios = categoryRatios ?? new Map<string, number>([
      ['TASK_CONTEXT', 0.40],
      ['REALITY_STATE', 0.25],
      ['EPISODIC_MEMORY', 0.20],
      ['PERSONAL_INTELLIGENCE', 0.15]
    ]);

    const allocations = new Map<string, number>();
    for (const [category, ratio] of ratios.entries()) {
      allocations.set(category, Math.floor(totalBudgetTokens * ratio));
    }

    return allocations;
  }
}
