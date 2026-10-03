import { api } from './api';
import type { Ticket, CreateTicketInput, UpdateTicketInput, TicketFilters, Page } from '../types/ticket';

export function listTickets(filters: TicketFilters = {}, nextToken?: string): Promise<Page<Ticket>> {
  const query = new URLSearchParams();
  if (filters.status) query.set('status', filters.status);
  if (filters.assignedTo) query.set('assignedTo', filters.assignedTo);
  query.set('limit', '25');
  if (nextToken) query.set('nextToken', nextToken);
  return api.get<Page<Ticket>>(`/tickets?${query}`);
}

export function getTicket(ticketId: string): Promise<Ticket> {
  return api.get<Ticket>(`/ticket/${encodeURIComponent(ticketId)}`);
}

export function createTicket(input: CreateTicketInput): Promise<Ticket> {
  return api.post<Ticket>('/ticket', input);
}

export function updateTicket(ticketId: string, input: UpdateTicketInput): Promise<Ticket> {
  return api.put<Ticket>(`/ticket/${encodeURIComponent(ticketId)}`, input);
}

export function deleteTicket(ticketId: string): Promise<{ message: string }> {
  return api.delete(`/ticket/${encodeURIComponent(ticketId)}`);
}
