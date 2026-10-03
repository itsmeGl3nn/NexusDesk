import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../../services/dynamodb";
import { config } from "../../utils/config";
import type { Tenant } from "./tenant.types";

export async function getTenant(tenantId: string): Promise<Tenant | undefined> {
  const result = await docClient.send(new GetCommand({
    TableName: config.tenantsTable, Key: { PK: `TENANT#${tenantId}`, SK: "META" }, ConsistentRead: true,
  }));
  return result.Item as Tenant | undefined;
}
