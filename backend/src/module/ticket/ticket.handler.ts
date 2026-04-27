import type { APIGatewayProxyResult } from "aws-lambda";
import { authorize, type AuthenticatedEvent } from "../../core/auth/authorize";
import { getTenantId } from "../../core/auth/getTenantId";
import * as ticketService from "./ticket.service";
import { TicketNotFoundError } from "./ticket.service";
import {
  parseCreateTicketInput,
  parseUpdateTicketInput,
  ValidationError,
} from "./ticket.schema";

function json(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function parseBody(event: AuthenticatedEvent): unknown {
  if (!event.body) throw new ValidationError("Request body is required");
  try {
    return JSON.parse(event.body);
  } catch {
    throw new ValidationError("Invalid JSON body");
  }
}

/** POST /tickets — Any authenticated user */
export const createTicket = authorize(async (event: AuthenticatedEvent) => {
  const tenantId = getTenantId(event);
  try {
    const input = parseCreateTicketInput(parseBody(event));
    const ticket = await ticketService.createTicket(tenantId, input);
    return json(201, ticket);
  } catch (err) {
    if (err instanceof ValidationError) return json(400, { message: err.message });
    throw err;
  }
});

/** GET /tickets — Any authenticated user */
export const listTickets = authorize(async (event: AuthenticatedEvent) => {
  const tenantId = getTenantId(event);
  const tickets = await ticketService.listTickets(tenantId);
  return json(200, tickets);
});

/** GET /tickets/{ticketId} — Any authenticated user */
export const getTicket = authorize(async (event: AuthenticatedEvent) => {
  const tenantId = getTenantId(event);
  const ticketId = event.pathParameters?.ticketId;
  if (!ticketId) return json(400, { message: "ticketId path parameter is required" });

  const ticket = await ticketService.getTicket(tenantId, ticketId);
  if (!ticket) return json(404, { message: "Ticket not found" });

  return json(200, ticket);
});

/** PATCH /tickets/{ticketId} — Any authenticated user */
export const updateTicket = authorize(async (event: AuthenticatedEvent) => {
  const tenantId = getTenantId(event);
  const ticketId = event.pathParameters?.ticketId;
  if (!ticketId) return json(400, { message: "ticketId path parameter is required" });

  try {
    const input = parseUpdateTicketInput(parseBody(event));
    const updated = await ticketService.updateTicket(tenantId, ticketId, input);
    return json(200, updated);
  } catch (err: unknown) {
    if (err instanceof ValidationError) return json(400, { message: err.message });
    if (err instanceof TicketNotFoundError) return json(404, { message: "Ticket not found" });
    if (err instanceof Error && err.name === "ConditionalCheckFailedException") {
      return json(404, { message: "Ticket not found" });
    }
    if (err instanceof Error && err.message.startsWith("Invalid ticket status transition")) {
      return json(409, { message: err.message });
    }
    throw err;
  }
});
