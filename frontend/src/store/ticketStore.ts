import { create } from 'zustand';
import type { Ticket, CreateTicketInput } from '../types/ticket';
import * as ticketService from '../services/ticketService';

interface TicketState {
  tickets: Ticket[];
  selectedTicketId: string | null;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
  selectTicket: (id: string | null) => void;
  fetchTickets: () => Promise<void>;
  createTicket: (input: CreateTicketInput) => Promise<Ticket>;
}

let generation = 0;
export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  selectedTicketId: null,
  isLoading: false,
  error: null,

  reset: () => { generation++; set({ tickets: [], selectedTicketId: null, isLoading: false, error: null }); },
  selectTicket: (id) => set({ selectedTicketId: id }),

  fetchTickets: async () => {
    const requestGeneration = generation;
    set({ isLoading: true, error: null });
    try {
      const tickets = await ticketService.listTickets();
      if (requestGeneration === generation) set({ tickets, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tickets';
      if (requestGeneration === generation) set({ error: message, isLoading: false });
    }
  },

  createTicket: async (input) => {
    const requestGeneration = generation;
    const ticket = await ticketService.createTicket(input);
    if (requestGeneration !== generation) throw new Error("Session changed. Please sign in again.");
    set({ tickets: [ticket, ...get().tickets] });
    return ticket;
  },
}));

