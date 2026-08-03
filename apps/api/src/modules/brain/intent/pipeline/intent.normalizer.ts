import { IntentClassification } from './intent.classification';

export class IntentNormalizer {
  static normalize(rawJson: Record<string, unknown>): IntentClassification {
    return {
      version: 1,
      type: typeof rawJson.intent === 'string' ? rawJson.intent : 'UNKNOWN',
      confidence: Math.max(0, Math.min(1, Number(rawJson.confidence) || 0)), // clamp confidence
      entities: (rawJson.entities as Record<string, unknown>) || {},
      goal: typeof rawJson.goal === 'string' ? rawJson.goal : '',
      constraints: Array.isArray(rawJson.constraints)
        ? (rawJson.constraints as string[])
        : [],
      requiresMemory: !!rawJson.requiresMemory,
      requiresKnowledge: !!rawJson.requiresKnowledge,
      requiresPlanning: !!rawJson.requiresPlanning,
      requiresTools: !!rawJson.requiresTools,
      capabilities: Array.isArray(rawJson.capabilities)
        ? (rawJson.capabilities as string[])
        : [],
    };
  }

  static getFallbackIntent(query: string): IntentClassification {
    return {
      version: 1,
      type: 'UNKNOWN',
      confidence: 1.0,
      entities: {},
      goal: query,
      constraints: [],
      requiresMemory: false,
      requiresKnowledge: false,
      requiresPlanning: false,
      requiresTools: false,
      capabilities: [],
    };
  }
}
