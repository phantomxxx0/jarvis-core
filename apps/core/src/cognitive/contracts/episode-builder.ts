import { Episode } from '../models/episode';
import { RealityState } from '../models/reality-state';
import { SaliencyScore } from '../models/saliency-score';

export interface EpisodeBuilder {
  ingestState(state: RealityState, saliency: SaliencyScore): void;
  finalizeEpisode(episodeId: string): Episode | undefined;
}
