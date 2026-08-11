export interface MemoryMetadata {
  source?: string;
  tags?: string[];
  confidence?: number;
  relatedMemoryIds?: string[];
  importanceReason?: string;
}
