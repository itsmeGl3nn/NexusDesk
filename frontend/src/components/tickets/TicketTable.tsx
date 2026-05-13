import { useState, useEffect } from 'react';
import { ArrowUpDown, Plus, MoreHorizontal, X } from 'lucide-react';
import { useTicketStore } from '../../store/ticketStore';
import StatusBadge from './StatusBadge';
import type { CreateTicketInput } from '../../types/ticket';

type FilterTab = 'all' | 'open' | 'in_progress';

export default function TicketTable() {
  const { tickets, selectedTicketId, selectTicket, fetchTickets, createTicket, isLoading } = useTicketStore();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filteredTickets = tickets.filter((t) => {
    if (activeTab === 'open') return t.status === 'open';
    if (activeTab === 'in_progress') return t.status === 'in_progress';
    return true;
  });

  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    in_progress: tickets.filter((t) => t.status === 'in_progress').length,
  };

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All Tickets', count: counts.all },
    { key: 'open', label: 'Open', count: counts.open },
    { key: 'in_progress', label: 'In Progress', count: counts.in_progress },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Page title */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
      </div>

      {/* Tabs and actions */}
      <div className="px-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                activeTab === tab.key ? 'bg-gray-200 text-gray-700' : 'bg-gray-200/60 text-gray-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
          <button className="p-1.5 text-gray-400 hover:text-gray-600">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Ticket
        </button>
      </div>

      {/* Table */}
      <div className="px-6 flex-1 overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                  ID <ArrowUpDown className="w-3 h-3" />
                </span>
              </th>
              <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                  Customer <ArrowUpDown className="w-3 h-3" />
                </span>
              </th>
              <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Issue
              </th>
              <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                  Status <ArrowUpDown className="w-3 h-3" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && tickets.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-sm text-gray-400">Loading tickets…</td></tr>
            ) : filteredTickets.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-sm text-gray-400">No tickets found</td></tr>
            ) : (
              filteredTickets.map((ticket) => (
                <tr
                  key={ticket.ticketId}
                  onClick={() => selectTicket(ticket.ticketId)}
                  className={`cursor-pointer transition-colors ${
                    selectedTicketId === ticket.ticketId
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="py-3.5 px-3 text-sm font-medium text-gray-900">{ticket.ticketId}</td>
                  <td className="py-3.5 px-3 text-sm text-gray-700">{ticket.customerName}</td>
                  <td className="py-3.5 px-3 text-sm text-gray-600 max-w-[200px] truncate">{ticket.subject}</td>
                  <td className="py-3.5 px-3">
                    <StatusBadge status={ticket.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Ticket Modal */}
      {showCreateForm && (
        <CreateTicketModal
          onClose={() => setShowCreateForm(false)}
          onSubmit={async (input) => {
            await createTicket(input);
            setShowCreateForm(false);
          }}
        />
      )}
    </div>
  );
}

function CreateTicketModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (input: CreateTicketInput) => Promise<void> }) {
  const [form, setForm] = useState<CreateTicketInput>({ customerName: '', customerEmail: '', subject: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
      setSubmitting(false);
    }
  };

  const set = (field: keyof CreateTicketInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create Ticket</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
            <input required value={form.customerName} onChange={set('customerName')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
            <input required type="email" value={form.customerEmail} onChange={set('customerEmail')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input required value={form.subject} onChange={set('subject')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea required value={form.description} onChange={set('description')} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50">{submitting ? 'Creating…' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
