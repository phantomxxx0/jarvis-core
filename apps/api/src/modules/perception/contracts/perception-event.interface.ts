export type PerceptionSourceType =
  | 'WEBHOOK'
  | 'GITHUB'
  | 'FILESYSTEM'
  | 'CLIPBOARD'
  | 'VOICE'
  | 'VISION'
  | 'ANDROID'
  | 'BROWSER'
  | 'IOT';

export interface PerceptionEvent<T = unknown> {
  readonly id: string;
  readonly sourceType: PerceptionSourceType;
  readonly sourceId: string; // e.g., 'github-webhook-listener', 'mic-1'
  readonly timestamp: Date;
  readonly payload: T;
  readonly metadata?: Record<string, unknown>;
}
