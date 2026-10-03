import { create } from 'zustand';
import type { Ticket, CreateTicketInput, UpdateTicketInput, TicketFilters } from '../types/ticket';
import * as ticketService from '../services/ticketService';

interface TicketState {
  tickets: Ticket[];
  selectedTicketId: string | null;
  isLoading: boolean;
  error: string | null;
  filters: TicketFilters;
  nextToken: string | null;
  reset: () => void;
  selectTicket: (id: string | null) => void;
  fetchTickets: (filters?: TicketFilters) => Promise<void>;
  loadMore: () => Promise<void>;
  createTicket: (input: CreateTicketInput) => Promise<Ticket>;
  updateTicket: (ticketId: string, input: UpdateTicketInput) => Promise<Ticket>;
  deleteTicket: (ticketId: string) => Promise<void>;
}

let generation = 0;
let listRequest = 0;
const matches = (ticket: Ticket, filters: TicketFilters) =>
  (!filters.status || ticket.status === filters.status) && (!filters.assignedTo || ticket.assignedTo === filters.assignedTo);
export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  selectedTicketId: null,
  isLoading: false,
  error: null,
  filters: {},
  nextToken: null,

  reset: () => { generation++; listRequest++; set({ tickets: [], selectedTicketId: null, isLoading: false, error: null, filters: {}, nextToken: null }); },
  selectTicket: (id) => set({ selectedTicketId: id }),

  fetchTickets: async (filters = {}) => {
    const requestGeneration = generation;
    const request = ++listRequest;
    set({ filters, nextToken: null, isLoading: true, error: null });
    try {
      const page = await ticketService.listTickets(filters);
      if (requestGeneration === generation && request === listRequest) set({ tickets: page.items, nextToken: page.nextToken, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tickets';
      if (requestGeneration === generation && request === listRequest) set({ error: message, isLoading: false });
    }
  },

  loadMore: async () => {
    const { filters, nextToken, isLoading } = get();
    if (!nextToken || isLoading) return;
    const requestGeneration = generation;
    const request = ++listRequest;
    set({ isLoading: true, error: null });
    try {
      const page = await ticketService.listTickets(filters, nextToken);
      if (requestGeneration === generation && request === listRequest) {
        const ids = new Set(get().tickets.map((ticket) => ticket.ticketId));
        set({ tickets: [...get().tickets, ...page.items.filter((ticket) => !ids.has(ticket.ticketId))], nextToken: page.nextToken, isLoading: false });
      }
    } catch (err) {
      if (requestGeneration === generation && request === listRequest) set({ error: err instanceof Error ? err.message : 'Failed to load more tickets', isLoading: false });
    }
  },

  createTicket: async (input) => {
    const requestGeneration = generation;
    const ticket = await ticketService.createTicket(input);
    if (requestGeneration !== generation) throw new Error("Session changed. Please sign in again.");
    if (matches(ticket, get().filters)) set({ tickets: [ticket, ...get().tickets] });
    return ticket;
  },

  updateTicket: async (ticketId, input) => {
    const requestGeneration = generation;
    const ticket = await ticketService.updateTicket(ticketId, input);
    if (requestGeneration !== generation) throw new Error('Session changed. Please sign in again.');
    set({ tickets: get().tickets.map((current) => current.ticketId === ticketId ? ticket : current) });
    return ticket;
  },

  deleteTicket: async (ticketId) => {
    const requestGeneration = generation;
    await ticketService.deleteTicket(ticketId);
    if (requestGeneration !== generation) throw new Error('Session changed. Please sign in again.');
    set({ tickets: get().tickets.filter((ticket) => ticket.ticketId !== ticketId), selectedTicketId: get().selectedTicketId === ticketId ? null : get().selectedTicketId });
  },
}));

