import type { APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { authorize, type AuthenticatedEvent } from "../../core/auth/authorize";
import type { Permission } from "../../core/auth/roles";
import { errorResponse, successResponse } from "../../utils/response";
import { listQuerySchema, ResourceError } from "../log/log.service";
import { endCall, listCalls, startCall, startCallSchema, updateCallSchema } from "./call.service";

function route(permission: Permission, handler: (event: AuthenticatedEvent) => Promise<APIGatewayProxyResult>) {
  return authorize(async (event) => {
    try { return await handler(event); }
    catch (error) {
      if (error instanceof ResourceError) return errorResponse(error.statusCode, error.message);
      if (error instanceof z.ZodError) return errorResponse(400, error.issues.map((issue) => `${issue.path.join(".") || "request"}: ${issue.message}`).join("; "));
      if (error instanceof SyntaxError) return errorResponse(400, "Invalid JSON body");
      throw error;
    }
  }, permission);
}

function body(event: AuthenticatedEvent): unknown {
  if (!event.body) throw new ResourceError(400, "Request body is required");
  return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body);
}

/** This persists a simulated call only; it does not contact Amazon Connect or a customer. */
export const startCallHandler = route("call:start", async (event) => {
  const input = startCallSchema.parse(body(event));
  return successResponse(await startCall(event.auth, input.ticketId), 201);
});

export const listCallsHandler = route("call:read", async (event) =>
  successResponse(await listCalls(event.auth.tenantId, listQuerySchema.parse(event.queryStringParameters ?? {}))));

export const updateCallHandler = route("call:update", async (event) => {
  updateCallSchema.parse(body(event));
  const id = z.string().trim().min(1).max(128).parse(event.pathParameters?.id ?? event.pathParameters?.callId);
  return successResponse(await endCall(event.auth, id));
});
