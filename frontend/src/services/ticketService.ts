import { api } from './api';
import type { Ticket, CreateTicketInput, UpdateTicketInput } from '../types/ticket';

export function listTickets(): Promise<Ticket[]> {
  return api.get<Ticket[]>('/tickets');
}

export function getTicket(ticketId: string): Promise<Ticket> {
  return api.get<Ticket>(`/tickets/${encodeURIComponent(ticketId)}`);
}

export function createTicket(input: CreateTicketInput): Promise<Ticket> {
  return api.post<Ticket>('/tickets', input);
}

export function updateTicket(ticketId: string, input: UpdateTicketInput): Promise<Ticket> {
  return api.patch<Ticket>(`/tickets/${encodeURIComponent(ticketId)}`, input);
}
