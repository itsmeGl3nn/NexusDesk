import type { APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { authorize, type AuthenticatedEvent } from "../../core/auth/authorize";
import type { Permission } from "../../core/auth/roles";
import { errorResponse, successResponse } from "../../utils/response";
import { auditWrite, createNote, deleteNote, listLogs, listNotes, listQuerySchema,
  noteCreateSchema, noteUpdateSchema, ResourceError, updateNote } from "./log.service";

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
function noteId(event: AuthenticatedEvent): string {
  return z.string().trim().min(1).max(128).parse(event.pathParameters?.id ?? event.pathParameters?.noteId);
}

export const createNoteHandler = route("note:create", async (event) =>
  successResponse(await createNote(event.auth, noteCreateSchema.parse(body(event))), 201));

export const listNotesHandler = route("note:read", async (event) =>
  successResponse(await listNotes(event.auth.tenantId, listQuerySchema.parse(event.queryStringParameters ?? {}))));

export const updateNoteHandler = route("note:update", async (event) => {
  const input = noteUpdateSchema.parse(body(event));
  return successResponse(await updateNote(event.auth, noteId(event), input.content));
});

export const deleteNoteHandler = route("note:delete", async (event) => {
  await deleteNote(event.auth, noteId(event));
  return successResponse({ message: "Note deleted" });
});

export const getLogsHandler = route("audit:read", async (event) =>
  successResponse(await listLogs(event.auth.tenantId, listQuerySchema.parse(event.queryStringParameters ?? {}))));

const auditSchema = z.object({
  action: z.string().trim().min(1).max(80).regex(/^[a-zA-Z][a-zA-Z0-9_.-]*$/),
  entityType: z.string().trim().min(1).max(64),
  entityId: z.string().trim().min(1).max(128),
  details: z.record(z.string(), z.unknown()).refine((value) => JSON.stringify(value).length <= 5000, "details exceed 5000 characters").optional(),
}).strict();

/** Manual events are labeled separately; actor and tenant always come from authentication. */
export const auditLogHandler = route("audit:write", async (event) => {
  const input = auditSchema.parse(body(event));
  const { details, ...fields } = input;
  return successResponse(await auditWrite({ ...fields, action: `manual.${input.action}`,
    tenantId: event.auth.tenantId, actorId: event.auth.sub,
    ...(details ? { details } : {}),
  }), 201);
});
