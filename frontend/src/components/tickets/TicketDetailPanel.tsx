import { useState } from 'react';
import { useTicketStore } from '../../store/ticketStore';
import StatusBadge from './StatusBadge';
import type { Ticket, TicketStatus, UpdateTicketInput } from '../../types/ticket';

const statusLabels: Record<TicketStatus, string> = {
  open: 'Open', in_progress: 'In progress', resolved: 'Resolved', closed: 'Closed', reopened: 'Reopened',
};
const transitions: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_progress'], in_progress: ['resolved', 'reopened'], resolved: ['closed', 'reopened'], reopened: ['in_progress'], closed: [],
};

export default function TicketDetailPanel() {
  const { tickets, selectedTicketId } = useTicketStore();

  const ticket = tickets.find((t) => t.ticketId === selectedTicketId);

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Select a ticket to view details
      </div>
    );
  }

  return <TicketEditor key={ticket.ticketId} ticket={ticket} />;
}

function TicketEditor({ ticket }: { ticket: Ticket }) {
  const updateTicket = useTicketStore((s) => s.updateTicket);
  const [description, setDescription] = useState(ticket.description);
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [resolution, setResolution] = useState(ticket.resolution ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const input: UpdateTicketInput = { description: description.trim() };
    if (!input.description) { setError('Description is required.'); return; }
    if (status !== ticket.status) input.status = status;
    if (status === 'resolved') {
      if (!resolution.trim()) { setError('Add a resolution before resolving this ticket.'); return; }
      input.resolution = resolution.trim();
    }
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updateTicket(ticket.ticketId, input);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ticket could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const createdDate = new Date(ticket.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const timeAgo = getTimeAgo(ticket.createdAt);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full p-5 overflow-auto">
      {/* Header */}
      <div className="mb-5">
        <p className="text-xs text-gray-500 break-all mb-1">{ticket.ticketId}</p>
        <h2 className="text-lg font-bold text-gray-900 break-words">{ticket.subject}</h2>
        <p className="text-sm font-medium text-gray-700">{ticket.customerName}</p>
        <p className="text-xs text-gray-600 break-all">{ticket.customerEmail}</p>
        <p className="text-xs text-gray-500">Created {timeAgo}</p>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-600">Status</span>
        <StatusBadge status={ticket.status} />
      </div>

      {/* Created date */}
      <div className="mb-5">
        <span className="text-xs text-gray-500">Created: </span>
        <span className="text-xs text-gray-700">{createdDate}</span>
      </div>

      {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {saved && <p role="status" className="mb-4 text-sm text-green-700">Ticket saved.</p>}

      {/* Description */}
      <div className="flex-1 mb-4">
        <label htmlFor="ticket-description" className="block text-sm font-semibold text-gray-800 mb-2">Description</label>
        <textarea
          id="ticket-description"
          required
          disabled={saving}
          value={description}
          onChange={(e) => { setDescription(e.target.value); setSaved(false); }}
          className="w-full h-24 p-3 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="ticket-status" className="block text-sm font-semibold text-gray-800 mb-2">Update status</label>
        <select id="ticket-status" disabled={saving} value={status} onChange={(e) => { setStatus(e.target.value as TicketStatus); setSaved(false); }} className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {[ticket.status, ...transitions[ticket.status]].map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}
        </select>
      </div>
      {status === 'resolved' && <div className="mb-4">
        <label htmlFor="ticket-resolution" className="block text-sm font-semibold text-gray-800 mb-2">Resolution</label>
        <textarea id="ticket-resolution" required disabled={saving} value={resolution} onChange={(e) => { setResolution(e.target.value); setSaved(false); }} className="w-full h-24 p-3 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>}
      {status !== 'resolved' && ticket.resolution && <p className="mb-4 text-sm text-gray-600 whitespace-pre-wrap"><strong>Resolution:</strong> {ticket.resolution}</p>}

      {/* Actions */}
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return 'just now';
}
