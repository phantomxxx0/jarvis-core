import { Injectable, Logger } from '@nestjs/common';
import { ContextComposerService } from '../../memory/retrieval/context-composer.service';
import type { AttentionResult } from '../contracts/attention-result';
import type {
  WorkingMemoryState,
  UserIdentity,
} from '../contracts/working-memory';
import { RetrievalPolicy } from './retrieval-policy';

/**
 * MemoryGateway (Brain V2)
 *
 * The single access point through which Brain V2 communicates with
 * the existing long-term memory system.
 *
 * DESIGN PRINCIPLE:
 *   Brain V2 never imports from memory sub-services directly.
 *   All memory access flows through this gateway.
 *
 * This decouples V2's architecture from V1's memory implementation details.
 * If the memory system is refactored, only this file changes.
 *
 * Phase 1: Delegates to existing ContextComposerService.
 * Phase 2: Will apply RetrievalPolicy for selective subsystem querying.
 */
@Injectable()
export class MemoryGateway {
  readonly moduleName = 'MemoryGateway';
  private readonly logger = new Logger(MemoryGateway.name);

  constructor(private readonly contextComposer: ContextComposerService) {}

  /** @implements ICognitiveModule */
  isReady(): boolean {
    return true;
  }

  /**
   * Retrieves relevant memory context for the current cognitive turn.
   * Returns a formatted string ready for prompt injection.
   *
   * @param userId    - The user whose memory to query.
   * @param query     - The search query (usually normalized input).
   * @param attention - AttentionResult for scoping via RetrievalPolicy.
   * @returns Formatted memory context string.
   */
  async retrieve(
    userId: string,
    query: string,
    attention: AttentionResult,
  ): Promise<string> {
    const startTime = Date.now();
    const policy = RetrievalPolicy.decide(attention);

    this.logger.debug(
      `[MemoryGateway] Retrieving for user=${userId} limit=${policy.limit}`,
    );

    try {
      const context = await this.contextComposer.compose({
        userId,
        query,
        limit: policy.limit,
        policy,
      });

      this.logger.debug(
        `[MemoryGateway] Retrieved ${context.length} chars in ${Date.now() - startTime}ms`,
      );

      return context;
    } catch (err) {
      this.logger.error(
        `[MemoryGateway] Retrieval failed: ${(err as Error).message}`,
      );
      return '';
    }
  }

  /**
   * Loads the UserIdentity for a user from long-term memory.
   * Extracts name, preferredAddress, and personal facts.
   *
   * Phase 1: Parses from the memory context string.
   * Phase 2: Dedicated UserIdentity query to preference memory.
   *
   * @param userId - The user whose identity to load.
   * @returns A partial UserIdentity (fields may be undefined if unknown).
   */
  async loadUserIdentity(userId: string): Promise<Partial<UserIdentity>> {
    try {
      // Phase 1: Retrieve from preference memory via composer.
      const context = await this.contextComposer.compose({
        userId,
        query: 'user name preferred address identity personal',
        limit: 5,
        policy: { queryPreferences: true },
      });

      // Extract name and preferred address from memory context.
      // Phase 2: Dedicated structured query.
      const nameMatch = context.match(
        /(?:name(?:\s+is)?|called)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      );
      const addressMatch = context.match(
        /(?:address(?:\s+(?:you|him|her|them)\s+as)?|preferred\s+(?:address|title))\s+["']?([^"'\n.]+)["']?/i,
      );

      return {
        name: nameMatch?.[1]?.trim(),
        preferredAddress: addressMatch?.[1]?.trim(),
        facts: {},
      };
    } catch {
      return { facts: {} };
    }
  }
}
