import { api } from './api';
import type { Log, Note } from '../types/log';
import type { Page } from '../types/ticket';

function queryPath(path: string, ticketId?: string, nextToken?: string) {
  const query = new URLSearchParams({ limit: '25' });
  if (ticketId) query.set('ticketId', ticketId);
  if (nextToken) query.set('nextToken', nextToken);
  return `${path}?${query}`;
}
export const listNotes = (ticketId: string, nextToken?: string): Promise<Page<Note>> => api.get(queryPath('/notes', ticketId, nextToken));
export const createNote = (ticketId: string, content: string): Promise<Note> => api.post('/notes', { ticketId, content });
export const updateNote = (noteId: string, content: string): Promise<Note> => api.put(`/notes/${encodeURIComponent(noteId)}`, { content });
export const deleteNote = (noteId: string): Promise<{ message: string }> => api.delete(`/notes/${encodeURIComponent(noteId)}`);
export const listLogs = (nextToken?: string): Promise<Page<Log>> => api.get(queryPath('/logs', undefined, nextToken));
