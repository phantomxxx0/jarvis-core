import { SaliencyEngine } from '../contracts/saliency-engine';
import { RealityState } from '../models/reality-state';
import { SaliencyScore } from '../models/saliency-score';

export class CoreSaliencyEngine implements SaliencyEngine {
  public evaluate(state: RealityState): SaliencyScore {
    let novelty = 0.5;
    let importance = 0.5;
    let emotion = 0.1;
    let taskRelevance = 0.5;
    let danger = 0.1;
    let frequency = 0.5;

    // High confidence boosts importance
    if (state.confidence > 0.8) {
      importance += 0.2;
    }

    const predicate = state.predicate.toUpperCase();

    // Specific predicates heuristic rules
    if (predicate === 'USER_SPEAKING' || predicate === 'ALARM_TRIGGERED' || predicate === 'ERROR_OCCURRED') {
      importance = 0.9;
      danger = predicate === 'ALARM_TRIGGERED' || predicate === 'ERROR_OCCURRED' ? 0.9 : 0.2;
      novelty = 0.8;
      frequency = 0.2;
    } else if (predicate === 'ROOM_ILLUMINATED' || predicate === 'BACKGROUND_NOISE' || predicate === 'IDLE') {
      importance = 0.2;
      novelty = 0.1;
      frequency = 0.9;
    }

    // Clamp values between 0.0 and 1.0
    const clamp = (val: number) => Math.max(0.0, Math.min(1.0, val));
    
    novelty = clamp(novelty);
    importance = clamp(importance);
    emotion = clamp(emotion);
    taskRelevance = clamp(taskRelevance);
    danger = clamp(danger);
    frequency = clamp(frequency);

    // Final score calculation (heuristic weighting)
    // Formula: emphasize danger and importance, discount high frequency
    const finalScore = clamp(
      (danger * 0.4) + 
      (importance * 0.3) + 
      (novelty * 0.2) + 
      (taskRelevance * 0.1) - 
      (frequency * 0.1)
    );

    return {
      novelty,
      importance,
      emotion,
      taskRelevance,
      danger,
      frequency,
      finalScore
    };
  }
}
