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
    assignedTo?: string;
    status: TicketStatus;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTicketInput {
    customerName: string;
    customerEmail: string;
    subject: string;
    description: string;
    assignedTo?: string;
}

export interface UpdateTicketInput {
    customerName?: string;
    customerEmail?: string;
    subject?: string;
    description?: string;
    resolution?: string;
    status?: TicketStatus;
    assignedTo?: string | null;
}

export interface ListTicketsInput {
    status?: TicketStatus;
    assignedTo?: string;
    limit: number;
    nextToken?: string;
}

export interface TicketPage {
    items: Ticket[];
    nextToken: string | null;
}

