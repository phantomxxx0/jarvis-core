export interface ExtractedMemory {
  type: string;
  data: Record<string, any>;
  confidence: number;
}

export interface MemoryExtractor {
  extract(conversation: string, context: string): Promise<ExtractedMemory[]>;
}
