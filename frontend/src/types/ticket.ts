export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened';

export interface Ticket {
  ticketId: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  description: string;
  resolution?: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
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

export interface TicketFilters { status?: TicketStatus; assignedTo?: string; }
export interface Page<T> { items: T[]; nextToken: string | null; }


