export class IntentValidator {
  static validate(
    rawJson: Record<string, unknown> | null | undefined,
  ): boolean {
    if (!rawJson || typeof rawJson !== 'object') {
      return false;
    }

    if (rawJson.version !== 1) {
      return false;
    }

    if (typeof rawJson.intent !== 'string') {
      return false;
    }

    const confidence = rawJson.confidence;
    if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
      return false;
    }

    if (!rawJson.entities || typeof rawJson.entities !== 'object') {
      return false;
    }

    if (!Array.isArray(rawJson.capabilities)) {
      return false;
    }

    return true;
  }
}
