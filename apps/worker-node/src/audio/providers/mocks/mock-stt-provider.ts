import { SttProvider } from "../stt-provider";
import { SpeechSegment } from "../../session/session-state";

export class MockSttProvider implements SttProvider {
  public async transcribe(
    segment: SpeechSegment,
  ): Promise<{ text: string; language: string; confidence: number }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          text: `Mock transcription of ${segment.durationMs}ms audio`,
          language: "bn",
          confidence: 0.98,
        });
      }, 50);
    });
  }
}
