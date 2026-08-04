import { VisionPlugin } from "../contracts/vision-plugin";
import { VisionProvider } from "../contracts/vision-provider";
import { Frame, FrameFormat } from "../models/frame";
import { DetectedObject } from "../models/results";
import { VisionCapabilityManifest } from "../contracts/capability-manifest";

export class ObjectDetectionPlugin extends VisionPlugin<
  unknown,
  { frame: Frame },
  { objects: DetectedObject[] }
> {
  readonly id = "VISION_OBJECT_DETECTION";
  readonly version = "1.0.0";

  constructor(
    private readonly provider: VisionProvider<Frame, DetectedObject[]>,
  ) {
    super();
  }

  async initialize(): Promise<void> {
    await Promise.resolve();
  }

  health(): Promise<"READY" | "DEGRADED" | "UNHEALTHY"> {
    return Promise.resolve("READY");
  }

  async shutdown(): Promise<void> {
    await Promise.resolve();
  }

  async execute(args: {
    frame: Frame;
  }): Promise<{ objects: DetectedObject[] }> {
    const objects = await this.provider.process(args.frame);
    return { objects };
  }

  async cancel(): Promise<void> {
    await Promise.resolve();
  }

  public getManifest(): VisionCapabilityManifest {
    return {
      requiredCPU: "High",
      optionalGPU: true,
      requiredMemoryMb: 1024,
      supportedFormats: [FrameFormat.RGB, FrameFormat.NV12],
      supportedResolutions: [{ width: 640, height: 640 }],
      streamSupport: false,
      artifactSupport: false,
      latencyEstimateMs: 40,
      powerConsumption: "Medium",
    };
  }
}
