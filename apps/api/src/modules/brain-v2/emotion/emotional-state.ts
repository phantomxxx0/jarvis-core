import type { EmotionalValence } from '../contracts/attention-result';

/**
 * EmotionalState
 *
 * Represents the tracked emotional state of a user across a session.
 * Maintains a short-term history to detect emotional trends.
 */
export interface EmotionalState {
  /** Current detected valence. */
  current: EmotionalValence;

  /** History of the last N valence detections. */
  history: EmotionalValence[];

  /** Whether an escalation (toward DISTRESSED) trend is detected. */
  isEscalating: boolean;

  /** Timestamp of the most recent emotional state update. */
  updatedAt: Date;
}

/**
 * EmotionalStateFactory
 *
 * Creates and manages EmotionalState instances.
 */
export class EmotionalStateFactory {
  /** Creates a neutral default EmotionalState. */
  static createNeutral(): EmotionalState {
    return {
      current: 'NEUTRAL',
      history: [],
      isEscalating: false,
      updatedAt: new Date(),
    };
  }

  /**
   * Updates an EmotionalState with a new valence observation.
   *
   * @param state   - The existing EmotionalState.
   * @param valence - The newly detected valence.
   * @returns Updated EmotionalState.
   */
  static update(
    state: EmotionalState,
    valence: EmotionalValence,
  ): EmotionalState {
    const history = [...state.history, valence].slice(-5);

    // Detect escalation: 2+ consecutive negative/distressed signals.
    const escalationSignals: EmotionalValence[] = [
      'NEGATIVE',
      'DISTRESSED',
      'FRUSTRATED',
    ];
    const recentNegative = history.filter((v) =>
      escalationSignals.includes(v),
    ).length;
    const isEscalating = recentNegative >= 2;

    return {
      current: valence,
      history,
      isEscalating,
      updatedAt: new Date(),
    };
  }
}
