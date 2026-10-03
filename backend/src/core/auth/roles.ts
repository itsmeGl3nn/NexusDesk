export const Role = {
  ADMIN: "admin",
  SUPERVISOR: "supervisor",
  AGENT: "agent",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const PERMISSIONS = [
  "ticket:read", "ticket:create", "ticket:update", "ticket:delete",
  "call:read", "call:start", "call:update",
  "note:read", "note:create", "note:update", "note:delete",
  "audit:read", "audit:write", "user:read", "user:manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: PERMISSIONS,
  supervisor: PERMISSIONS.filter((permission) => permission !== "user:manage"),
  agent: ["ticket:read", "ticket:create", "ticket:update", "call:read", "call:start", "call:update",
    "note:read", "note:create", "note:update", "note:delete"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Permission sets per role — broader roles inherit narrower ones */
const ROLE_HIERARCHY: Record<Role, readonly Role[]> = {
  admin: ["admin", "supervisor", "agent"],
  supervisor: ["supervisor", "agent"],
  agent: ["agent"],
};

export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole]?.includes(requiredRole) ?? false;
}
