export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface Ticket {
  id: string;
  customer: string;
  issue: string;
  status: TicketStatus;
  createdAt: string;
  notes?: string;
}


