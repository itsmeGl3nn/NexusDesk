import { randomUUID } from "node:crypto";
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  type TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import type { AuthenticatedEvent } from "../../core/auth/authorize";
import { docClient } from "../../services/dynamodb";
import { config } from "../../utils/config";
import type { Log, Note } from "../../types/log";

export type Actor = Pick<AuthenticatedEvent["auth"], "tenantId" | "sub" | "role">;
export interface AuditInput {
  tenantId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
}

export class ResourceError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = "ResourceError";
  }
}

type TransactionItem = NonNullable<TransactWriteCommandInput["TransactItems"]>[number];

/** Include this item in the same transaction as the mutation it records. */
export function auditPut(input: AuditInput): TransactionItem {
  const createdAt = new Date().toISOString();
  const logId = randomUUID();
  const item: Log = {
    PK: `TENANT#${input.tenantId}`,
    SK: `LOG#${createdAt}#${logId}`,
    logId,
    ...input,
    createdAt,
    ...(input.entityType === "ticket" ? { ticketId: input.entityId }
      : typeof input.details?.ticketId === "string" ? { ticketId: input.details.ticketId } : {}),
  };
  return {
    Put: {
      TableName: config.logsTable,
      Item: item,
      ConditionExpression: "attribute_not_exists(SK)",
    },
  };
}

export async function auditWrite(input: AuditInput): Promise<Log> {
  const operation = auditPut(input).Put!;
  await docClient.send(new PutCommand(operation));
  return operation.Item as Log;
}

export const listQuerySchema = z.object({
  ticketId: z.string().trim().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  nextToken: z.string().regex(/^[A-Za-z0-9_-]+$/).max(4096).optional(),
});
export type ListQuery = z.infer<typeof listQuerySchema>;
export interface ListPage<T> {
  items: T[];
  nextToken: string | null;
}

const cursorSchema = z.object({
  tenantId: z.string(),
  table: z.string(),
  prefix: z.string(),
  ticketId: z.string().nullable(),
  key: z.object({ PK: z.string(), SK: z.string() }).strict(),
}).strict();

export async function listRecords<T>(
  table: string,
  tenantId: string,
  prefix: string,
  query: ListQuery,
): Promise<ListPage<T>> {
  let cursor: { PK: string; SK: string } | undefined;
  if (query.nextToken) {
    try {
      const decoded = cursorSchema.parse(JSON.parse(Buffer.from(query.nextToken, "base64url").toString()));
      if (decoded.tenantId !== tenantId || decoded.table !== table || decoded.prefix !== prefix
        || decoded.ticketId !== (query.ticketId ?? null)
        || decoded.key.PK !== `TENANT#${tenantId}` || !decoded.key.SK.startsWith(prefix)) {
        throw new Error("Wrong cursor scope");
      }
      cursor = decoded.key;
    } catch {
      throw new ResourceError(400, "Invalid pagination token");
    }
  }
  const result = await docClient.send(new QueryCommand({
    TableName: table,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: {
      ":pk": `TENANT#${tenantId}`,
      ":prefix": prefix,
      ...(query.ticketId ? { ":ticketId": query.ticketId } : {}),
    },
    ...(query.ticketId ? { FilterExpression: "ticketId = :ticketId" } : {}),
    ...(cursor ? { ExclusiveStartKey: cursor } : {}),
    Limit: query.limit,
    ScanIndexForward: false,
    ConsistentRead: true,
  }));
  return {
    items: (result.Items ?? []) as T[],
    nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify({
      tenantId, table, prefix, ticketId: query.ticketId ?? null, key: result.LastEvaluatedKey,
    })).toString("base64url") : null,
  };
}

export function requireOwner(actor: Actor, ownerId: string): void {
  if (actor.role === "agent" && actor.sub !== ownerId) {
    throw new ResourceError(403, "Only the owner or a supervisor can change this record");
  }
}

export function ticketExists(tenantId: string, ticketId: string): TransactionItem {
  return { ConditionCheck: {
    TableName: config.ticketsTable,
    Key: { PK: `TENANT#${tenantId}`, SK: `TICKET#${ticketId}` },
    ConditionExpression: "attribute_exists(SK)",
  } };
}

