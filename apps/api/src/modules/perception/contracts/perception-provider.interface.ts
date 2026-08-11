import {
  PerceptionEvent,
  PerceptionSourceType,
} from './perception-event.interface';

export interface PerceptionProvider {
  readonly name: string;
  readonly sourceType: PerceptionSourceType;

  isHealthy(): boolean | Promise<boolean>;

  // Optional polling or event emission hook for active providers
  poll?(): Promise<PerceptionEvent[]>;
}

export const PERCEPTION_PROVIDERS = 'PERCEPTION_PROVIDERS';
