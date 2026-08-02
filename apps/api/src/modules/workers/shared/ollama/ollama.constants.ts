export const OLLAMA_CONSTANTS = {
  DEFAULT_HOST: 'http://localhost:11434',
  DEFAULT_TIMEOUT_MS: 60000,
  API_VERSION: 'api',
  ENDPOINTS: {
    CHAT: '/api/chat',
    GENERATE: '/api/generate',
    EMBEDDINGS: '/api/embeddings',
    EMBED: '/api/embed',
    TAGS: '/api/tags',
  },
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },
} as const;
