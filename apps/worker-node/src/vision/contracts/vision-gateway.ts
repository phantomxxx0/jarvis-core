import { VisionIntentRequest } from "../models/intent-request";
import { VisionObservation } from "../models/observation";

export interface VisionRequestPlanner {
  plan(request: VisionIntentRequest): Promise<string[]>; // Returns plugin IDs to execute
}

export interface VisionGateway {
  handleRequest(request: VisionIntentRequest): Promise<VisionObservation>;
  startContinuousObservation(): Promise<void>;
  stopContinuousObservation(): Promise<void>;
}
