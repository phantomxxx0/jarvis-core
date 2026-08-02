export interface Intent {
  id: string;
  category: 'QUERY' | 'COMMAND' | 'EXPLORATION' | 'DEBUG';
  objective: string;
  parameters: Record<string, unknown>;
  confidence: number;
}
