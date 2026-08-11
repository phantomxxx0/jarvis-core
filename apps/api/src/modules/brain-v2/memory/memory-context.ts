/**
 * MemoryContext (V2)
 *
 * A single retrieved memory fact with provenance metadata.
 * Produced by the Memory Gateway and loaded into WorkingMemoryState.
 */
export interface MemoryContextV2 {
  /** The retrieved content string. */
  content: string;

  /** Source memory type (episodic, semantic, preference, etc.). */
  source: string;

  /** Relevance/confidence score (0–100). */
  confidence: number;

  /** The memory's unique ID (for lifecycle tracking). */
  memoryId?: string;
}

/**
 * MemoryRetrievalRequest
 *
 * Parameters for a V2 memory retrieval operation.
 */
export interface MemoryRetrievalRequest {
  /** The user whose memory to query. */
  userId: string;

  /** The search query (usually the normalized input). */
  query: string;

  /**
   * Topic tags from AttentionResult to scope retrieval.
   * Narrows results to relevant memory subsystems.
   */
  topicTags: string[];

  /** Maximum number of facts to return. Default: 20. */
  limit?: number;
}
