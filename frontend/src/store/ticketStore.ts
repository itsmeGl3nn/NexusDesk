import { create } from 'zustand';
import type { Ticket, CreateTicketInput } from '../types/ticket';
import * as ticketService from '../services/ticketService';

interface TicketState {
  tickets: Ticket[];
  selectedTicketId: string | null;
  isLoading: boolean;
  error: string | null;
  selectTicket: (id: string | null) => void;
  fetchTickets: () => Promise<void>;
  createTicket: (input: CreateTicketInput) => Promise<Ticket>;
}

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  selectedTicketId: null,
  isLoading: false,
  error: null,

  selectTicket: (id) => set({ selectedTicketId: id }),

  fetchTickets: async () => {
    set({ isLoading: true, error: null });
    try {
      const tickets = await ticketService.listTickets();
      set({ tickets, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tickets';
      set({ error: message, isLoading: false });
    }
  },

  createTicket: async (input) => {
    const ticket = await ticketService.createTicket(input);
    set({ tickets: [ticket, ...get().tickets] });
    return ticket;
  },
}));
