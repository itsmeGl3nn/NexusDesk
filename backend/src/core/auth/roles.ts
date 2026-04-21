export const Role = {
  ADMIN: "admin",
  SUPERVISOR: "supervisor",
  AGENT: "agent",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

/** Permission sets per role — broader roles inherit narrower ones */
const ROLE_HIERARCHY: Record<Role, readonly Role[]> = {
  admin: ["admin", "supervisor", "agent"],
  supervisor: ["supervisor", "agent"],
  agent: ["agent"],
};

export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole]?.includes(requiredRole) ?? false;
}
