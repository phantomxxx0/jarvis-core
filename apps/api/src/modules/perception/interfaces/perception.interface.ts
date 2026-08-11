import { PerceptionType } from '../types/perception-type';

export enum PerceptionSource {
  CONVERSATION = 'conversation',

  VOICE = 'voice',

  VISION = 'vision',

  BROWSER = 'browser',

  SYSTEM = 'system',

  SECURITY = 'security',

  ROBOT = 'robot',
}

export interface Perception {
  source: PerceptionSource;

  type: PerceptionType;

  content: string;

  timestamp: Date;

  metadata?: Record<string, unknown>;
}
