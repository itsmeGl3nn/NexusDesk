import { useEffect, useState } from 'react';
import { listLogs } from '../services/logService';
import type { Log } from '../types/log';

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    listLogs().then((page) => { if (current) { setLogs(page.items); setNextToken(page.nextToken); } })
      .catch((err) => { if (current) setError(err instanceof Error ? err.message : 'Cannot load audit logs.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);
  const load = async (more = false) => {
    setLoading(true); setError('');
    try { const page = await listLogs(more && nextToken ? nextToken : undefined); setLogs((current) => more ? [...current, ...page.items] : page.items); setNextToken(page.nextToken); }
    catch (err) { setError(err instanceof Error ? err.message : 'Cannot load audit logs.'); }
    finally { setLoading(false); }
  };
  return <div className="p-4 sm:p-6 space-y-4">
    <h1 className="text-2xl font-bold">Audit logs</h1><p className="text-sm text-gray-600">Recorded mutations for this tenant. Audit records cannot be edited.</p>
    <button disabled={loading} onClick={() => void load()} className="rounded-lg border px-3 py-2 text-sm">Refresh logs</button>
    {loading && <p role="status">Loading…</p>}{error && <p role="alert" className="text-red-700">{error}</p>}
    {!loading && !error && logs.length === 0 && <p>No audit logs yet.</p>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Time</th><th className="p-3">Action</th><th className="p-3">Entity</th><th className="p-3">Actor</th></tr></thead><tbody>{logs.map((log) => <tr key={log.logId} className="border-t"><td className="p-3 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td><td className="p-3">{log.action}</td><td className="p-3 break-all">{log.entityType}: {log.entityId}</td><td className="p-3 break-all">{log.actorId}</td></tr>)}</tbody></table></div>
    {nextToken && <button disabled={loading} onClick={() => void load(true)} className="rounded-lg border px-4 py-2 text-sm">Load more logs</button>}
  </div>;
}
