import { VisionPlugin } from "../contracts/vision-plugin";
import { VisionProvider } from "../contracts/vision-provider";
import { Frame, FrameFormat } from "../models/frame";
import { FaceResult } from "../models/results";
import { VisionCapabilityManifest } from "../contracts/capability-manifest";

export class FacePlugin extends VisionPlugin<
  unknown,
  { frame: Frame },
  { faces: FaceResult[] }
> {
  readonly id = "VISION_FACE_DETECTION";
  readonly version = "1.0.0";

  constructor(private readonly provider: VisionProvider<Frame, FaceResult[]>) {
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

  async execute(args: { frame: Frame }): Promise<{ faces: FaceResult[] }> {
    const faces = await this.provider.process(args.frame);
    return { faces };
  }

  async cancel(): Promise<void> {
    await Promise.resolve();
  }

  public getManifest(): VisionCapabilityManifest {
    return {
      requiredCPU: "Medium",
      optionalGPU: false,
      requiredMemoryMb: 512,
      supportedFormats: [FrameFormat.RGB],
      supportedResolutions: [{ width: 640, height: 480 }],
      streamSupport: false,
      artifactSupport: false,
      latencyEstimateMs: 30,
      powerConsumption: "Low",
    };
  }
}
