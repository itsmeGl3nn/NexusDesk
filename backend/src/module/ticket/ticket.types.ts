import type { TicketStatus } from "../../core/ticket/status";

export interface Ticket {
    PK: string;
    SK: string;
    customerName: string;
    customerEmail: string;
    subject: string;
    description: string;
    status: TicketStatus;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTicketInput {
    customerName: string;
    customerEmail: string;
    subject: string;
    description: string;
    status: TicketStatus;
}

