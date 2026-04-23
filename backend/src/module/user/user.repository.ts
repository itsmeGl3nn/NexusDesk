import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { User } from "./user.types";

const client = new DynamoDBClient({
  ...(process.env.AWS_ENDPOINT && { endpoint: process.env.AWS_ENDPOINT }),
});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.USERS_TABLE!;

export async function putUser(user: User): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: user,
      ConditionExpression: "attribute_not_exists(SK)",
    })
  );
}

export async function getUser(tenantId: string, userId: string): Promise<User | undefined> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `TENANT#${tenantId}`, SK: `USER#${userId}` },
    })
  );
  return result.Item as User | undefined;
}

export async function listUsers(tenantId: string): Promise<User[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `TENANT#${tenantId}`,
        ":sk": "USER#",
      },
    })
  );
  return (result.Items ?? []) as User[];
}

export async function updateUser(
  tenantId: string,
  userId: string,
  fields: Partial<Pick<User, "displayName" | "role" | "status">>
): Promise<User> {
  const expressions: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const attr = `#${key}`;
    const val = `:${key}`;
    expressions.push(`${attr} = ${val}`);
    names[attr] = key;
    values[val] = value;
  }

  expressions.push("#updatedAt = :updatedAt");
  names["#updatedAt"] = "updatedAt";
  values[":updatedAt"] = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `TENANT#${tenantId}`, SK: `USER#${userId}` },
      UpdateExpression: `SET ${expressions.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: "attribute_exists(SK)",
      ReturnValues: "ALL_NEW",
    })
  );
  return result.Attributes as User;
}
