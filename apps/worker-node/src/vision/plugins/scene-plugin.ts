import { VisionPlugin } from "../contracts/vision-plugin";
import { VisionProvider } from "../contracts/vision-provider";
import { Frame, FrameFormat } from "../models/frame";
import { SceneResult } from "../models/results";
import { VisionCapabilityManifest } from "../contracts/capability-manifest";

export class ScenePlugin extends VisionPlugin<
  unknown,
  { frame: Frame },
  { scene: SceneResult }
> {
  readonly id = "VISION_SCENE_CLASSIFICATION";
  readonly version = "1.0.0";

  constructor(private readonly provider: VisionProvider<Frame, SceneResult>) {
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

  async execute(args: { frame: Frame }): Promise<{ scene: SceneResult }> {
    const scene = await this.provider.process(args.frame);
    return { scene };
  }

  async cancel(): Promise<void> {
    await Promise.resolve();
  }

  public getManifest(): VisionCapabilityManifest {
    return {
      requiredCPU: "Low",
      optionalGPU: true,
      requiredMemoryMb: 256,
      supportedFormats: [FrameFormat.RGB],
      supportedResolutions: [{ width: 224, height: 224 }],
      streamSupport: false,
      artifactSupport: false,
      latencyEstimateMs: 60,
      powerConsumption: "Low",
    };
  }
}
