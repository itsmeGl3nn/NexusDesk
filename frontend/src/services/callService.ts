import { api } from './api';
import type { Call } from '../types/call';
import type { Page } from '../types/ticket';

export function listCalls(ticketId?: string, nextToken?: string): Promise<Page<Call>> {
  const query = new URLSearchParams({ limit: '25' });
  if (ticketId) query.set('ticketId', ticketId);
  if (nextToken) query.set('nextToken', nextToken);
  return api.get(`/calls?${query}`);
}
export const startCall = (ticketId: string): Promise<Call> => api.post('/call', { ticketId });
export const endCall = (callId: string): Promise<Call> => api.put(`/call/${encodeURIComponent(callId)}`, { status: 'ended' });
