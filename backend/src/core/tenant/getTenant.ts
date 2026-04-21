import type { AuthenticatedEvent } from "../auth/authorize";

/**
 * Extract the tenant ID from an authenticated event.
 * Throws if the tenant is missing (shouldn't happen after authorize middleware).
 */
export function getTenantId(event: AuthenticatedEvent): string {
  const tenantId = event.auth.tenantId;
  if (!tenantId) {
    throw new Error("Tenant ID is missing from the authenticated context");
  }
  return tenantId;
}
