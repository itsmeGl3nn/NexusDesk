import { useState } from 'react';
import { useTicketStore } from '../../store/ticketStore';
import StatusBadge from './StatusBadge';

export default function TicketDetailPanel() {
  const { tickets, selectedTicketId } = useTicketStore();
  const [notes, setNotes] = useState('');

  const ticket = tickets.find((t) => t.ticketId === selectedTicketId);

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Select a ticket to view details
      </div>
    );
  }

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
    <div className="flex flex-col h-full p-5 overflow-auto">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">{ticket.ticketId}</h2>
        <p className="text-sm font-medium text-gray-700">{ticket.customerName}</p>
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

      {/* Notes */}
      <div className="flex-1 mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add internal note..."
          className="w-full h-24 p-3 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          Save
        </button>
        <button className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors">
          Close Ticket
        </button>
      </div>
    </div>
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
