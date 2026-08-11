import { Injectable, Logger } from '@nestjs/common';
import type { EmotionalValence } from '../contracts/attention-result';
import { EmotionalStateFactory, type EmotionalState } from './emotional-state';
import {
  EmotionalResponseAdapter,
  type EmotionalResponseProfile,
} from './emotional-response';

/**
 * EmotionService
 *
 * Tracks and manages emotional state for active sessions.
 * Provides the Language Generator with emotional context
 * for appropriate response tone selection.
 *
 * Phase 1: Rule-based valence tracking.
 * Phase 2: Persistent emotional state storage across sessions.
 */
@Injectable()
export class EmotionService {
  readonly moduleName = 'Emotion';
  private readonly logger = new Logger(EmotionService.name);

  /** In-memory emotional state per session. */
  private readonly sessionStates = new Map<string, EmotionalState>();

  /** @implements ICognitiveModule */
  isReady(): boolean {
    return true;
  }

  /**
   * Updates the emotional state for a session with a new valence observation.
   *
   * @param sessionId - The session to update.
   * @param valence   - The newly detected emotional valence.
   * @returns The updated EmotionalState.
   */
  update(sessionId: string, valence: EmotionalValence): EmotionalState {
    const existing =
      this.sessionStates.get(sessionId) ??
      EmotionalStateFactory.createNeutral();

    const updated = EmotionalStateFactory.update(existing, valence);
    this.sessionStates.set(sessionId, updated);

    if (updated.isEscalating) {
      this.logger.warn(
        `[Emotion] Escalation detected for session=${sessionId}. Valence=${valence}`,
      );
    }

    return updated;
  }

  /**
   * Returns the current emotional state for a session.
   *
   * @param sessionId - The session to query.
   * @returns The current EmotionalState (neutral if no state exists).
   */
  getState(sessionId: string): EmotionalState {
    return (
      this.sessionStates.get(sessionId) ?? EmotionalStateFactory.createNeutral()
    );
  }

  /**
   * Returns the response profile for the current emotional state.
   *
   * @param sessionId - The session to query.
   * @returns The EmotionalResponseProfile for the Language Generator.
   */
  getResponseProfile(sessionId: string): EmotionalResponseProfile {
    const state = this.getState(sessionId);
    return EmotionalResponseAdapter.getProfile(state.current);
  }

  /**
   * Clears the emotional state for a session (called when session ends).
   *
   * @param sessionId - The session to clear.
   */
  clearSession(sessionId: string): void {
    this.sessionStates.delete(sessionId);
  }
}