export async function transact(items: TransactionItem[]): Promise<void> {
  try {
    await docClient.send(new TransactWriteCommand({ TransactItems: items }));
  } catch (error) {
    if (error instanceof Error && error.name === "TransactionCanceledException") {
      throw new ResourceError(409, "Record changed; reload and try again");
    }
    throw error;
  }
}

async function getNote(tenantId: string, noteId: string): Promise<Note> {
  const result = await docClient.send(new GetCommand({
    TableName: config.logsTable,
    Key: { PK: `TENANT#${tenantId}`, SK: `NOTE#${noteId}` },
    ConsistentRead: true,
  }));
  if (!result.Item) throw new ResourceError(404, "Note not found");
  return result.Item as Note;
}

export const noteCreateSchema = z.object({
  ticketId: z.string().trim().min(1).max(128),
  content: z.string().trim().min(1).max(5000),
}).strict();
export const noteUpdateSchema = noteCreateSchema.pick({ content: true });

export async function createNote(actor: Actor, input: z.infer<typeof noteCreateSchema>): Promise<Note> {
  // Read first for a useful 404; the transaction protects against later ticket deletion.
  const ticket = await docClient.send(new GetCommand({
    TableName: config.ticketsTable,
    Key: { PK: `TENANT#${actor.tenantId}`, SK: `TICKET#${input.ticketId}` },
    ConsistentRead: true,
  }));
  if (!ticket.Item) throw new ResourceError(404, "Ticket not found");
  const noteId = randomUUID();
  const now = new Date().toISOString();
  const note: Note = {
    PK: `TENANT#${actor.tenantId}`, SK: `NOTE#${noteId}`,
    noteId, tenantId: actor.tenantId, ticketId: input.ticketId,
    authorId: actor.sub, content: input.content,
    createdAt: now, updatedAt: now, version: 1,
  };
  await transact([
    ticketExists(actor.tenantId, input.ticketId),
    { Put: { TableName: config.logsTable, Item: note, ConditionExpression: "attribute_not_exists(SK)" } },
    auditPut({ tenantId: actor.tenantId, actorId: actor.sub, action: "note.created", entityType: "note", entityId: noteId,
      details: { ticketId: input.ticketId } }),
  ]);
  return note;
}

export async function updateNote(actor: Actor, noteId: string, content: string): Promise<Note> {
  const current = await getNote(actor.tenantId, noteId);
  requireOwner(actor, current.authorId);
  const note: Note = { ...current, content, updatedAt: new Date().toISOString(), version: current.version + 1 };
  await transact([
    { Put: { TableName: config.logsTable, Item: note, ConditionExpression: "attribute_exists(SK) AND #version = :version",
      ExpressionAttributeNames: { "#version": "version" }, ExpressionAttributeValues: { ":version": current.version } } },
    auditPut({ tenantId: actor.tenantId, actorId: actor.sub, action: "note.updated", entityType: "note", entityId: noteId,
      details: { ticketId: current.ticketId } }),
  ]);
  return note;
}

export async function deleteNote(actor: Actor, noteId: string): Promise<void> {
  const current = await getNote(actor.tenantId, noteId);
  requireOwner(actor, current.authorId);
  await transact([
    { Delete: { TableName: config.logsTable, Key: { PK: current.PK, SK: current.SK },
      ConditionExpression: "attribute_exists(SK) AND #version = :version",
      ExpressionAttributeNames: { "#version": "version" }, ExpressionAttributeValues: { ":version": current.version } } },
    auditPut({ tenantId: actor.tenantId, actorId: actor.sub, action: "note.deleted", entityType: "note", entityId: noteId,
      details: { ticketId: current.ticketId } }),
  ]);
}

export const listNotes = (tenantId: string, query: ListQuery) => listRecords<Note>(config.logsTable, tenantId, "NOTE#", query);
export const listLogs = (tenantId: string, query: ListQuery) => listRecords<Log>(config.logsTable, tenantId, "LOG#", query);
