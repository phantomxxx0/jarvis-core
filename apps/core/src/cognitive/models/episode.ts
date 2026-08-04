import { SaliencyScore } from './saliency-score';
import { RealityState } from './reality-state';

export interface Episode {
  id: string;
  summary: string;
  startTime: Date;
  endTime: Date;
  saliencyScore: SaliencyScore;
  tags: string[];
  supportingStates: RealityState[];
}
