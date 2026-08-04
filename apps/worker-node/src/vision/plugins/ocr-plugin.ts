import { VisionPlugin } from "../contracts/vision-plugin";
import { VisionProvider } from "../contracts/vision-provider";
import { Frame, FrameFormat } from "../models/frame";
import { OCRResult } from "../models/results";
import { VisionCapabilityManifest } from "../contracts/capability-manifest";

export class OcrPlugin extends VisionPlugin<
  unknown,
  { frame: Frame },
  { ocr: OCRResult[] }
> {
  readonly id = "VISION_OCR";
  readonly version = "1.0.0";

  constructor(private readonly provider: VisionProvider<Frame, OCRResult[]>) {
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

  async execute(args: { frame: Frame }): Promise<{ ocr: OCRResult[] }> {
    const ocr = await this.provider.process(args.frame);
    return { ocr };
  }

  async cancel(): Promise<void> {
    await Promise.resolve();
  }

  public getManifest(): VisionCapabilityManifest {
    return {
      requiredCPU: "UltraHigh",
      optionalGPU: true,
      requiredMemoryMb: 2048,
      supportedFormats: [FrameFormat.RGB],
      supportedResolutions: [{ width: 1920, height: 1080 }],
      streamSupport: false,
      artifactSupport: false,
      latencyEstimateMs: 120,
      powerConsumption: "High",
    };
  }
}
