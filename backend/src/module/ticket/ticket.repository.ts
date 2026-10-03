import {
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
  type TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { docClient } from "../../services/dynamodb";
import { config } from "../../utils/config";
import type { Ticket, ListTicketsInput, TicketPage } from "./ticket.types";
import { ticketIdSchema, ticketStatusSchema, ValidationError } from "./ticket.schema";

type TransactionItem = NonNullable<TransactWriteCommandInput["TransactItems"]>[number];

export class TicketConflictError extends Error {
  constructor() {
    super("Ticket changed since it was read. Reload and try again.");
    this.name = "TicketConflictError";
  }
}

const cursorSchema = z.object({
  version: z.literal(1),
  tenantId: z.string().min(1),
  status: ticketStatusSchema.nullable(),
  assignedTo: z.string().nullable(),
  limit: z.number().int().min(1).max(100),
  key: z.object({ PK: z.string(), SK: z.string() }).strict(),
}).strict();

function cursorContext(tenantId: string, input: ListTicketsInput) {
  return { version: 1, tenantId, status: input.status ?? null, assignedTo: input.assignedTo ?? null, limit: input.limit };
}

function decodeCursor(tenantId: string, input: ListTicketsInput): { PK: string; SK: string } | undefined {
  if (!input.nextToken) return undefined;
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(input.nextToken)) throw new Error();
    const cursor = cursorSchema.parse(JSON.parse(Buffer.from(input.nextToken, "base64url").toString("utf8")));
    const context = cursorContext(tenantId, input);
    if (cursor.tenantId !== context.tenantId || cursor.status !== context.status ||
        cursor.assignedTo !== context.assignedTo || cursor.limit !== context.limit ||
        cursor.key.PK !== `TENANT#${tenantId}` || !cursor.key.SK.startsWith("TICKET#") ||
        !ticketIdSchema.safeParse(cursor.key.SK.slice(7)).success) throw new Error();
    return cursor.key;
  } catch {
    throw new ValidationError("Invalid nextToken for this tenant, filters, or limit");
  }
}

async function writeTransaction(items: TransactionItem[]): Promise<void> {
  try {
    await docClient.send(new TransactWriteCommand({ TransactItems: items }));
  } catch (error) {
    const reasons = (error as { CancellationReasons?: { Code?: string }[] } | null)?.CancellationReasons;
    if (error instanceof Error && (error.name === "ConditionalCheckFailedException" ||
        (error.name === "TransactionCanceledException" && reasons?.[0]?.Code === "ConditionalCheckFailed"))) {
      throw new TicketConflictError();
    }
    throw error;
  }
}

export async function putTicket(ticket: Ticket, audit: TransactionItem, previousUpdatedAt?: string): Promise<void> {
  await writeTransaction([{
    Put: {
      TableName: config.ticketsTable,
      Item: ticket,
      ConditionExpression: previousUpdatedAt === undefined ? "attribute_not_exists(SK)" : "attribute_exists(SK) AND #updatedAt = :previousUpdatedAt",
      ...(previousUpdatedAt !== undefined && {
        ExpressionAttributeNames: { "#updatedAt": "updatedAt" },
        ExpressionAttributeValues: { ":previousUpdatedAt": previousUpdatedAt },
      }),
    },
  }, audit]);
}

export async function getTicket(tenantId: string, ticketId: string): Promise<Ticket | undefined> {
  const result = await docClient.send(new GetCommand({
    TableName: config.ticketsTable,
    Key: { PK: `TENANT#${tenantId}`, SK: `TICKET#${ticketId}` },
    ConsistentRead: true,
  }));
  return result.Item as Ticket | undefined;
}

export async function hasActiveAssignee(tenantId: string, userId: string): Promise<boolean> {
  const result = await docClient.send(new GetCommand({
    TableName: config.usersTable,
    Key: { PK: `TENANT#${tenantId}`, SK: `USER#${userId}` },
    ConsistentRead: true,
  }));
  return result.Item?.tenantId === tenantId && result.Item?.status === "active";
}

export async function listTickets(tenantId: string, input: ListTicketsInput): Promise<TicketPage> {
  const exclusiveStartKey = decodeCursor(tenantId, input);
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = { ":pk": `TENANT#${tenantId}`, ":sk": "TICKET#" };
  const filters: string[] = [];
  if (input.status !== undefined) {
    names["#status"] = "status";
    values[":status"] = input.status;
    filters.push("#status = :status");
  }
  if (input.assignedTo !== undefined) {
    names["#assignedTo"] = "assignedTo";
    values[":assignedTo"] = input.assignedTo;
    filters.push("#assignedTo = :assignedTo");
  }
  const result = await docClient.send(new QueryCommand({
    TableName: config.ticketsTable,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: values,
    Limit: input.limit,
    ...(filters.length && { FilterExpression: filters.join(" AND "), ExpressionAttributeNames: names }),
    ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
  }));
  return {
    items: (result.Items ?? []) as Ticket[],
    nextToken: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify({ ...cursorContext(tenantId, input), key: result.LastEvaluatedKey })).toString("base64url")
      : null,
  };
}

export async function deleteTicket(ticket: Ticket, audit: TransactionItem): Promise<void> {
  await writeTransaction([{
    Delete: {
      TableName: config.ticketsTable,
      Key: { PK: ticket.PK, SK: ticket.SK },
      ConditionExpression: "attribute_exists(SK) AND #updatedAt = :previousUpdatedAt",
      ExpressionAttributeNames: { "#updatedAt": "updatedAt" },
      ExpressionAttributeValues: { ":previousUpdatedAt": ticket.updatedAt },
    },
  }, audit]);
}
