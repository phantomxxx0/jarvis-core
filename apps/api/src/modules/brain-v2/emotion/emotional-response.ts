import type { EmotionalValence } from '../contracts/attention-result';

/**
 * EmotionalResponseProfile
 *
 * Defines how the Language Generator should adjust its response
 * given the current emotional context.
 */
export interface EmotionalResponseProfile {
  /** Suggested tone for the Language Generator. */
  tone:
    'empathetic' | 'supportive' | 'calm' | 'professional' | 'warm' | 'neutral';

  /** Whether to explicitly acknowledge the user's emotional state. */
  acknowledgeEmotion: boolean;

  /** Whether to offer additional support or resources. */
  offerSupport: boolean;

  /** Whether to keep the response brief (avoid long technical answers). */
  keepBrief: boolean;

  /** A system prompt instruction fragment for the Language Generator. */
  promptDirective: string;
}

/** Maps emotional valence to response profile. */
const EMOTIONAL_RESPONSE_MAP: Record<
  EmotionalValence,
  EmotionalResponseProfile
> = {
  DISTRESSED: {
    tone: 'empathetic',
    acknowledgeEmotion: true,
    offerSupport: true,
    keepBrief: true,
    promptDirective:
      'The user appears distressed. Be warm, empathetic, and supportive. Prioritize their emotional wellbeing over task completion.',
  },
  NEGATIVE: {
    tone: 'calm',
    acknowledgeEmotion: true,
    offerSupport: false,
    keepBrief: false,
    promptDirective:
      'The user seems frustrated or upset. Be patient, calm, and understanding.',
  },
  FRUSTRATED: {
    tone: 'calm',
    acknowledgeEmotion: true,
    offerSupport: false,
    keepBrief: false,
    promptDirective:
      'The user seems frustrated. Acknowledge this and be solution-focused.',
  },
  EXCITED: {
    tone: 'warm',
    acknowledgeEmotion: false,
    offerSupport: false,
    keepBrief: false,
    promptDirective:
      'The user is excited or enthusiastic. Match their energy appropriately.',
  },
  POSITIVE: {
    tone: 'warm',
    acknowledgeEmotion: false,
    offerSupport: false,
    keepBrief: false,
    promptDirective: 'The user is in a positive mood. Be warm and engaging.',
  },
  NEUTRAL: {
    tone: 'professional',
    acknowledgeEmotion: false,
    offerSupport: false,
    keepBrief: false,
    promptDirective: '',
  },
  UNKNOWN: {
    tone: 'neutral',
    acknowledgeEmotion: false,
    offerSupport: false,
    keepBrief: false,
    promptDirective: '',
  },
};

/**
 * EmotionalResponseAdapter
 *
 * Maps an EmotionalValence to an EmotionalResponseProfile.
 * Used by the Language Generator's PromptBuilder to adjust tone.
 */
export class EmotionalResponseAdapter {
  /**
   * Returns the response profile for a given emotional valence.
   *
   * @param valence - The detected EmotionalValence.
   * @returns The matching EmotionalResponseProfile.
   */
  static getProfile(valence: EmotionalValence): EmotionalResponseProfile {
    return EMOTIONAL_RESPONSE_MAP[valence] ?? EMOTIONAL_RESPONSE_MAP['NEUTRAL'];
  }
}
