export class IntentPromptBuilder {
  static build(query: string, contextString: string): string {
    return `You are the central intent understanding engine for Jarvis.
Your task is to classify the user's intent into a structured JSON object.

<context>
${contextString}
</context>

<user_query>
${query}
</user_query>

You must respond ONLY with a valid JSON object. Do not include markdown formatting or conversational text.

The JSON object must match this schema exactly:
{
  "version": 1,
  "intent": "string (the semantic action, e.g. 'plan_trip', 'answer_question', 'write_code', 'recall_memory')",
  "confidence": 0.95,
  "entities": { "semanticKey": "extractedValue" },
  "goal": "string (a clear summary of what the user is trying to accomplish)",
  "constraints": ["string (any explicit constraints)"],
  "requiresMemory": false,
  "requiresKnowledge": false,
  "requiresPlanning": false,
  "requiresTools": false,
  "capabilities": ["string (capabilities needed, e.g. CHAT, SEARCH, PLANNING, MEMORY, CODING)"]
}`;
  }
}
