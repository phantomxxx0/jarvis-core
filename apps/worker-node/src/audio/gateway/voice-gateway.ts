import { AudioSessionManager } from "../session/audio-session-manager";
import { SttPlugin } from "../plugins/stt-plugin";
import { TtsPlugin } from "../plugins/tts-plugin";
import { TaskEnvelope } from "../../sdk/envelopes";
import { SpeechSegment } from "../session/session-state";
import { randomUUID } from "crypto";

export class VoiceGateway {
  constructor(
    private readonly sessionManager: AudioSessionManager,
    private readonly sttPlugin: SttPlugin,
    private readonly ttsPlugin: TtsPlugin,
    private readonly onSendTask: (task: TaskEnvelope) => void,
  ) {}

  public initialize(): void {
    this.sessionManager.onSpeechSegmentComplete = (segment: SpeechSegment) => {
      this.handleSpeechSegment(segment).catch((err) => {
        console.error("[VoiceGateway] Unhandled promise rejection:", err);
      });
    };
  }

  private async handleSpeechSegment(segment: SpeechSegment): Promise<void> {
    try {
      const traceId = randomUUID();
      const executionId = randomUUID();
      const correlationId = randomUUID();

      // 1. Convert PCM to Text via STT Plugin
      const transcription = await this.sttPlugin.execute(segment);

      if (!transcription.text || transcription.text.trim().length === 0) {
        return; // Ignore empty speech
      }

      // 2. Dispatch to Core Server
      const task: TaskEnvelope = {
        taskId: randomUUID(),
        capabilityId: "CORE_INTENT_ROUTER",
        payload: {
          text: transcription.text,
          language: transcription.language,
          confidence: transcription.confidence,
        },
        traceId,
        executionId,
        correlationId,
      };

      this.onSendTask(task);
    } catch (error) {
      console.error("[VoiceGateway] Failed to process speech segment:", error);
    }
  }

  public async playAudioResponse(text: string): Promise<void> {
    try {
      // 1. Pause listening (Half-Duplex)
      await this.sessionManager.stop();

      // 2. Generate audio via TTS Plugin
      const result = await this.ttsPlugin.execute({ text });

      // 3. Play audio through the hardware driver
      if (result.frames && result.frames.length > 0) {
        await this.sessionManager.driver.playAudio(result.frames);
      } else {
        await new Promise((resolve) => setTimeout(resolve, result.durationMs));
      }

      // 4. Resume listening
      await this.sessionManager.start();
    } catch (error) {
      console.error("[VoiceGateway] Failed to play audio response:", error);
      // Ensure we resume listening on failure
      await this.sessionManager.start();
    }
  }
}
