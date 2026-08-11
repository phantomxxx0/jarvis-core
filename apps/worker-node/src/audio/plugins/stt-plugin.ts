import { CapabilityPlugin } from "../../sdk/capability-plugin";
import { SttProvider } from "../providers/stt-provider";
import { SpeechSegment } from "../session/session-state";

export class SttPlugin extends CapabilityPlugin<
  unknown,
  SpeechSegment,
  { text: string; language: string; confidence: number }
> {
  readonly id = "SPEECH_TO_TEXT";
  readonly version = "1.0.0";

  constructor(private readonly provider: SttProvider) {
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
    args: SpeechSegment,
  ): Promise<{ text: string; language: string; confidence: number }> {
    return await this.provider.transcribe(args);
  }

  async cancel(): Promise<void> {
    await Promise.resolve();
  }
}
