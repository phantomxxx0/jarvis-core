import { RealityGraph } from './reality-graph';

export interface RawObservation<T = unknown> {
  id: string;
  sourceId: string;
  timestamp: Date;
  confidence: number;
  payload: T;
}

export interface FusionEngine {
  processObservation(observation: RawObservation<any>): void;
  getRealityGraph(): RealityGraph;
}
