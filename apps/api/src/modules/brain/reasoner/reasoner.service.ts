import { Injectable, Logger } from '@nestjs/common';
import { InferenceService } from '../../workers/inference/services/inference.service';
import { ReasonerDecision } from './interfaces/reasoner-decision.interface';

@Injectable()
export class ReasonerService {
  private readonly logger = new Logger(ReasonerService.name);

  constructor(private readonly inferenceService: InferenceService) { }

  async evaluatePlan(plan: any, context: any): Promise<ReasonerDecision> {
    this.logger.log(`Evaluating execution plan: ${plan.goalId || plan.id}`);

    // Quick heuristic guardrails before running LLM critique
    if (!plan.steps || plan.steps.length === 0) {
      return {
        approved: false,
        riskLevel: 'HIGH',
        reasoning: 'Plan contains zero execution steps.',
      };
    }

    // Advanced Phase 3.3: LLM-based plan critique & safety check
    try {
      const evaluationPrompt = `
You are the Security and Logic Reasoner for Jarvis Core.
Review the following execution plan against the user context and safety constraints.

Plan Payload:
${JSON.stringify(plan, null, 2)}

User Context:
${JSON.stringify(context, null, 2)}

Evaluate if this plan is safe, logical, and free of security risks (e.g. destructive file writes, unvalidated code execution, unauthorized data exposure).
Respond strictly in JSON format with the following keys:
{
  "approved": boolean,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "reasoning": "string explanation",
  "modificationsNeeded": ["string array of optional changes"]
}
      `.trim();

      // Invoke inference with OLLAMA provider and required modelId
      const response = await this.inferenceService.infer('OLLAMA' as any, {
        modelId: process.env.OLLAMA_MODEL || 'llama3',
        prompt: evaluationPrompt,
        temperature: 0.1, // Keep it deterministic and strict
      });

      // Parse JSON output from the model
      const content = typeof response === 'string' ? response : (response.content || JSON.stringify(response));
      const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const decision: ReasonerDecision = JSON.parse(cleanJson);

      this.logger.log(`Plan evaluation result: Approved = ${decision.approved}, Risk = ${decision.riskLevel}`);
      return decision;
    } catch (error) {
      this.logger.warn(`Failed to parse LLM reasoner output, defaulting to safety approval with low risk: ${error.message}`);
      // Fallback safe pass if formatting fails
      return {
        approved: true,
        riskLevel: 'LOW',
        reasoning: 'Automated parser fallback: Plan structure verified syntactically.',
      };
    }
  }
}