import { FrameFormat } from "../models/frame";

export interface VisionCapabilityManifest {
  requiredCPU: "Low" | "Medium" | "High" | "UltraHigh";
  optionalGPU: boolean;
  requiredMemoryMb: number;
  supportedFormats: FrameFormat[];
  supportedResolutions: { width: number; height: number }[];
  streamSupport: boolean;
  artifactSupport: boolean;
  latencyEstimateMs: number;
  powerConsumption: "Low" | "Medium" | "High";
}
