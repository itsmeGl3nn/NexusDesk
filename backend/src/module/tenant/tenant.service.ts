import { randomUUID } from "node:crypto";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../../services/dynamodb";
import { config } from "../../utils/config";
import * as repo from "./tenant.repository";
import { userRecord } from "../user/user.service";
import { identityPut, userPut } from "../user/user.repository";
import { auditPut } from "../log/log.service";
import * as cognito from "../../core/auth/cognito";
import type { Tenant, RegisterTenantInput, RegisterTenantOutput } from "./tenant.types";

export async function registerTenant(input: RegisterTenantInput): Promise<RegisterTenantOutput> {
  const now = new Date().toISOString();
  const tenantId = randomUUID();
  const tenant: Tenant = {
    PK: `TENANT#${tenantId}`, SK: "META", tenantId, name: input.tenantName,
    status: "active", createdAt: now, updatedAt: now,
  };
  const sub = await cognito.adminCreateUser(input.adminEmail, input.adminPassword, tenantId, "admin");
  const adminUser = userRecord(tenantId, {
    email: input.adminEmail, firstName: input.adminFirstName, lastName: input.adminLastName, role: "admin",
  }, sub);
  try {
    await docClient.send(new TransactWriteCommand({ TransactItems: [
      { Put: { TableName: config.tenantsTable, Item: tenant, ConditionExpression: "attribute_not_exists(PK)" } },
      userPut(adminUser), identityPut(adminUser),
      auditPut({ tenantId, actorId: sub, action: "tenant.registered", entityType: "tenant", entityId: tenantId }),
      auditPut({ tenantId, actorId: sub, action: "user.created", entityType: "user", entityId: sub, details: { role: "admin" } }),
    ] }));
  } catch (error) {
    // ponytail: Cognito/DynamoDB cannot share a transaction; compensate failed profile writes.
    await cognito.rollbackUser(input.adminEmail);
    throw error;
  }
  return { tenant, adminUserId: adminUser.userId, adminEmail: adminUser.email };
}

export const getTenant = repo.getTenant;

