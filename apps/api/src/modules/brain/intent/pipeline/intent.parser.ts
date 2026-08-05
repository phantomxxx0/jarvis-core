export class IntentParser {
  static parse(llmOutput: string): Record<string, unknown> {
    try {
      // Fast path: try parsing the raw output first just in case the model obeyed
      return JSON.parse(llmOutput) as Record<string, unknown>;
    } catch (e) {
      try {
        // Fallback: The LLM likely wrapped it in markdown or added conversational filler.
        // Extract the raw JSON object by finding the first '{' and last '}'
        const startIdx = llmOutput.indexOf('{');
        const endIdx = llmOutput.lastIndexOf('}');
        
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          const jsonSubstring = llmOutput.substring(startIdx, endIdx + 1);
          return JSON.parse(jsonSubstring) as Record<string, unknown>;
        }
        
        throw new Error('No JSON object delimiters found in output.');
      } catch (innerError) {
        throw new Error('ParseError');
      }
    }
  }
}
