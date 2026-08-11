/**
 * HumorProfile
 *
 * Defines when and how Jarvis should use humor.
 * Humor is a cognitive capability — used judiciously to build rapport.
 * It is NEVER used when the user is in distress.
 */
export interface HumorProfile {
  /** Whether humor is appropriate in the current context. */
  appropriate: boolean;

  /** Type of humor to use if appropriate. */
  style: 'dry' | 'observational' | 'self-deprecating' | 'none';

  /** System prompt directive for humor, if appropriate. */
  directive: string;
}

/**
 * HumorEngine
 *
 * Determines whether and how to inject humor into Jarvis's responses.
 *
 * Jarvis's humor style is dry and observational — like a witty engineer.
 * Never slapstick. Never forced. Never at the user's expense.
 */
export class HumorEngine {
  /**
   * Returns a HumorProfile for the current context.
   *
   * @param isDistressed - True if the user is in emotional distress.
   * @param isGreeting   - True if this is a greeting interaction.
   * @returns A HumorProfile for the Language Generator.
   */
  static getProfile(isDistressed: boolean, isGreeting: boolean): HumorProfile {
    // Never use humor when the user is distressed.
    if (isDistressed) {
      return { appropriate: false, style: 'none', directive: '' };
    }

    // Light wit is appropriate for greetings.
    if (isGreeting) {
      return {
        appropriate: true,
        style: 'dry',
        directive:
          'A touch of dry wit in greetings is appropriate — keep it brief.',
      };
    }

    // Default: subtle and natural.
    return {
      appropriate: false,
      style: 'none',
      directive: '',
    };
  }
}
