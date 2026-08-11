/**
 * Specifies the specific features supported by a model.
 */
export interface ModelCapability {
  readonly supportsChat: boolean;
  readonly supportsCompletion: boolean;
  readonly supportsEmbeddings: boolean;
  readonly supportsToolCalling: boolean;
  readonly supportsVision: boolean;
  readonly supportsAudio: boolean;
  readonly supportsStreaming: boolean;
  readonly contextWindowSize?: number;
}
