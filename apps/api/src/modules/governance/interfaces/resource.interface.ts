/**
 * First-class resource for scoped authorization: can(context, permission, resource).
 * ownerId/organizationId let AuthorizationService enforce "only your own"
 * or "only within your org" without every domain service reimplementing it.
 */
export interface Resource {
  type: string;
  id?: string;
  ownerId?: string;
  organizationId?: string;
}
