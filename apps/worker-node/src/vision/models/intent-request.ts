import { ROI } from "./primitives";

export interface VisionIntentRequest {
  goal: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  roi?: ROI;
  maxLatencyMs?: number;
  artifactRequired?: boolean;
  requiredPlugins?: string[];
}
