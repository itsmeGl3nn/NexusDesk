import { randomUUID } from "node:crypto";
import type { Role } from "../../core/auth/roles";
import { logger } from "../../utils/logger";
import { auditPut } from "../log/log.service";
import * as repo from "./ticket.repository";
import { TicketStatus, assertTransition } from "./ticket.status";
import { ValidationError } from "./ticket.schema";
import type { Ticket, CreateTicketInput, ListTicketsInput, TicketPage, UpdateTicketInput } from "./ticket.types";
import { indexResolvedTicket } from "./ticket.ai";

export { TicketConflictError } from "./ticket.repository";

export class TicketNotFoundError extends Error {
  constructor() {
    super("Ticket not found");
    this.name = "TicketNotFoundError";
  }
}

export class AssignmentPermissionError extends Error {
  constructor() {
    super("Agents can only assign tickets to themselves or unassign their own tickets");
    this.name = "AssignmentPermissionError";
  }
}

async function validateAssignment(tenantId: string, assignedTo: string | null | undefined, actorId: string, role: Role, previousAssignedTo?: string): Promise<void> {
  if (assignedTo === undefined) return;
  if (role === "agent" && (assignedTo !== null ? assignedTo !== actorId : Boolean(previousAssignedTo && previousAssignedTo !== actorId))) {
    throw new AssignmentPermissionError();
  }
  if (assignedTo !== null && !await repo.hasActiveAssignee(tenantId, assignedTo)) {
    throw new ValidationError("assignedTo must identify an active user in this tenant");
  }
}

export async function createTicket(tenantId: string, input: CreateTicketInput, actorId: string, role: Role): Promise<Ticket> {
  await validateAssignment(tenantId, input.assignedTo, actorId, role);
  const now = new Date().toISOString();
  const ticketId = randomUUID();
  const ticket: Ticket = {
    PK: `TENANT#${tenantId}`,
    SK: `TICKET#${ticketId}`,
    ticketId,
    tenantId,
    ...input,
    status: TicketStatus.OPEN,
    createdAt: now,
    updatedAt: now,
  };
  await repo.putTicket(ticket, auditPut({
    tenantId, actorId, action: "ticket.created", entityType: "ticket", entityId: ticketId,
    details: { status: ticket.status, assignedTo: ticket.assignedTo ?? null },
  }));
  return ticket;
}

export async function getTicket(tenantId: string, ticketId: string): Promise<Ticket | undefined> {
  return repo.getTicket(tenantId, ticketId);
}

export async function listTickets(tenantId: string, input: ListTicketsInput): Promise<TicketPage> {
  return repo.listTickets(tenantId, input);
}

export async function updateTicket(tenantId: string, ticketId: string, input: UpdateTicketInput, actorId: string, role: Role): Promise<Ticket> {
  const current = await repo.getTicket(tenantId, ticketId);
  if (!current) throw new TicketNotFoundError();
  await validateAssignment(tenantId, input.assignedTo, actorId, role, current.assignedTo);
  if (input.status !== undefined) assertTransition(current.status, input.status);
  const { assignedTo, ...fields } = input;
  const ticket: Ticket = {
    ...current,
    ...fields,
    updatedAt: new Date(Math.max(Date.now(), Date.parse(current.updatedAt) + 1)).toISOString(),
  };
  if (assignedTo === null) delete ticket.assignedTo;
  else if (assignedTo !== undefined) ticket.assignedTo = assignedTo;

  await repo.putTicket(ticket, auditPut({
    tenantId, actorId, action: "ticket.updated", entityType: "ticket", entityId: ticketId,
    details: { fields: Object.keys(input), previousStatus: current.status, status: ticket.status },
  }), current.updatedAt);

  if (input.status === TicketStatus.RESOLVED && current.status !== TicketStatus.RESOLVED) {
    try {
      await indexResolvedTicket(ticket);
    } catch (error) {
      logger.error("Failed to index resolved ticket", { tenantId, ticketId, error });
    }
  }
  return ticket;
}

export async function deleteTicket(tenantId: string, ticketId: string, actorId: string): Promise<void> {
  const ticket = await repo.getTicket(tenantId, ticketId);
  if (!ticket) throw new TicketNotFoundError();
  await repo.deleteTicket(ticket, auditPut({
    tenantId, actorId, action: "ticket.deleted", entityType: "ticket", entityId: ticketId,
  }));
}
