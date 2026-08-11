import { Injectable } from '@nestjs/common';
import { BrainRouteStrategy } from './contracts/brain-plan';

@Injectable()
export class PlannerPromptBuilder {
  /**
   * Builds system and user prompts to instruct the LLM to output a valid DAG step array.
   */
  buildPlanningPrompt(
    intent: Record<string, unknown>,
    strategy: BrainRouteStrategy,
    contextText?: string,
    clusterState?: any,
  ): { systemPrompt: string; userPrompt: string } {
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
      "status": "PLANNED",
      "dependencies": []
    }
  ]
}`;

    let userPrompt = `Generate a plan for:
- Goal: "${(intent.primaryGoal as string) || (intent.goal as string) || 'Fulfill query'}"
- Category: "${(intent.category as string) || 'DIRECT_CONVERSATION'}"
- Strategy: "${strategy}"
- Parameters: ${JSON.stringify(intent.rawParameters || {})}`;

    if (contextText) {
      userPrompt += `\n\nContext:\n${contextText}`;
    }

    if (clusterState) {
      userPrompt += `\n\nAvailable Capabilities & Cluster Health (DO NOT hallucinate tools outside this list):\n`;
      userPrompt += JSON.stringify(clusterState, null, 2);
    }

    return { systemPrompt, userPrompt };
  }

  /**
   * Builds a prompt for dynamic error correction/self-healing.
   */
  public buildCorrectionPrompt(
    capability: string,
    originalArgs: Record<string, unknown>,
    error: string,
  ): string {
    return `You are a system debugger for the Jarvis Task Engine.
A task execution has failed.

Capability: "${capability}"
Original Arguments:
${JSON.stringify(originalArgs, null, 2)}

Error Message:
"${error}"

Analyze the error and the original arguments, then generate the corrected arguments needed for this capability to succeed.
Return ONLY a valid JSON object representing the corrected arguments. Do NOT wrap it in markdown block quotes (\`\`\`json) or include any prose.`;
  }
}
