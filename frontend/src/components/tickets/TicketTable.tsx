import { useState } from 'react';
import { ArrowUpDown, Plus, MoreHorizontal } from 'lucide-react';
import { useTicketStore } from '../../store/ticketStore';
import StatusBadge from './StatusBadge';

type FilterTab = 'all' | 'open' | 'in_progress';

export default function TicketTable() {
  const { tickets, selectedTicketId, selectTicket } = useTicketStore();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const filteredTickets = tickets.filter((t) => {
    if (activeTab === 'open') return t.status === 'OPEN';
    if (activeTab === 'in_progress') return t.status === 'IN_PROGRESS';
    return true;
  });

  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === 'OPEN').length,
    in_progress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
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

        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
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
            {filteredTickets.map((ticket) => (
              <tr
                key={ticket.id}
                onClick={() => selectTicket(ticket.id)}
                className={`cursor-pointer transition-colors ${
                  selectedTicketId === ticket.id
                    ? 'bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <td className="py-3.5 px-3 text-sm font-medium text-gray-900">{ticket.id}</td>
                <td className="py-3.5 px-3 text-sm text-gray-700">{ticket.customer}</td>
                <td className="py-3.5 px-3 text-sm text-gray-600 max-w-[200px] truncate">{ticket.issue}</td>
                <td className="py-3.5 px-3">
                  <StatusBadge status={ticket.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
