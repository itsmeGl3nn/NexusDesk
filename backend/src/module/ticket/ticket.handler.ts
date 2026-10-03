import type { APIGatewayProxyResult } from "aws-lambda";
import { authorize, type AuthenticatedEvent } from "../../core/auth/authorize";
import { getTenantId } from "../../core/auth/getTenantId";
import { successResponse, errorResponse } from "../../utils/response";
import * as ticketService from "./ticket.service";
import {
  parseCreateTicketInput, parseUpdateTicketInput, parseListTicketsInput,
  parseInput, ticketIdSchema, ValidationError,
} from "./ticket.schema";

function parseBody(event: AuthenticatedEvent): unknown {
  if (!event.body) throw new ValidationError("Request body is required");
  try {
    return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body);
  } catch {
    throw new ValidationError("Invalid JSON body");
  }
}

function parseTicketId(event: AuthenticatedEvent): string {
  return parseInput(ticketIdSchema, event.pathParameters?.id ?? event.pathParameters?.ticketId);
}

async function handleTicketRequest(action: () => Promise<APIGatewayProxyResult>): Promise<APIGatewayProxyResult> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ValidationError) return errorResponse(400, error.message);
    if (error instanceof ticketService.TicketNotFoundError) return errorResponse(404, error.message);
    if (error instanceof ticketService.TicketConflictError) return errorResponse(409, error.message);
    if (error instanceof ticketService.AssignmentPermissionError) return errorResponse(403, error.message);
    if (error instanceof Error && error.message.startsWith("Invalid ticket status transition")) {
      return errorResponse(409, error.message);
    }
    throw error;
  }
}

/** POST /ticket */
export const createTicketHandler = authorize((event: AuthenticatedEvent) => handleTicketRequest(async () => {
  const ticket = await ticketService.createTicket(getTenantId(event), parseCreateTicketInput(parseBody(event)), event.auth.sub, event.auth.role);
  return successResponse(ticket, 201);
}), "ticket:create");

/** GET /tickets */
export const getTicketsHandler = authorize((event: AuthenticatedEvent) => handleTicketRequest(async () => {
  const input = parseListTicketsInput(event.queryStringParameters ?? {});
  return successResponse(await ticketService.listTickets(getTenantId(event), input));
}), "ticket:read");

/** GET /ticket/{id} */
export const getTicketHandler = authorize((event: AuthenticatedEvent) => handleTicketRequest(async () => {
  const ticket = await ticketService.getTicket(getTenantId(event), parseTicketId(event));
  return ticket ? successResponse(ticket) : errorResponse(404, "Ticket not found");
}), "ticket:read");

/** PUT /ticket/{id} */
export const updateTicketHandler = authorize((event: AuthenticatedEvent) => handleTicketRequest(async () => {
  const ticket = await ticketService.updateTicket(getTenantId(event), parseTicketId(event), parseUpdateTicketInput(parseBody(event)), event.auth.sub, event.auth.role);
  return successResponse(ticket);
}), "ticket:update");

/** DELETE /ticket/{id} */
export const deleteTicketHandler = authorize((event: AuthenticatedEvent) => handleTicketRequest(async () => {
  await ticketService.deleteTicket(getTenantId(event), parseTicketId(event), event.auth.sub);
  return successResponse({ message: "Ticket deleted" });
}), "ticket:delete");

// Keep deployed legacy route handlers working while clients migrate.
export const createTicket = createTicketHandler;
export const listTickets = getTicketsHandler;
export const getTicket = getTicketHandler;
export const updateTicket = updateTicketHandler;
