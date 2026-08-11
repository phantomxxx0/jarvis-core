import { UserRole } from '@jarvis/database';
import { Permission } from './permission.enum';

/**
 * Static baseline permission set per role. AuthorizationService may
 * further NARROW this via PolicyEngine — it must never be widened
 * anywhere else in the codebase. This map is the ceiling, not the floor.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [
    Permission.READ_SELF,
    Permission.WRITE_SELF,
    Permission.READ_MEMORY,
    Permission.WRITE_MEMORY,
  ],

  [UserRole.ADMIN]: [
    Permission.READ_SELF,
    Permission.WRITE_SELF,
    Permission.READ_MEMORY,
    Permission.WRITE_MEMORY,
    Permission.READ_USERS,
    Permission.MANAGE_USERS,
    Permission.READ_FILES,
    Permission.WRITE_FILES,
    Permission.EXECUTE_SHELL,
    Permission.READ_SYSTEM,
    Permission.USE_TOOL,
    // Deliberately withheld from ADMIN: EXECUTE_SQL, RESTART_RUNTIME,
    // STOP_RUNTIME, DEPLOY, DELETE_FILES, DELETE_MEMORY,
    // READ_ALL_MEMORIES, CHANGE_ROLE, MANAGE_SYSTEM, MANAGE_POLICIES.
  ],

  [UserRole.SUPER_ADMIN]: Object.values(Permission),
};
