export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened';

export interface Ticket {
  ticketId: string;
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
}

export interface UpdateTicketInput {
  customerName?: string;
  customerEmail?: string;
  subject?: string;
  description?: string;
  status?: TicketStatus;
}


