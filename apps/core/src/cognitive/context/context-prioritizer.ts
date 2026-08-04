import { ContextPrioritizer, ContextPrioritizationCriteria, PrioritizedContext } from '../contracts/context-prioritizer';
import { CoreTokenBudgetAllocator } from './token-budget-allocator';

export interface ContextItem {
  id: string;
  content: string;
  timestamp: Date;
  saliencyScore?: number;
}

export interface ContextInput {
  taskIntent: string;
  taskContextItems: ContextItem[];
  realityStateItems: ContextItem[];
  episodicMemoryItems: ContextItem[];
  personalIntelligenceItems: ContextItem[];
}

export interface FittedPrioritizedContext extends PrioritizedContext {
  fittedTaskContext: ContextItem[];
  fittedRealityState: ContextItem[];
  fittedEpisodicMemory: ContextItem[];
  fittedPersonalIntelligence: ContextItem[];
}

export class CoreContextPrioritizer implements ContextPrioritizer {
  constructor(private readonly budgetAllocator: CoreTokenBudgetAllocator) {}

  // Method required by Phase 11.0 base contract
  public async prioritize(criteria: ContextPrioritizationCriteria): Promise<PrioritizedContext> {
    return {
      memoryWeight: 0.20,
      knowledgeWeight: 0.40,
      worldWeight: 0.25,
      personalWeight: 0.15
    };
  }

  // Requested Phase 11.3 prompt-gateway logic
  public prioritizeAndFit(input: ContextInput, totalTokenBudget: number): FittedPrioritizedContext {
    const budgets = this.budgetAllocator.allocateBudget(totalTokenBudget);

    const taskBudget = budgets.get('TASK_CONTEXT') ?? 0;
    const realityBudget = budgets.get('REALITY_STATE') ?? 0;
    const memoryBudget = budgets.get('EPISODIC_MEMORY') ?? 0;
    const personalBudget = budgets.get('PERSONAL_INTELLIGENCE') ?? 0;

    const rankAndFit = (items: ContextItem[], budget: number, intent: string): ContextItem[] => {
      const now = new Date().getTime();
      
      const scoredItems = items.map(item => {
        let score = item.saliencyScore ?? 0.5;
        
        // 1. Keyword match heuristic against TaskIntent
        const intentKeywords = intent.toLowerCase().split(/\s+/);
        const itemContent = item.content.toLowerCase();
        for (const kw of intentKeywords) {
          if (kw.length > 3 && itemContent.includes(kw)) {
            score += 0.2;
          }
        }

        // 2. Timestamp freshness heuristic
        const ageMs = now - item.timestamp.getTime();
        const ageHours = Math.max(0, ageMs / (1000 * 60 * 60));
        const freshnessDecay = Math.min(0.3, ageHours * 0.01);
        score -= freshnessDecay;

        return { item, score };
      });

      // Sort descending by calculated importance score
      scoredItems.sort((a, b) => b.score - a.score);

      const fitted: ContextItem[] = [];
      let currentTokens = 0;

      for (const { item } of scoredItems) {
        // Deterministic character-ratio token estimator (4 chars = 1 token)
        const itemTokens = Math.ceil(item.content.length / 4);
        if (currentTokens + itemTokens <= budget) {
          fitted.push(item);
          currentTokens += itemTokens;
        }
      }

      return fitted;
    };

    const fittedTaskContext = rankAndFit(input.taskContextItems, taskBudget, input.taskIntent);
    const fittedRealityState = rankAndFit(input.realityStateItems, realityBudget, input.taskIntent);
    const fittedEpisodicMemory = rankAndFit(input.episodicMemoryItems, memoryBudget, input.taskIntent);
    const fittedPersonalIntelligence = rankAndFit(input.personalIntelligenceItems, personalBudget, input.taskIntent);

    return {
      memoryWeight: 0.20,
      knowledgeWeight: 0.40,
      worldWeight: 0.25,
      personalWeight: 0.15,
      fittedTaskContext,
      fittedRealityState,
      fittedEpisodicMemory,
      fittedPersonalIntelligence
    };
  }
}
