import { v4 as uuidv4 } from "uuid";
import * as repo from "./tenant.repository";
import * as userService from "../user/user.service";
import * as cognito from "../../core/auth/cognito";
import { Role } from "../../core/auth/roles";
import type { Tenant, RegisterTenantInput, RegisterTenantOutput } from "./tenant.types";

/**
 * Register a new tenant and provision its initial admin user.
 *
 * Order of operations:
 *   1. Persist Tenant record (idempotent guard via condition expression).
 *   2. Create Cognito admin user (verified, permanent password, in `admin` group).
 *   3. Persist User record in DynamoDB.
 *
 * Note: this is best-effort. A failure between steps 2 and 3 leaves a Cognito
 * user without a profile row; reconciliation can be added later if needed.
 */
export async function registerTenant(
  input: RegisterTenantInput
): Promise<RegisterTenantOutput> {
  const now = new Date().toISOString();
  const tenantId = uuidv4();

  const tenant: Tenant = {
    PK: `TENANT#${tenantId}`,
    SK: "META",
    tenantId,
    name: input.tenantName,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  await repo.putTenant(tenant);

  await cognito.adminCreateUser(
    input.adminEmail,
    input.adminPassword,
    tenantId,
    "admin"
  );

  const adminUser = await userService.createUser(tenantId, {
    email: input.adminEmail,
    firstName: input.adminFirstName,
    lastName: input.adminLastName,
    role: Role.ADMIN,
  });

  return {
    tenant,
    adminUserId: adminUser.userId,
    adminEmail: adminUser.email,
  };
}

export async function getTenant(tenantId: string): Promise<Tenant | undefined> {
  return repo.getTenant(tenantId);
}
