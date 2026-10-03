import { GetCommand, QueryCommand, TransactWriteCommand, type TransactWriteCommandInput } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../../services/dynamodb";
import { config } from "../../utils/config";
import { auditPut } from "../log/log.service";
import type { User } from "./user.types";

type WriteItem = NonNullable<TransactWriteCommandInput["TransactItems"]>[number];
interface Identity { tenantId: string; userId: string }

export function userPut(user: User): WriteItem {
  return { Put: { TableName: config.usersTable, Item: user, ConditionExpression: "attribute_not_exists(SK)" } };
}

export function identityPut(user: User): WriteItem {
  return { Put: {
    TableName: config.usersTable,
    Item: { PK: `COGNITO#${user.cognitoSub}`, SK: "IDENTITY", tenantId: user.tenantId, userId: user.userId },
    ConditionExpression: "attribute_not_exists(PK)",
  } };
}

export async function putUser(user: User, actorId: string): Promise<void> {
  await docClient.send(new TransactWriteCommand({ TransactItems: [
    userPut(user), identityPut(user),
    auditPut({ tenantId: user.tenantId, actorId, action: "user.created", entityType: "user", entityId: user.userId, details: { role: user.role } }),
  ] }));
}

export async function getUser(tenantId: string, userId: string): Promise<User | undefined> {
  const result = await docClient.send(new GetCommand({
    TableName: config.usersTable, Key: { PK: `TENANT#${tenantId}`, SK: `USER#${userId}` }, ConsistentRead: true,
  }));
  return result.Item as User | undefined;
}

async function getIdentity(sub: string): Promise<Identity | undefined> {
  const result = await docClient.send(new GetCommand({
    TableName: config.usersTable, Key: { PK: `COGNITO#${sub}`, SK: "IDENTITY" }, ConsistentRead: true,
  }));
  return result.Item as Identity | undefined;
}

export async function getBoundProfile(sub: string): Promise<User | undefined> {
  const identity = await getIdentity(sub);
  return identity ? getUser(identity.tenantId, identity.userId) : undefined;
}

/** Stored identity binding owns tenancy; Cognito attributes only locate legacy profiles. */
export async function getAuthenticatedProfile(sub: string, email: string, claimedTenant: string | undefined, verifiedEmail: boolean): Promise<User | undefined> {
  const identity = await getIdentity(sub);
  if (identity) return getUser(identity.tenantId, identity.userId);
  if (!claimedTenant || !email) return undefined;
  let profile = await getUser(claimedTenant, sub);
  if (!profile && verifiedEmail) {
    // Existing demo profiles used random IDs. Link one verified, same-tenant email once.
    const matches = (await listUsers(claimedTenant)).filter((user) => user.email.toLowerCase() === email.toLowerCase() && !user.cognitoSub);
    if (matches.length === 1) profile = matches[0];
  }
  if (!profile || profile.email.toLowerCase() !== email.toLowerCase() || (profile.cognitoSub && profile.cognitoSub !== sub)) return undefined;
  const linked = { ...profile, cognitoSub: sub };
  try {
    await docClient.send(new TransactWriteCommand({ TransactItems: [
      identityPut(linked),
      { Update: {
        TableName: config.usersTable, Key: { PK: profile.PK, SK: profile.SK },
        UpdateExpression: "SET cognitoSub = :sub",
        ConditionExpression: "attribute_exists(SK) AND (attribute_not_exists(cognitoSub) OR cognitoSub = :sub)",
        ExpressionAttributeValues: { ":sub": sub },
      } },
      auditPut({ tenantId: profile.tenantId, actorId: sub, action: "user.identity.linked", entityType: "user", entityId: profile.userId }),
    ] }));
    return linked;
  } catch (error) {
    if (error instanceof Error && error.name === "TransactionCanceledException") return getBoundProfile(sub);
    throw error;
  }
}

export async function listUsers(tenantId: string): Promise<User[]> {
  const users: User[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const result = await docClient.send(new QueryCommand({
      TableName: config.usersTable,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": `TENANT#${tenantId}`, ":sk": "USER#" },
      ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
      ConsistentRead: true,
    }));
    users.push(...(result.Items ?? []) as User[]);
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return users;
}

export async function updateUser(tenantId: string, userId: string, fields: Partial<Pick<User, "firstName" | "lastName" | "role" | "status">>, actorId: string): Promise<User> {
  const expressions: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    expressions.push(`#${key} = :${key}`);
    names[`#${key}`] = key;
    values[`:${key}`] = value;
  }
  expressions.push("#updatedAt = :updatedAt");
  names["#updatedAt"] = "updatedAt";
  values[":updatedAt"] = new Date().toISOString();
  await docClient.send(new TransactWriteCommand({ TransactItems: [
    { Update: {
      TableName: config.usersTable, Key: { PK: `TENANT#${tenantId}`, SK: `USER#${userId}` },
      UpdateExpression: `SET ${expressions.join(", ")}`,
      ExpressionAttributeNames: names, ExpressionAttributeValues: values,
      ConditionExpression: "attribute_exists(SK)",
    } },
    auditPut({ tenantId, actorId, action: "user.updated", entityType: "user", entityId: userId, details: { ...fields } }),
  ] }));
  return (await getUser(tenantId, userId))!;
}
