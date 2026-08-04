import { FusionEngine, RawObservation } from './contracts/fusion-engine';
import { SaliencyEngine } from './contracts/saliency-engine';
import { EpisodeBuilder } from './contracts/episode-builder';
import { Episode } from './models/episode';
import { ObservationPayload } from './engines/fusion-engine';

export class CognitiveOrchestrator {
  private decayIntervalId?: ReturnType<typeof setInterval>;
  private finalizeIntervalId?: ReturnType<typeof setInterval>;
  
  // Simulated long-term memory for Phase 11
  private longTermMemory: Episode[] = [];
  
  // Track active subjects to manage episode finalization
  private activeSubjects = new Set<string>();

  constructor(
    private readonly fusionEngine: FusionEngine,
    private readonly saliencyEngine: SaliencyEngine,
    private readonly episodeBuilder: EpisodeBuilder
  ) {}

  public initialize(): void {
    console.log('CognitiveOrchestrator initialized. Listening for observations...');
    
    // Run reality graph decay tick every 5 seconds
    this.decayIntervalId = setInterval(() => this.runDecayTick(), 5000);
    
    // Periodically trigger episode finalization (simulating memory batching every 60s)
    this.finalizeIntervalId = setInterval(() => this.runFinalizationTick(), 60000);
  }

  public onNewObservation(rawObs: RawObservation<ObservationPayload>): void {
    // 1. Map raw observation into the RealityGraph via FusionEngine
    this.fusionEngine.processObservation(rawObs);

    // Because processObservation mutates the graph synchronously, we can fetch the updated RealityState directly
    const subject = rawObs.payload.subject;
    const realityGraph = this.fusionEngine.getRealityGraph();
    const updatedState = realityGraph.getState(subject);

    if (!updatedState) {
      return; // Could happen if confidence is extremely low and is immediately purged
    }

    this.activeSubjects.add(subject);

    // 2. Evaluate biological/heuristic saliency for the updated state
    const saliencyScore = this.saliencyEngine.evaluate(updatedState);

    // 3. Ingest the state into the narrative Episode Builder buffer
    this.episodeBuilder.ingestState(updatedState, saliencyScore);
  }

  public runDecayTick(): void {
    const realityGraph = this.fusionEngine.getRealityGraph();
    // Decay confidence over time. E.g. rate 0.01
    realityGraph.applyDecay(0.01); 
  }
  
  private runFinalizationTick(): void {
    for (const subject of this.activeSubjects) {
      // Reconstruct the heuristic episodeId grouping format used in CoreEpisodeBuilder
      const episodeId = `episode-subject-${subject}`;
      const finalizedEpisode = this.episodeBuilder.finalizeEpisode(episodeId);
      
      if (finalizedEpisode) {
        this.saveToLongTermMemory(finalizedEpisode);
      }
    }
    
    this.activeSubjects.clear();
  }
  
  private saveToLongTermMemory(episode: Episode): void {
    this.longTermMemory.push(episode);
    console.log(`[CognitiveOrchestrator] Saved Episode to Long Term Memory: ${episode.id}`);
    console.log(`[CognitiveOrchestrator] Summary: ${episode.summary}`);
  }
  
  public shutdown(): void {
    if (this.decayIntervalId) {
      clearInterval(this.decayIntervalId);
    }
    if (this.finalizeIntervalId) {
      clearInterval(this.finalizeIntervalId);
    }
  }
}
