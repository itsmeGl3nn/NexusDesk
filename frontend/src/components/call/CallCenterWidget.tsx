import { useState, useEffect } from 'react';
import { Phone, PhoneOff, Headphones } from 'lucide-react';
import { useTicketStore } from '../../store/ticketStore';
import { useAuthStore } from '../../store/authStore';
import * as callService from '../../services/callService';
import type { Call } from '../../types/call';

export default function CallCenterWidget() {
  const ticketId = useTicketStore((s) => s.selectedTicketId);
  return ticketId ? <CallPanel key={ticketId} ticketId={ticketId} /> : <p className="p-3 text-sm text-gray-500">Select a ticket to simulate a call.</p>;
}

function CallPanel({ ticketId }: { ticketId: string }) {
  const user = useAuthStore((s) => s.user);
  const [calls, setCalls] = useState<Call[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(Date.now());
  const activeCall = calls.find((call) => call.status === 'active' && call.agentId === user?.id);

  useEffect(() => {
    let current = true;
    callService.listCalls(ticketId).then((page) => {
      if (current) { setCalls(page.items); setNextToken(page.nextToken); }
    }).catch((err) => { if (current) setError(err instanceof Error ? err.message : 'Cannot load calls.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [ticketId]);

  useEffect(() => {
    if (!activeCall) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeCall]);

  const act = async (ending: boolean) => {
    setBusy(true); setError('');
    try {
      const call = ending && activeCall ? await callService.endCall(activeCall.callId) : await callService.startCall(ticketId);
      setCalls((current) => [call, ...current.filter((item) => item.callId !== call.callId)]);
      setClock(Date.now());
    } catch (err) { setError(err instanceof Error ? err.message : 'Call request failed.'); }
    finally { setBusy(false); }
  };

  const more = async () => {
    if (!nextToken) return;
    setBusy(true); setError('');
    try {
      const page = await callService.listCalls(ticketId, nextToken);
      setCalls((current) => [...current, ...page.items.filter((item) => !current.some((call) => call.callId === item.callId))]);
      setNextToken(page.nextToken);
    } catch (err) { setError(err instanceof Error ? err.message : 'Cannot load calls.'); }
    finally { setBusy(false); }
  };
  const seconds = activeCall ? Math.max(0, Math.floor((clock - Date.parse(activeCall.startedAt)) / 1000)) : 0;

  return <section className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900"><Headphones className="w-5 h-5 text-blue-600" /> Simulated calls</h3>
    <p className="mt-1 text-xs text-gray-500">Saved call records; no real phone call is placed.</p>
    {loading && <p role="status" className="my-3 text-sm text-gray-500">Loading calls…</p>}
    {error && <p role="alert" className="my-3 text-sm text-red-700">{error}</p>}
    <div className="mt-3 flex gap-2">
      <button disabled={loading || busy || !!activeCall} onClick={() => void act(false)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm text-white disabled:opacity-50"><Phone className="w-4 h-4" /> {busy && !activeCall ? 'Starting…' : 'Call customer'}</button>
      {activeCall && <button disabled={busy} onClick={() => void act(true)} className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-50"><PhoneOff className="w-4 h-4" /> End call</button>}
    </div>
    {activeCall && <p role="status" className="mt-2 font-mono text-sm text-gray-600">{Math.floor(seconds / 60).toString().padStart(2, '0')}:{(seconds % 60).toString().padStart(2, '0')} · active</p>}
    <h4 className="mt-4 text-sm font-semibold">Call history</h4>
    {!loading && calls.length === 0 && <p className="mt-2 text-xs text-gray-500">No calls for this ticket.</p>}
    <ul className="mt-2 space-y-2">{calls.map((call) => <li key={call.callId} className="border-t border-gray-100 pt-2 text-xs text-gray-600"><span className="capitalize">{call.status}</span> · {new Date(call.startedAt).toLocaleString()} {call.durationSeconds !== undefined && `· ${call.durationSeconds}s`}</li>)}</ul>
    {nextToken && <button disabled={busy} onClick={() => void more()} className="mt-3 text-sm text-blue-700 underline">Load more calls</button>}
  </section>;
}
