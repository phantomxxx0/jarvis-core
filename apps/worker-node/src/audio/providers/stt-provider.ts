import { SpeechSegment } from "../session/session-state";

export interface SttProvider {
  transcribe(
    segment: SpeechSegment,
  ): Promise<{ text: string; language: string; confidence: number }>;
}
