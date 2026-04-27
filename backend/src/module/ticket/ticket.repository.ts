import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Ticket } from "./ticket.types";

const client = new DynamoDBClient({
  ...(process.env.AWS_ENDPOINT && { endpoint: process.env.AWS_ENDPOINT }),
});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TICKETS_TABLE!;

export async function putTicket(ticket: Ticket): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: ticket,
      ConditionExpression: "attribute_not_exists(SK)",
    }),
  );
}

export async function getTicket(
  tenantId: string,
  ticketId: string,
): Promise<Ticket | undefined> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `TENANT#${tenantId}`, SK: `TICKET#${ticketId}` },
    }),
  );
  return result.Item as Ticket | undefined;
}

export async function listTickets(tenantId: string): Promise<Ticket[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `TENANT#${tenantId}`,
        ":sk": "TICKET#",
      },
    }),
  );
  return (result.Items ??[]) as Ticket[];
}

export async function updateTicket(
  tenantId: string,
  ticketId: string,
  updates: Partial<Omit<Ticket, "PK" | "SK" | "createdAt">>,
): Promise<Ticket> {
  const expressions: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
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
      Key: { PK: `TENANT#${tenantId}`, SK: `TICKET#${ticketId}` },
      UpdateExpression: `SET ${expressions.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: "attribute_exists(SK)",
      ReturnValues: "ALL_NEW",
    }),
  );
  return result.Attributes as Ticket;
}
