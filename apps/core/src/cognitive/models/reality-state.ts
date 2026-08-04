import { TimeSemantics } from './metadata/time-semantics';
import { Provenance } from './metadata/provenance';

export interface RealityState<T = unknown> {
  subject: string;
  predicate: string;
  object: T;
  confidence: number;
  timeSemantics: TimeSemantics;
  provenance: Provenance;
}
