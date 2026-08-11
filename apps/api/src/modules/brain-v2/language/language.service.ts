import { Injectable, Logger } from '@nestjs/common';
import type { LanguageResult } from '../contracts/language-result';
import type { CognitiveContext } from '../contracts/cognitive-context';
import type { WorkingMemoryState } from '../contracts/working-memory';
import { PromptBuilder } from './prompt-builder';
import { InferenceService } from '../../workers/inference/services/inference.service';
import { InferenceProviderType } from '../../workers/inference/enums/provider.enum';

/**
 * LanguageGenerator (Brain V2)
 *
 * Wraps V1's InferenceService. Converts the assembled CognitiveContext
 * into a natural language response using the PromptBuilder.
 * Includes history truncation to prevent local LLM prompt bloat.
 */
@Injectable()
export class LanguageGenerator {
  readonly moduleName = 'LanguageGenerator';
  private readonly logger = new Logger(LanguageGenerator.name);

  // MAX HISTORY LIMIT: Prevent exponential prompt bloat
  private readonly MAX_HISTORY_TURNS = 5;

  constructor(
    private readonly promptBuilder: PromptBuilder,
    private readonly inference: InferenceService,
  ) {}

  /** @implements ICognitiveModule */
  isReady(): boolean {
    return true;
  }

  /**
   * Generates a natural language response from the cognitive context.
   *
   * @param context - The assembled CognitiveContext for this turn.
   * @param state   - The current WorkingMemoryState.
   * @returns A LanguageResult containing the response text.
   */
  async generate(
    context: CognitiveContext,
    state: WorkingMemoryState,
  ): Promise<LanguageResult> {
    const tStart = performance.now();

    try {
      this.logger.debug(
        `[LanguageGenerator] Assembling prompts for user=${state.userId}`,
      );

      // 1. Prompt Assembly
      const tPromptStart = performance.now();

      const systemPrompt = this.promptBuilder.buildSystemPrompt(context, state);
      const userPrompt = this.promptBuilder.buildUserPrompt(context, state);

      const durationPrompt = performance.now() - tPromptStart;

      // 2. Truncate History
      const history = state.conversationHistory
        .slice(-this.MAX_HISTORY_TURNS)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      const messages = [
        ...history,
        { role: 'user' as const, content: userPrompt },
      ];

      // Rough token estimation (chars / 4)
      const totalChars =
        systemPrompt.length +
        messages.reduce((acc, msg) => acc + msg.content.length, 0);
      const estimatedTokens = Math.floor(totalChars / 4);

      this.logger.log(
        `[LanguageGenerator] Payload ready. Estimated Tokens: ~${estimatedTokens}. Calling Ollama...`,
      );

      // 3. LLM Execution
      const tLlmStart = performance.now();

      const response = await this.inference.infer(
        InferenceProviderType.OLLAMA,
        {
          modelId: 'llama3.1:8b',
          messages,
          systemPrompt,
          temperature: 0.7,
          maxTokens: 4000,
          keepAlive: -1, // Ensures the VRAM lock remains active
        },
      );

      const durationLlm = performance.now() - tLlmStart;
      const tTotal = performance.now() - tStart;

      // 4. Print Diagnostic Breakdown
      this.logger.log(`
📊 LanguageGenerator Execution Breakdown:
--------------------------------------------------
Prompt Assembly ..... ${durationPrompt.toFixed(2)} ms
Prompt Tokens ....... ~${estimatedTokens} tokens
Ollama Generation ... ${durationLlm.toFixed(2)} ms
--------------------------------------------------
Total Time .......... ${tTotal.toFixed(2)} ms
--------------------------------------------------
      `);

      return {
        content: response.content || '',
        styleApplied: 'CONCISE',
        isValid: true,
        usedFallback: false,
        estimatedTokens: estimatedTokens,
        generatedAt: new Date(),
        llmLatencyMs: durationLlm,
      };
    } catch (err) {
      this.logger.error(
        `[LanguageGenerator] Generation failed: ${(err as Error).message}`,
      );

      return {
        content:
          'I encountered an internal error while trying to form a response. Please try again in a moment.',
        styleApplied: 'FORMAL',
        isValid: false,
        usedFallback: true,
        estimatedTokens: 20,
        generatedAt: new Date(),
        llmLatencyMs: 0,
      };
    }
  }

  /**
   * Streaming variant of generate(). Reuses identical prompt construction
   * and inference request parameters — the only difference is calling
   * InferenceService.inferStream() instead of infer(), and yielding
   * content incrementally instead of returning a single LanguageResult.
   *
   * Unlike generate(), this method does NOT catch and convert errors into
   * a fallback LanguageResult — errors propagate to the caller. The
   * caller (BrainV2Service.processStream(), in a future task) is
   * responsible for deciding how to surface a mid-stream failure, since
   * partial content may already have been emitted to the client.
   *
   * Empty/missing content chunks (e.g. a chunk carrying only metadata,
   * no text) are silently skipped — only non-empty content is yielded.
   */
  async *generateStream(
    context: CognitiveContext,
    state: WorkingMemoryState,
  ): AsyncGenerator<string> {
    this.logger.debug(
      `[LanguageGenerator] Assembling prompts (stream) for user=${state.userId}`,
    );

    // 1. Prompt Assembly — identical to generate()
    const systemPrompt = this.promptBuilder.buildSystemPrompt(context, state);
    const userPrompt = this.promptBuilder.buildUserPrompt(context, state);

    // 2. Truncate History — identical to generate()
    const history = state.conversationHistory
      .slice(-this.MAX_HISTORY_TURNS)
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    const messages = [
      ...history,
      { role: 'user' as const, content: userPrompt },
    ];

 this.logger.log(
      `[LanguageGenerator] Streaming payload ready. Calling Ollama...`,
    );

    // 3. LLM Execution (streaming) — same request shape as generate()
    for await (const response of this.inference.inferStream(
      InferenceProviderType.OLLAMA,
      {
        modelId: 'llama3.1:8b',
        messages,
        systemPrompt,
        temperature: 0.7,
        maxTokens: 4000,
        keepAlive: -1,
      },
    )) {
      if (response.content && response.content.length > 0) {
        yield response.content;
      }
    }
  }
}
