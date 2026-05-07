import { create } from 'zustand';
import type { Ticket } from '../types/ticket';

interface TicketState {
  tickets: Ticket[];
  selectedTicketId: string | null;
  selectTicket: (id: string | null) => void;
}

const mockTickets: Ticket[] = [
  { id: 'TICKET-1001', customer: 'John Smith', issue: 'Login issue', status: 'OPEN', createdAt: '2024-04-24T10:00:00Z' },
  { id: 'TICKET-1000', customer: 'Jane Doe', issue: 'Billing Inquiry', status: 'IN_PROGRESS', createdAt: '2024-04-24T09:30:00Z' },
  { id: 'TICKET-999', customer: 'Alice Brown', issue: 'Technical problem with dashboard', status: 'RESOLVED', createdAt: '2024-04-23T14:00:00Z' },
  { id: 'TICKET-998', customer: 'Bob Johnson', issue: 'Payment failure', status: 'OPEN', createdAt: '2024-04-23T11:00:00Z' },
  { id: 'TICKET-997', customer: 'Charlie Davis', issue: 'Question about subscription', status: 'RESOLVED', createdAt: '2024-04-22T16:00:00Z' },
  { id: 'TICKET-996', customer: 'Diana Wilson', issue: 'Account locked', status: 'OPEN', createdAt: '2024-04-22T09:00:00Z' },
  { id: 'TICKET-995', customer: 'Edward Lee', issue: 'Feature request', status: 'IN_PROGRESS', createdAt: '2024-04-21T13:00:00Z' },
  { id: 'TICKET-994', customer: 'Fiona Garcia', issue: 'Data export issue', status: 'RESOLVED', createdAt: '2024-04-21T08:00:00Z' },
];

export const useTicketStore = create<TicketState>((set) => ({
  tickets: mockTickets,
  selectedTicketId: 'TICKET-1001',
  selectTicket: (id) => set({ selectedTicketId: id }),
}));
