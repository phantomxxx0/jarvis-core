import { RealityGraph } from '../contracts/reality-graph';
import { RealityState } from '../models/reality-state';

export class InMemoryRealityGraph implements RealityGraph {
  private states = new Map<string, RealityState>();

  public addOrUpdateState(state: RealityState): void {
    this.states.set(state.subject, state);
  }

  public getState(subject: string): RealityState | undefined {
    return this.states.get(subject);
  }

  public removeState(subject: string): void {
    this.states.delete(subject);
  }

  public queryStates(criteria: Partial<RealityState>): RealityState[] {
    const results: RealityState[] = [];
    for (const state of this.states.values()) {
      let matches = true;
      for (const key of Object.keys(criteria) as Array<keyof RealityState>) {
        if (state[key] !== criteria[key]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        results.push(state);
      }
    }
    return results;
  }

  public applyDecay(decayRate: number): void {
    const now = new Date().getTime();
    for (const [subject, state] of this.states.entries()) {
      const elapsedMs = now - state.timeSemantics.occurredAt.getTime();
      const elapsedSeconds = elapsedMs / 1000;
      
      // Decay confidence based on time elapsed
      state.confidence -= decayRate * elapsedSeconds;

      // Threshold check to remove stale/low-confidence state
      if (state.confidence < 0.2) {
        this.states.delete(subject);
      }
    }
  }
}
