/**
 * Fine-grained permissions, organized by domain per the risk-tiered
 * taxonomy: coarse tool dispatch (USE_TOOL) is checked once at the
 * Executive layer; each individual tool then re-checks its own
 * domain-specific permission before running. This is defense in depth —
 * a misconfigured or bypassed Executive check does not, by itself, grant
 * a tool the ability to run.
 */
export enum Permission {
  // General
  READ_SELF = 'READ_SELF',
  WRITE_SELF = 'WRITE_SELF',

  // Memory
  READ_MEMORY = 'READ_MEMORY',
  WRITE_MEMORY = 'WRITE_MEMORY',
  READ_ALL_MEMORIES = 'READ_ALL_MEMORIES',
  DELETE_MEMORY = 'DELETE_MEMORY',

  // Files
  READ_FILES = 'READ_FILES',
  WRITE_FILES = 'WRITE_FILES',
  DELETE_FILES = 'DELETE_FILES',

  // Shell
  EXECUTE_SHELL = 'EXECUTE_SHELL',

  // SQL
  EXECUTE_SQL = 'EXECUTE_SQL',

  // Runtime
  RESTART_RUNTIME = 'RESTART_RUNTIME',
  STOP_RUNTIME = 'STOP_RUNTIME',
  DEPLOY = 'DEPLOY',

  // Users
  READ_USERS = 'READ_USERS',
  MANAGE_USERS = 'MANAGE_USERS',
  CHANGE_ROLE = 'CHANGE_ROLE',

  // System
  READ_SYSTEM = 'READ_SYSTEM',
  MANAGE_SYSTEM = 'MANAGE_SYSTEM',

  // Tool dispatch (coarse gate — Executive-level; individual tools
  // additionally enforce their own domain permission via ToolRouter)
  USE_TOOL = 'USE_TOOL',

  // Policy management
  MANAGE_POLICIES = 'MANAGE_POLICIES',
}
