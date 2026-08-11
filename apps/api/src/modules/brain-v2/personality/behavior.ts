import type { EmotionalValence } from '../contracts/attention-result';
import type { IntentClass } from '../contracts/attention-result';

/**
 * BehaviorModifier
 *
 * Adjusts Jarvis's behavioral style based on the current cognitive context.
 * Provides context-sensitive behavioral guidelines to the Language Generator.
 */
export interface BehaviorModifier {
  /** Whether to use formal language in this response. */
  useFormalLanguage: boolean;

  /** Whether brief, direct responses are preferred. */
  preferBrief: boolean;

  /** Whether to include code examples proactively. */
  includeCodeExamples: boolean;

  /** Whether to proactively suggest next steps. */
  suggestNextSteps: boolean;

  /** Override response format hint for the Language Generator. */
  formatHint?: 'markdown' | 'plain' | 'code' | 'numbered-list';
}

/**
 * BehaviorEngine
 *
 * Determines behavioral modifiers from the current cognitive signals.
 * Used by the Language Generator's PromptBuilder.
 */
export class BehaviorEngine {
  /**
   * Returns a BehaviorModifier for the given context.
   *
   * @param intent  - The detected intent class.
   * @param emotion - The detected emotional valence.
   * @returns Behavioral modifiers for the Language Generator.
   */
  static getModifier(
    intent: IntentClass,
    emotion: EmotionalValence,
  ): BehaviorModifier {
    // Emotional distress: always brief and supportive.
    if (emotion === 'DISTRESSED') {
      return {
        useFormalLanguage: false,
        preferBrief: true,
        includeCodeExamples: false,
        suggestNextSteps: false,
        formatHint: 'plain',
      };
    }

    switch (intent) {
      case 'TECHNICAL':
        return {
          useFormalLanguage: false,
          preferBrief: false,
          includeCodeExamples: true,
          suggestNextSteps: true,
          formatHint: 'markdown',
        };

      case 'RESEARCH':
        return {
          useFormalLanguage: false,
          preferBrief: false,
          includeCodeExamples: false,
          suggestNextSteps: true,
          formatHint: 'markdown',
        };

      case 'COMMAND':
        return {
          useFormalLanguage: false,
          preferBrief: true,
          includeCodeExamples: true,
          suggestNextSteps: true,
          formatHint: 'markdown',
        };

      case 'GREETING':
      case 'FAREWELL':
        return {
          useFormalLanguage: false,
          preferBrief: true,
          includeCodeExamples: false,
          suggestNextSteps: false,
          formatHint: 'plain',
        };

      default:
        return {
          useFormalLanguage: false,
          preferBrief: false,
          includeCodeExamples: false,
          suggestNextSteps: false,
        };
    }
  }
}
