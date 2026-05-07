import { Ticket, Phone, Users, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { useTicketStore } from '../store/ticketStore';
import { useAuthStore } from '../store/authStore';

export default function DashboardPage() {
  const tickets = useTicketStore((s) => s.tickets);
  const user = useAuthStore((s) => s.user);

  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED').length;

  const isSupervisor = user?.role === 'supervisor' || user?.role === 'admin';

  const stats = [
    { label: 'Open Tickets', value: openCount, icon: Ticket, color: 'bg-orange-50 text-orange-600', iconBg: 'bg-orange-100' },
    { label: 'In Progress', value: inProgressCount, icon: Clock, color: 'bg-blue-50 text-blue-600', iconBg: 'bg-blue-100' },
    { label: 'Resolved Today', value: resolvedCount, icon: TrendingUp, color: 'bg-green-50 text-green-600', iconBg: 'bg-green-100' },
    { label: 'Active Calls', value: 2, icon: Phone, color: 'bg-purple-50 text-purple-600', iconBg: 'bg-purple-100' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Here's what's happening in your contact center today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`rounded-xl p-5 ${stat.color} border border-transparent`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-80">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Supervisor section */}
      {isSupervisor && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Team Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">5</p>
              <p className="text-sm text-gray-500">Agents Online</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">3m 24s</p>
              <p className="text-sm text-gray-500">Avg Handle Time</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">92%</p>
              <p className="text-sm text-gray-500">SLA Compliance</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {tickets.slice(0, 4).map((ticket) => (
            <div key={ticket.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  ticket.status === 'OPEN' ? 'bg-orange-400' :
                  ticket.status === 'IN_PROGRESS' ? 'bg-blue-400' : 'bg-green-400'
                }`} />
                <div>
                  <p className="text-sm font-medium text-gray-800">{ticket.id}</p>
                  <p className="text-xs text-gray-500">{ticket.customer} — {ticket.issue}</p>
                </div>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(ticket.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Alert for agents */}
      {!isSupervisor && openCount > 2 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            You have <strong>{openCount} open tickets</strong> that need attention. Consider prioritizing the oldest ones first.
          </p>
        </div>
      )}
    </div>
  );
}
