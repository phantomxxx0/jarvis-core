/**
 * ReasoningPolicy
 *
 * Defines when the Executive should activate the Reasoner.
 * Kept as a simple rule set to allow easy tuning without code changes.
 */

import type { AttentionResult } from '../contracts/attention-result';

/**
 * Determines whether the Reasoner should be activated based on
 * the AttentionResult.
 *
 * @param attention - The AttentionResult from the Attention System.
 * @returns true if reasoning should be activated.
 */
export function shouldActivateReasoner(attention: AttentionResult): boolean {
  const { intent, importance } = attention;

  // Always reason for technical, research, and command intents.
  if (intent === 'TECHNICAL' || intent === 'RESEARCH' || intent === 'COMMAND') {
    return true;
  }

  // Reason for high-importance questions.
  if (intent === 'QUESTION' && importance >= 70) {
    return true;
  }

  return false;
}

/**
 * LogicalEngine
 *
 * A lightweight rule-based pre-check that runs BEFORE invoking the
 * full LLM-based ReasoningGateway. Used to short-circuit reasoning
 * for simple cases that don't need LLM analysis.
 *
 * Returns null if full reasoning is needed, or a simplified ReasoningResultV2
 * summary if the case is trivial.
 */
export class LogicalEngine {
  /**
   * Attempts to produce a simple reasoning outcome without the LLM.
   *
   * @param goal - The user's goal.
   * @returns 'SIMPLE' if the goal is trivial, 'NEEDS_REASONING' otherwise.
   */
  static precheck(goal: string): 'SIMPLE' | 'NEEDS_REASONING' {
    const normalized = goal.toLowerCase().trim();

    // Very short inputs are unlikely to need deep reasoning.
    if (normalized.split(/\s+/).length < 5) {
      return 'SIMPLE';
    }

    // Questions with obvious direct answers.
    const simpleQuestionPatterns = [
      /^(what\s+(time|day|date)\s+is\s+it)/,
      /^(who\s+are\s+you|what\s+are\s+you)/,
    ];

    if (simpleQuestionPatterns.some((p) => p.test(normalized))) {
      return 'SIMPLE';
    }

    return 'NEEDS_REASONING';
  }
}
