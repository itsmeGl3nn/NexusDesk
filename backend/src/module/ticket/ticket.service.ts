import { v4 as uuidv4 } from "uuid";
import * as repo from "./ticket.repository";
import { TicketStatus, assertTransition } from "./ticket.status";
import type { Ticket, CreateTicketInput, UpdateTicketInput } from "./ticket.types";

export class TicketNotFoundError extends Error {
  constructor() {
    super("Ticket not found");
    this.name = "TicketNotFoundError";
  }
}

export async function createTicket(
  tenantId: string,
  input: CreateTicketInput,
): Promise<Ticket> {
  const now = new Date().toISOString();
  const ticketId = uuidv4();

  const ticket: Ticket = {
    PK: `TENANT#${tenantId}`,
    SK: `TICKET#${ticketId}`,
    ticketId,
    tenantId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    subject: input.subject,
    description: input.description,
    status: TicketStatus.OPEN,
    createdAt: now,
    updatedAt: now,
  };

  await repo.putTicket(ticket);
  return ticket;
}

export async function getTicket(
  tenantId: string,
  ticketId: string,
): Promise<Ticket | undefined> {
  return repo.getTicket(tenantId, ticketId);
}

export async function listTickets(tenantId: string): Promise<Ticket[]> {
  return repo.listTickets(tenantId);
}

export async function updateTicket(
  tenantId: string,
  ticketId: string,
  input: UpdateTicketInput,
): Promise<Ticket> {
  if (input.status !== undefined) {
    const current = await repo.getTicket(tenantId, ticketId);
    if (!current) throw new TicketNotFoundError();
    assertTransition(current.status, input.status);
  }

  return repo.updateTicket(tenantId, ticketId, input);
}
