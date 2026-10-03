import { useEffect, useState } from 'react';
import * as callService from '../services/callService';
import { useAuthStore } from '../store/authStore';
import type { Call } from '../types/call';

export default function CallsPage() {
  const user = useAuthStore((s) => s.user);
  const [calls, setCalls] = useState<Call[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    callService.listCalls().then((page) => { if (current) { setCalls(page.items); setNextToken(page.nextToken); } })
      .catch((err) => { if (current) setError(err instanceof Error ? err.message : 'Cannot load calls.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);
  const load = async (more = false) => {
    setLoading(true); setError('');
    try {
      const page = await callService.listCalls(undefined, more && nextToken ? nextToken : undefined);
      setCalls((current) => more ? [...current, ...page.items.filter((item) => !current.some((call) => call.callId === item.callId))] : page.items);
      setNextToken(page.nextToken);
    } catch (err) { setError(err instanceof Error ? err.message : 'Cannot load calls.'); }
    finally { setLoading(false); }
  };
  const end = async (id: string) => {
    setLoading(true); setError('');
    try { const call = await callService.endCall(id); setCalls((current) => current.map((item) => item.callId === id ? call : item)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Cannot end call.'); }
    finally { setLoading(false); }
  };
  return <div className="p-4 sm:p-6 space-y-4">
    <h1 className="text-2xl font-bold">Calls</h1>
    <p className="text-sm text-gray-600">Simulated calls saved in Floci. Start a call from a selected ticket.</p>
    <button disabled={loading} onClick={() => void load()} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Refresh calls</button>
    {loading && <p role="status">Loading…</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!loading && !error && calls.length === 0 && <p>No calls yet.</p>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Customer / ticket</th><th className="p-3">Started</th><th className="p-3">Status</th><th className="p-3">Duration</th><th className="p-3">Action</th></tr></thead><tbody>{calls.map((call) => <tr key={call.callId} className="border-t"><td className="p-3">{call.customerName}<p className="text-xs text-gray-500">{call.ticketId}</p></td><td className="p-3">{new Date(call.startedAt).toLocaleString()}</td><td className="p-3 capitalize">{call.status}</td><td className="p-3">{call.durationSeconds !== undefined ? `${call.durationSeconds}s` : '—'}</td><td className="p-3">{call.status === 'active' && (call.agentId === user?.id || user?.role !== 'agent') && <button disabled={loading} onClick={() => void end(call.callId)} className="text-red-700 underline">End call</button>}</td></tr>)}</tbody></table></div>
    {nextToken && <button disabled={loading} onClick={() => void load(true)} className="rounded-lg border px-4 py-2 text-sm">Load more calls</button>}
  </div>;
}
