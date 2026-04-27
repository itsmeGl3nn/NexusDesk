import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { Tenant } from "./tenant.types";

const client = new DynamoDBClient({
  ...(process.env.AWS_ENDPOINT && { endpoint: process.env.AWS_ENDPOINT }),
});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TENANTS_TABLE!;

export async function putTenant(tenant: Tenant): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: tenant,
      ConditionExpression: "attribute_not_exists(PK)",
    })
  );
}

export async function getTenant(tenantId: string): Promise<Tenant | undefined> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `TENANT#${tenantId}`, SK: "META" },
    })
  );
  return result.Item as Tenant | undefined;
}
