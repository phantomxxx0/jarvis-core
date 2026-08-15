export interface MemoryRetrievalPolicy {
  queryEpisodic?: boolean;
  querySemantic?: boolean;
  queryPreferences?: boolean;
  queryProcedural?: boolean;
  queryProjects?: boolean;
  queryGoals?: boolean;
  queryDevices?: boolean;
  queryGraph?: boolean;
}

export interface MemoryRetrievalParams {
  query: string;
  limit?: number;
  threshold?: number;
  userId: string;
  conversationId?: string;
  policy?: MemoryRetrievalPolicy;
}

export interface MemoryStoreParams<T = any> {
  userId: string;
  conversationId?: string;
  data: T;
}

export interface MemoryUpdateParams<T = any> {
  id: string;
  userId: string;
  data: Partial<T>;
}

export interface MemoryRankParams {
  memoryId: string;
  userId: string;
}

export interface MemoryContext {
  content: string;
  source: string;
  confidence: number;
  memoryId?: string;
}

export interface IMemoryService<T = any> {
  /**
   * Store new information in this memory subsystem.
   */
  store(params: MemoryStoreParams<T>): Promise<T>;

  /**
   * Retrieve relevant memories based on the context.
   */
  retrieve(params: MemoryRetrievalParams): Promise<T[]>;

  /**
   * Update an existing memory.
   */
  update(params: MemoryUpdateParams<T>): Promise<T>;

  /**
   * Rank a specific memory and return its updated score.
   */
  rank(params: MemoryRankParams): Promise<number>;

  /**
   * Generate a natural language summary of a specific memory or set of memories.
   */
  summarize(memoryIds: string[]): Promise<string>;

  /**
   * Format the retrieved memories into a unified context string for the Brain.
   */
  composeContext(params: MemoryRetrievalParams): Promise<MemoryContext[]>;
}
