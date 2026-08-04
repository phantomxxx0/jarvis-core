import { FusionEngine, RawObservation } from '../contracts/fusion-engine';
import { RealityGraph } from '../contracts/reality-graph';
import { RealityState } from '../models/reality-state';
import { SensorTrust } from '../models/metadata/sensor-trust';

export interface ObservationPayload {
  subject: string;
  predicate: string;
  object: unknown;
}

export class CoreFusionEngine implements FusionEngine {
  constructor(private readonly realityGraph: RealityGraph) {}

  public processObservation(observation: RawObservation<ObservationPayload>): void {
    let trustWeight = 0.5; // Default for unknown sensors
    const sourceKey = observation.sourceId.toUpperCase() as keyof typeof SensorTrust;
    
    if (sourceKey in SensorTrust) {
      trustWeight = SensorTrust[sourceKey];
    }

    // Apply the static SensorTrust multiplier to the observation's raw confidence
    const computedConfidence = observation.confidence * trustWeight;

    const newState: RealityState = {
      subject: observation.payload.subject,
      predicate: observation.payload.predicate,
      object: observation.payload.object,
      confidence: computedConfidence,
      timeSemantics: {
        observedAt: observation.timestamp,
        occurredAt: observation.timestamp,
        receivedAt: new Date(),
        processedAt: new Date(),
        expiredAt: null,
      },
      provenance: {
        workerId: 'system',
        pluginId: 'fusion-engine',
        driverId: observation.sourceId,
        providerId: 'core',
        traceId: observation.id,
      }
    };

    const existingState = this.realityGraph.getState(newState.subject);

    if (existingState) {
      if (existingState.predicate !== newState.predicate) {
        // Conflict resolution: compare trusted confidence scores
        if (computedConfidence > existingState.confidence) {
           this.realityGraph.addOrUpdateState(newState);
        }
      } else {
        // Refresh state with new observation data
        this.realityGraph.addOrUpdateState(newState);
      }
    } else {
      this.realityGraph.addOrUpdateState(newState);
    }
  }

  public getRealityGraph(): RealityGraph {
    return this.realityGraph;
  }
}
