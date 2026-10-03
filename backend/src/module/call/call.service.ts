import { randomUUID } from "node:crypto";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { docClient } from "../../services/dynamodb";
import { config } from "../../utils/config";
import type { Call } from "../../types/call";
import { auditPut, listRecords, requireOwner, ResourceError, ticketExists, transact,
  type Actor, type ListQuery } from "../log/log.service";

export const startCallSchema = z.object({ ticketId: z.string().trim().min(1).max(128) }).strict();
export const updateCallSchema = z.object({ status: z.literal("ended") }).strict();

export async function startCall(actor: Actor, ticketId: string): Promise<Call> {
  const result = await docClient.send(new GetCommand({
    TableName: config.ticketsTable,
    Key: { PK: `TENANT#${actor.tenantId}`, SK: `TICKET#${ticketId}` },
    ConsistentRead: true,
  }));
  if (!result.Item) throw new ResourceError(404, "Ticket not found");
  const callId = randomUUID();
  const call: Call = {
    PK: `TENANT#${actor.tenantId}`, SK: `CALL#${callId}`,
    callId, tenantId: actor.tenantId, ticketId, agentId: actor.sub,
    customerName: result.Item.customerName as string,
    customerEmail: result.Item.customerEmail as string,
    status: "active", simulated: true, startedAt: new Date().toISOString(),
  };
  await transact([
    ticketExists(actor.tenantId, ticketId),
    { Put: { TableName: config.callsTable, Item: call, ConditionExpression: "attribute_not_exists(SK)" } },
    auditPut({ tenantId: actor.tenantId, actorId: actor.sub, action: "call.started", entityType: "call", entityId: callId,
      details: { ticketId, simulated: true } }),
  ]);
  return call;
}

export async function endCall(actor: Actor, callId: string): Promise<Call> {
  const result = await docClient.send(new GetCommand({
    TableName: config.callsTable,
    Key: { PK: `TENANT#${actor.tenantId}`, SK: `CALL#${callId}` },
    ConsistentRead: true,
  }));
  if (!result.Item) throw new ResourceError(404, "Call not found");
  const current = result.Item as Call;
  requireOwner(actor, current.agentId);
  if (current.status !== "active") throw new ResourceError(409, "Call has already ended");
  const endedAt = new Date().toISOString();
  const call: Call = {
    ...current, status: "ended", endedAt,
    durationSeconds: Math.max(0, Math.floor((Date.parse(endedAt) - Date.parse(current.startedAt)) / 1000)),
  };
  await transact([
    { Put: { TableName: config.callsTable, Item: call, ConditionExpression: "attribute_exists(SK) AND #status = :active",
      ExpressionAttributeNames: { "#status": "status" }, ExpressionAttributeValues: { ":active": "active" } } },
    auditPut({ tenantId: actor.tenantId, actorId: actor.sub, action: "call.ended", entityType: "call", entityId: callId,
      details: { ticketId: call.ticketId, durationSeconds: call.durationSeconds } }),
  ]);
  return call;
}

export const listCalls = (tenantId: string, query: ListQuery) => listRecords<Call>(config.callsTable, tenantId, "CALL#", query);
