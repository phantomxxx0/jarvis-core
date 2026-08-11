import { UserRole } from '@jarvis/database';
import { Permission } from '../enums/permission.enum';

/**
 * A Principal is whoever/whatever is making a request. Only USER is
 * implemented today; the type is shaped to add SERVICE_ACCOUNT/AGENT/
 * PLUGIN later without a breaking change.
 */
export type PrincipalType = 'USER';

export interface Principal {
  id: string;
  principalType: PrincipalType;
  role: UserRole;
  /** Computed fresh from ROLE_PERMISSIONS + PolicyEngine on every request. Never trust a cached/token-embedded copy. */
  permissions: Permission[];
  organizationId?: string;
  sessionId: string;
  authenticationMethod: 'JWT';
  authenticatedAt: Date;
  displayName?: string;
  preferredAddress?: string;
}
