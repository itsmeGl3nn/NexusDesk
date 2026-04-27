import type { APIGatewayProxyResult } from "aws-lambda";
import { authorize, type AuthenticatedEvent } from "../../core/auth/authorize";
import { getTenantId } from "../../core/tenant/getTenant";
import * as ticketService from "./ticket.service";
import { TicketNotFoundError } from "./ticket.service";
import { TicketStatus } from "../../core/ticket/status";
import type { CreateTicketInput, UpdateTicketInput } from "./ticket.types";

const VALID_STATUSES: string[] = Object.values(TicketStatus);

function json(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

/** POST /tickets — Any authenticated user */
export const createTicket = authorize(async (event: AuthenticatedEvent) => {
  const tenantId = getTenantId(event);
  if (!event.body) return json(400, { message: "Request body is required" });

  let input: CreateTicketInput;
  try {
    input = JSON.parse(event.body);
  } catch {
    return json(400, { message: "Invalid JSON body" });
  }

  if (!input.customerName || !input.customerEmail || !input.subject || !input.description) {
    return json(400, {
      message: "customerName, customerEmail, subject, and description are required",
    });
  }

  const ticket = await ticketService.createTicket(tenantId, input);
  return json(201, ticket);
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
  if (!event.body) return json(400, { message: "Request body is required" });

  let input: UpdateTicketInput;
  try {
    input = JSON.parse(event.body);
  } catch {
    return json(400, { message: "Invalid JSON body" });
  }

  if (input.status !== undefined && !VALID_STATUSES.includes(input.status)) {
    return json(400, { message: `status must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  try {
    const updated = await ticketService.updateTicket(tenantId, ticketId, input);
    return json(200, updated);
  } catch (err: unknown) {
    if (err instanceof TicketNotFoundError) {
      return json(404, { message: "Ticket not found" });
    }
    if (err instanceof Error && err.name === "ConditionalCheckFailedException") {
      return json(404, { message: "Ticket not found" });
    }
    if (err instanceof Error && err.message.startsWith("Invalid ticket status transition")) {
      return json(409, { message: err.message });
    }
    throw err;
  }
});
