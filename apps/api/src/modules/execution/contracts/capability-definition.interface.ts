import type { Permission } from '../../governance/enums/permission.enum';

export interface CapabilityDefinition {
  id: string;
  version: string;
  description: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timeout: number; // in milliseconds
  estimatedCost: number; // e.g. token cost or compute credits
  concurrencyLimit: number;
  requiresApproval: boolean;
  supportsStreaming: boolean;
  supportsCancellation: boolean;

  /**
   * The Permission a caller must hold for this capability to be executed.
   * Optional: providers with no governance concern (e.g. inference,
   * embedding workers) simply omit this, and are never gated. Any
   * provider that DOES set this is checked via AuthorizationService.can()
   * by every execution path that dispatches through CapabilityRegistryService
   * — this is the single governance boundary for the capability-registry
   * execution model, mirroring ToolRouter's boundary for the V2 skills path.
   */
  requiredPermission?: Permission;
}
