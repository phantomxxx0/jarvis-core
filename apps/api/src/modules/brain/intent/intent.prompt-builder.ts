export class IntentPromptBuilder {
  static build(query: string, contextString: string): string {
    return `You are the central intent understanding engine for a cognitive AI.
Your task is to classify the user's intent into a structured JSON object.

CRITICAL INTENT RULES:
- "store_memory": You MUST use this intent ANY TIME the user states a personal fact, introduces family/friends, shares a preference, or teaches you about themselves (e.g., "My name is X", "I like Y", "My father is Z").
- "recall_memory": Use this when the user explicitly asks what you remember about them or asks about their own history.
- "answer_question": Use this when the user asks you to explain a concept, answer a general knowledge question, or generate text.
- "plan_task": Use this for complex, multi-step requests.

<context>
${contextString}
</context>

<user_query>
${query}
</user_query>

You must respond ONLY with a valid JSON object. Do not include markdown formatting, fences, or conversational text.

The JSON object must match this schema exactly:
{
  "version": 1,
  "intent": "string (must be one of: 'store_memory', 'answer_question', 'recall_memory', 'plan_task', 'write_code', 'chat')",
  "confidence": 0.95,
  "entities": { "semanticKey": "extractedValue" },
  "goal": "string (a clear summary of what the user is trying to accomplish)",
  "constraints": ["string (any explicit constraints)"],
  "requiresMemory": boolean (MUST be true if intent is 'store_memory' or 'recall_memory'),
  "requiresKnowledge": boolean,
  "requiresPlanning": boolean,
  "requiresTools": boolean,
  "capabilities": ["string (capabilities needed, e.g. MEMORY_WRITE, MEMORY_READ, CHAT, SEARCH, PLANNING)"]
}`;
  }
}
