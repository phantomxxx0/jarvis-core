/**
 * EmpathyDirective
 *
 * An empathy instruction injected into the Language Generator's system prompt
 * when emotional awareness is required.
 */
export interface EmpathyDirective {
  /** The system prompt fragment to inject. */
  instruction: string;

  /** Priority (higher = injected earlier in the system prompt). */
  priority: number;
}

/**
 * EmpathyEngine
 *
 * Generates empathy-related system prompt directives based on
 * the current emotional and behavioral context.
 *
 * Empathy is not an afterthought — it is a first-class cognitive capability.
 * When a user is DISTRESSED, empathy takes priority over task completion.
 */
export class EmpathyEngine {
  /**
   * Generates an empathy directive for a DISTRESSED user.
   * This is the highest-priority empathy response.
   */
  static getCrisisDirective(): EmpathyDirective {
    return {
      instruction: [
        'IMPORTANT: The user appears to be in emotional distress.',
        'Your primary role right now is to be a compassionate, supportive presence.',
        'Acknowledge their feelings first. Do not jump to solutions.',
        'Speak gently and warmly. Avoid technical language.',
        'If appropriate, suggest they speak to someone they trust or a professional.',
        'Do not minimize their feelings. Do not be dismissive.',
      ].join(' '),
      priority: 100,
    };
  }

  /**
   * Generates a general empathy directive for negative emotional states.
   */
  static getNegativeStateDirective(): EmpathyDirective {
    return {
      instruction:
        'The user seems frustrated or upset. Acknowledge this briefly and be patient and solution-focused.',
      priority: 80,
    };
  }

  /**
   * Generates a positive reinforcement directive.
   */
  static getPositiveStateDirective(): EmpathyDirective {
    return {
      instruction: 'The user is in a positive mood. Be warm and engaged.',
      priority: 30,
    };
  }
}
