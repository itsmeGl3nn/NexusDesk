import type { RegisterTenantInput } from "./tenant.types";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}

/** Validate and normalize the public tenant-registration payload. */
export function parseRegisterTenantInput(raw: unknown): RegisterTenantInput {
  if (!raw || typeof raw !== "object") {
    throw new ValidationError("Request body must be a JSON object");
  }
  const r = raw as Record<string, unknown>;
  return {
    tenantName: requireString(r.tenantName, "tenantName"),
    adminEmail: requireString(r.adminEmail, "adminEmail"),
    adminPassword: requireString(r.adminPassword, "adminPassword"),
    adminFirstName: requireString(r.adminFirstName, "adminFirstName"),
    adminLastName: requireString(r.adminLastName, "adminLastName"),
  };
}
