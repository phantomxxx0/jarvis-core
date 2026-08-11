import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import {
  ContextProvider,
  CONTEXT_PROVIDERS,
  ContextSection,
  ContextBundle,
} from './contracts/context-provider.interface';

@Injectable()
export class ContextBuilder {
  private readonly logger = new Logger(ContextBuilder.name);

  constructor(
    @Optional()
    @Inject(CONTEXT_PROVIDERS)
    private readonly providers: ContextProvider[] = [],
  ) {}

  public async buildUnifiedContext(
    query: string,
    maxSections = 10,
    maxCharacters = 8000,
  ): Promise<ContextBundle> {
    if (!this.providers || this.providers.length === 0) {
      return { text: '', sections: [], retrievedAt: new Date() };
    }

    // Execute with Timeouts
    const promises = this.providers.map(async (provider) => {
      try {
        const isHealthy = await provider.isHealthy();
        if (!isHealthy) return null;

        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Timeout [${provider.defaultTimeoutMs}ms]`)),
            provider.defaultTimeoutMs,
          ),
        );

        return await Promise.race([
          provider.buildContext(query),
          timeoutPromise,
        ]);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Provider ${provider.name} failed or timed out: ${errorMsg}`,
        );
        return null;
      }
    });

    const results = await Promise.all(promises);

    // Filter & Sort
    const validSections = results
      .filter((res): res is ContextSection => res !== null && res.hasData)
      .sort((a, b) => b.priority - a.priority);

    // Budgeting
    const selectedSections: ContextSection[] = [];
    let currentChars = 0;

    for (const section of validSections) {
      if (selectedSections.length >= maxSections) break;
      if (currentChars + section.content.length > maxCharacters) continue;

      selectedSections.push(section);
      currentChars += section.content.length;
    }

    const text = selectedSections.map((s) => s.content).join('\n\n');

    return { text, sections: selectedSections, retrievedAt: new Date() };
  }
}
