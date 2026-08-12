import { CapabilityPlugin } from "../../sdk/capability-plugin";
import { TtsProvider } from "../providers/tts-provider";
import { PcmFrame } from "../core/pcm-frame";

export interface TtsPayload {
  text: string;
  voice?: string;
}

export class TtsPlugin extends CapabilityPlugin<
  unknown,
  TtsPayload,
  { success: boolean; durationMs: number; frames: PcmFrame[] }
> {
  readonly id = "TEXT_TO_SPEECH";
  readonly version = "1.0.0";

  constructor(private readonly provider: TtsProvider) {
    super();
  }

  async initialize(): Promise<void> {
    await Promise.resolve();
  }

  async health(): Promise<"READY" | "DEGRADED" | "UNHEALTHY"> {
    await Promise.resolve();
    return "READY";
  }

  async shutdown(): Promise<void> {
    await Promise.resolve();
  }

  async execute(
    args: TtsPayload,
  ): Promise<{ success: boolean; durationMs: number; frames: PcmFrame[] }> {
    const frames = await this.provider.synthesize(args.text, args.voice);

    // In a fully integrated system, these frames would be sent to the SpeakerDriver.
    // For now, we simulate success based on synthesis completion.
    return {
      success: true,
      durationMs: frames.length * 50, // rough estimation
      frames,
    };
  }

  async cancel(): Promise<void> {
    await Promise.resolve();
  }
}
