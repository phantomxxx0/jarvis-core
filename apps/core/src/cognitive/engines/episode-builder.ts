import { EpisodeBuilder } from '../contracts/episode-builder';
import { Episode } from '../models/episode';
import { RealityState } from '../models/reality-state';
import { SaliencyScore } from '../models/saliency-score';

export class CoreEpisodeBuilder implements EpisodeBuilder {
  // Internal buffer of active narrative contexts
  private activeEpisodes = new Map<string, Episode>();

  public ingestState(state: RealityState, saliency: SaliencyScore): void {
    // If the saliency score is below our noise threshold, drop it entirely.
    if (saliency.finalScore < 0.5) {
      return;
    }

    // In this heuristic phase, we group episodes by the state's subject.
    const episodeId = `episode-subject-${state.subject}`;
    let episode = this.activeEpisodes.get(episodeId);

    if (!episode) {
      episode = {
        id: episodeId,
        summary: '', // Will be generated upon finalization
        startTime: state.timeSemantics.occurredAt,
        endTime: state.timeSemantics.occurredAt,
        saliencyScore: { ...saliency }, // Copy initial score
        tags: [state.subject],
        supportingStates: []
      };
      this.activeEpisodes.set(episodeId, episode);
    }

    // Append reality state to the narrative
    episode.supportingStates.push(state);
    
    // Update episode saliency (maintain the highest salient event score in this episode)
    if (saliency.finalScore > episode.saliencyScore.finalScore) {
      episode.saliencyScore = { ...saliency };
    }

    // Update episode endTime as new events arrive
    if (state.timeSemantics.occurredAt > episode.endTime) {
      episode.endTime = state.timeSemantics.occurredAt;
    }
  }

  public finalizeEpisode(episodeId: string): Episode | undefined {
    const episode = this.activeEpisodes.get(episodeId);
    
    if (!episode) {
      return undefined;
    }

    // Basic programmatic summary generation (no LLM logic yet)
    const subjects = new Set<string>();
    const predicates = new Set<string>();

    for (const state of episode.supportingStates) {
      subjects.add(state.subject);
      predicates.add(state.predicate);
    }

    const subjectsStr = Array.from(subjects).join(', ');
    const predicatesStr = Array.from(predicates).join(', ');
    
    episode.summary = `Episode regarding ${subjectsStr} involved events: ${predicatesStr}`;

    // Free from active buffer memory
    this.activeEpisodes.delete(episodeId);

    return episode;
  }
}
