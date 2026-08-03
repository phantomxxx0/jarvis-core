import { Injectable } from '@nestjs/common';
import { BrainRouteStrategy } from './contracts/brain-plan';

@Injectable()
export class PlannerPromptBuilder {
  /**
   * Builds system and user prompts to instruct the LLM to output a valid DAG step array.
   */
  buildPlanningPrompt(intent: any, strategy: BrainRouteStrategy): { systemPrompt: string; userPrompt: string } {
    const systemPrompt = `You are the Task Planning Engine for Jarvis.
Convert the user's intent into a structured Directed Acyclic Graph (DAG) plan.

RULES:
1. Output valid JSON ONLY. No markdown wrappers (\`\`\`json) or standard prose.
2. Every step must have a UUID for 'id' and 'planId'.
3. Use the 'dependencies' array to declare IDs of steps that MUST complete before the current step starts.
   - For PARALLEL_DAG: Steps without mutual dependencies must have an empty 'dependencies' array.
   - For PIPELINE: Each step depends on the ID of the step preceding it.

JSON FORMAT:
{
  "steps": [
    {
      "id": "UUID_V4_STRING",
      "planId": "PLAN_UUID_V4_STRING",
      "name": "Step title",
      "description": "Detailed explanation",
      "action": "action_or_tool_name",
      "arguments": { "param": "value" },
      "status": "DRAFT",
      "dependencies": []
    }
  ]
}`;

    const userPrompt = `Generate a plan for:
- Goal: "${intent.primaryGoal || intent.goal || 'Fulfill query'}"
- Category: "${intent.category || 'DIRECT_CONVERSATION'}"
- Strategy: "${strategy}"
- Parameters: ${JSON.stringify(intent.rawParameters || {})}`;

    return { systemPrompt, userPrompt };
  }
}
