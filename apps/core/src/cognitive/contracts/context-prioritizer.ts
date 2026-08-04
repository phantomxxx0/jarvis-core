export interface ContextPrioritizationCriteria {
  activeGoals: string[];
  recentSaliencyThreshold: number;
}

export interface PrioritizedContext {
  memoryWeight: number;
  knowledgeWeight: number;
  worldWeight: number;
  personalWeight: number;
}

export interface ContextPrioritizer {
  prioritize(criteria: ContextPrioritizationCriteria): Promise<PrioritizedContext>;
}

export interface TokenAllocation {
  memoryTokens: number;
  knowledgeTokens: number;
  worldTokens: number;
  personalTokens: number;
}

export interface TokenBudgetAllocator {
  allocate(totalBudget: number, prioritizedContext: PrioritizedContext): TokenAllocation;
}
