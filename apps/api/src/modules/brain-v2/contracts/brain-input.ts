/**
 * InputModality
 *
 * Represents every surface through which Jarvis can receive input.
 * Designed for the next 10 years: text, voice, vision, robotics, IoT.
 */
export type InputModality =
  | 'text'
  | 'voice'
  | 'vision'
  | 'cli'
  | 'api'
  | 'robotics'
  | 'iot'
  | 'multimodal';

/**
 * BrainInput
 *
 * The universal envelope for ALL input entering Brain V2, regardless of
 * origin surface. The Perception Layer normalizes every modality into this
 * contract before any cognitive processing begins.
 *
 * This is the single gate through which the outside world enters the
 * cognitive operating system.
 */
export interface BrainInput {
  /** Stable user identifier. */
  userId: string;

  /** Session identifier. Groups a conversation turn. */
  sessionId: string;

  /** Wall-clock time at which input was received at the API boundary. */
  timestamp: Date;

  /** How the input arrived. Determines normalization strategy. */
  modality: InputModality;

  /**
   * Raw, unprocessed input as received from the originating surface.
   * For text: the user's message string.
   * For voice: the transcription result.
   * For vision: a base64-encoded image URI or URL.
   * For robotics/IoT: a JSON-serialized sensor payload as string.
   */
  rawInput: string;

  /**
   * Modality-specific metadata.
   * text:     { language?: string; charset?: string }
   * voice:    { confidence: number; durationMs: number; languageCode: string }
   * vision:   { width: number; height: number; mimeType: string }
   * robotics: { sensorId: string; firmwareVersion: string }
   */
  metadata: Record<string, unknown>;
}
