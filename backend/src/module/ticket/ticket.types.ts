import type { TicketStatus } from "./ticket.status";

export interface Ticket {
    PK: string;
    SK: string;
    ticketId: string;
    tenantId: string;
    customerName: string;
    customerEmail: string;
    subject: string;
    description: string;
    resolution?: string;
    status: TicketStatus;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTicketInput {
    customerName: string;
    customerEmail: string;
    subject: string;
    description: string;
}

export interface UpdateTicketInput {
    customerName?: string;
    customerEmail?: string;
    subject?: string;
    description?: string;
    resolution?: string;
    status?: TicketStatus;
}

