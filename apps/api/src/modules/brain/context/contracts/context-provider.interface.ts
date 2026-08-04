export interface ContextSection {
  source: string;
  title: string;
  content: string;
  hasData: boolean;
  priority: number;
}

export interface ContextBundle {
  text: string;
  sections: ContextSection[];
  retrievedAt: Date;
}

export interface ContextProvider {
  readonly name: string;
  readonly defaultTimeoutMs: number;

  isHealthy(): boolean | Promise<boolean>;
  buildContext(query: string, userId?: string): Promise<ContextSection>;
}

export const CONTEXT_PROVIDERS = 'CONTEXT_PROVIDERS';
