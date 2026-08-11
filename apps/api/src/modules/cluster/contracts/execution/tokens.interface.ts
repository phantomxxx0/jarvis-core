export interface ExecutionToken {
  iss: string; // issuer
  sub: string; // subject (worker id)
  aud: string; // audience (cluster id)
  exp: number; // expiration
  iat: number; // issued at
  capabilities: string[];
}

export interface AbortToken {
  taskId: string;
  reason: string;
}

export interface ArtifactRefs {
  claimCheckIds: string[];
}
