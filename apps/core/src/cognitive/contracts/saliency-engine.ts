import { RealityState } from '../models/reality-state';
import { SaliencyScore } from '../models/saliency-score';

export interface SaliencyEngine {
  evaluate(state: RealityState): SaliencyScore;
}
