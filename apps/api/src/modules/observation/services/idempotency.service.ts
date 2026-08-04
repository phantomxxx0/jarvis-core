import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  // LRU cache equivalent using a Map (maps retain insertion order)
  // Limited to 10,000 hashes to prevent memory leaks
  private readonly processedHashes = new Map<string, number>();
  private readonly MAX_CACHE_SIZE = 10000;

  generateHash(
    source: string,
    type: string,
    correlationId: string | undefined,
    payload: Record<string, unknown>,
  ): string {
    const data = JSON.stringify({
      source,
      type,
      correlationId: correlationId || 'NONE',
      payload,
    });
    return createHash('sha256').update(data).digest('hex');
  }

  isProcessed(hash: string): boolean {
    if (this.processedHashes.has(hash)) {
      // Update access time by re-inserting
      this.processedHashes.delete(hash);
      this.processedHashes.set(hash, Date.now());
      return true;
    }
    return false;
  }

  markProcessed(hash: string): void {
    if (this.processedHashes.size >= this.MAX_CACHE_SIZE) {
      // Evict the oldest (first inserted)
      const keys = Array.from(this.processedHashes.keys());
      const oldestKey: string | undefined = keys[0];
      if (oldestKey) {
        this.processedHashes.delete(oldestKey);
      }
    }
    this.processedHashes.set(hash, Date.now());
  }
}
