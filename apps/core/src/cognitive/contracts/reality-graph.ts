import { RealityState } from '../models/reality-state';

export interface RealityGraph {
  addOrUpdateState(state: RealityState): void;
  getState(subject: string): RealityState | undefined;
  removeState(subject: string): void;
  applyDecay(decayRate: number): void;
  queryStates(criteria: Partial<RealityState>): RealityState[];
}
