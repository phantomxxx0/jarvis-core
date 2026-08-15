import type { AttentionResult } from '../contracts/attention-result';

/**
 * RetrievalPolicyDecision
 *
 * The output of the retrieval policy — determines which memory
 * subsystems to query and what limit to apply.
 */
export interface RetrievalPolicyDecision {
  /** Whether to query episodic memory (past events, interactions). */
  queryEpisodic: boolean;

  /** Whether to query semantic memory (facts, knowledge). */
  querySemantic: boolean;

  /** Whether to query preference memory (user preferences, settings). */
  queryPreferences: boolean;

  /** Whether to query procedural memory (how-to knowledge). */
  queryProcedural: boolean;

  /** Whether to query project memory (active projects). */
  queryProjects: boolean;

  /** Whether to query device/environment memory. */
  queryDevices: boolean;

  /** Whether to query the knowledge graph. */
  queryGraph: boolean;

  /** Whether to query user goals and plans. */
  queryGoals: boolean;

  /** Maximum results to return. */
  limit: number;
}

/**
 * RetrievalPolicy
 *
 * Determines which memory subsystems to query based on
 * the AttentionResult signals.
 *
 * Avoids querying all subsystems for every request —
 * an intentional performance optimization.
 */
export class RetrievalPolicy {
  /**
   * Returns a RetrievalPolicyDecision based on AttentionResult signals.
   *
   * @param attention - The AttentionResult from the Attention System.
   * @returns Which memory subsystems to query and at what limit.
   */
  static decide(attention: AttentionResult): RetrievalPolicyDecision {
    const { intent, importance, topicTags } = attention;
    const intentStr = intent as string;
    const isTechnical = intentStr === 'TECHNICAL' || intentStr === 'COMMAND';
    const isResearch = intentStr === 'RESEARCH';
    const isPersonal = intentStr === 'QUESTION' || intentStr === 'EMOTIONAL';
    const isHigh = importance >= 60;

    return {
      queryEpisodic: isPersonal || isResearch,
      querySemantic: isResearch || isTechnical || isHigh,
      queryPreferences: true, // Always check preferences — personalizes every response.
      queryProcedural: isTechnical || intent === 'COMMAND',
      queryProjects:
        isTechnical ||
        isResearch ||
        topicTags.some((t) =>
          ['project', 'repo', 'codebase', 'feature', 'task'].includes(t),
        ),
      queryGoals:
        isResearch ||
        topicTags.some((t) =>
          ['goal', 'plan', 'objective', 'milestone', 'strategy'].includes(t),
        ),
      queryDevices: intent === 'COMMAND' || intent === 'SYSTEM',
      queryGraph: isResearch || isHigh,
      limit: isResearch ? 30 : isTechnical ? 20 : 15,
    };
  }
}
