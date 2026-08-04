export interface CapabilityConstraints {
  maxContextTokens?: number;
  maxResolution?: string;
  estimatedCostPerToken?: number;
  estimatedCostPerSecond?: number;
}

export interface CapabilityDependencies {
  requiresFFmpeg?: boolean;
  requiresOpenCV?: boolean;
  requiredBinaries?: string[];
  requiredEnvVars?: string[];
}

export interface CapabilityManifest {
  id: string;
  name: string;
  version: string;
  type: 'INFERENCE' | 'TOOL' | 'PERCEPTION' | 'SYSTEM';
  constraints: CapabilityConstraints;
  dependencies: CapabilityDependencies;
}
