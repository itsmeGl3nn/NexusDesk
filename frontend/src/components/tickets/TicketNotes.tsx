import { useEffect, useState } from 'react';
import * as service from '../../services/logService';
import { useAuthStore } from '../../store/authStore';
import type { Note } from '../../types/log';

export default function TicketNotes({ ticketId }: { ticketId: string }) {
  const user = useAuthStore((s) => s.user);
  const [notes, setNotes] = useState<Note[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    service.listNotes(ticketId).then((page) => {
      if (current) { setNotes(page.items); setNextToken(page.nextToken); }
    }).catch((err) => { if (current) setError(err instanceof Error ? err.message : 'Cannot load notes.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [ticketId]);
  const load = async (more = false) => {
    setBusy(true); setError('');
    try {
      const page = await service.listNotes(ticketId, more && nextToken ? nextToken : undefined);
      setNotes((current) => more ? [...current, ...page.items.filter((note) => !current.some((item) => item.noteId === note.noteId))] : page.items);
      setNextToken(page.nextToken);
    } catch (err) { setError(err instanceof Error ? err.message : 'Cannot load notes.'); }
    finally { setBusy(false); }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;
    setBusy(true); setError('');
    try {
      const note = editing ? await service.updateNote(editing, content.trim()) : await service.createNote(ticketId, content.trim());
      setNotes((current) => editing ? current.map((item) => item.noteId === note.noteId ? note : item) : [note, ...current]);
      setContent(''); setEditing(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Cannot save note.'); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    setBusy(true); setError('');
    try {
      await service.deleteNote(id);
      setNotes((current) => current.filter((note) => note.noteId !== id));
      if (editing === id) { setEditing(null); setContent(''); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Cannot delete note.'); }
    finally { setBusy(false); }
  };
  return <section className="border-t border-gray-200 p-5 space-y-3">
    <h3 className="font-semibold">Ticket notes</h3>
    {loading && <p role="status" className="text-sm">Loading notes…</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error} <button disabled={busy} onClick={() => void load()} className="underline">Retry</button></p>}
    <form onSubmit={save} className="space-y-2">
      <label htmlFor="note-content" className="block text-sm">{editing ? 'Edit note' : 'New note'}</label>
      <textarea id="note-content" required maxLength={5000} disabled={busy || loading} value={content} onChange={(event) => setContent(event.target.value)} className="w-full rounded-lg border p-2 text-sm" />
      <button disabled={busy || loading || !content.trim()} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">{busy ? 'Saving…' : editing ? 'Save note' : 'Add note'}</button>
      {editing && <button type="button" disabled={busy} onClick={() => { setEditing(null); setContent(''); }} className="ml-3 text-sm underline">Cancel edit</button>}
    </form>
    {!loading && !error && notes.length === 0 && <p className="text-sm text-gray-500">No notes yet.</p>}
    <ul className="space-y-3">{notes.map((note) => <li key={note.noteId} className="border-t pt-3 text-sm">
      <p className="whitespace-pre-wrap break-words">{note.content}</p>
      <p className="mt-1 text-xs text-gray-500">{new Date(note.updatedAt).toLocaleString()}</p>
      {(note.authorId === user?.id || user?.role === 'admin' || user?.role === 'supervisor') && <div className="mt-2 flex gap-3">
        <button disabled={busy} onClick={() => { setEditing(note.noteId); setContent(note.content); }} className="text-blue-700 underline">Edit</button>
        <button disabled={busy} onClick={() => void remove(note.noteId)} className="text-red-700 underline">Delete</button>
      </div>}
    </li>)}</ul>
    {nextToken && <button disabled={busy} onClick={() => void load(true)} className="text-sm text-blue-700 underline">Load more notes</button>}
  </section>;
}
