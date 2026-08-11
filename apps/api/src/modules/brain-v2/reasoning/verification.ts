/**
 * VerificationResult
 *
 * Outcome of verifying a reasoning result or plan execution.
 * Used by the Reflection module to assess quality.
 */
export interface VerificationResult {
  passed: boolean;
  score: number; // 0–100
  issues: string[];
  recommendations: string[];
}

/**
 * Verifier
 *
 * Phase 1: Lightweight structural checks.
 * Phase 2: LLM-driven semantic verification.
 */
export class Verifier {
  /**
   * Verifies that a generated response is structurally sound.
   *
   * @param response - The Language Generator's output.
   * @returns A VerificationResult.
   */
  static verifyResponse(response: string): VerificationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    if (!response || response.trim().length === 0) {
      return {
        passed: false,
        score: 0,
        issues: ['Empty response'],
        recommendations: ['Retry generation'],
      };
    }

    // Check for common LLM artifacts.
    if (/based on (my |the )?previous conversation/i.test(response)) {
      issues.push(
        'Contains forbidden phrase: "Based on previous conversation"',
      );
      score -= 30;
    }

    if (/as an ai language model/i.test(response)) {
      issues.push('Contains forbidden phrase: "As an AI language model"');
      score -= 30;
    }

    if (/<think>[\s\S]*?<\/think>/i.test(response)) {
      issues.push('Contains unsanitized <think> tags');
      score -= 20;
    }

    if (response.trim().startsWith('{') || response.trim().startsWith('[')) {
      recommendations.push(
        'Response appears to be raw JSON — naturalizer may have failed',
      );
      score -= 10;
    }

    return {
      passed: score >= 70,
      score: Math.max(0, score),
      issues,
      recommendations,
    };
  }
}
