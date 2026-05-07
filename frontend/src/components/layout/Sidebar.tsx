import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  Phone,
  Users,
  BarChart3,
  Settings,
  ChevronDown,
  Headphones,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tickets', icon: Ticket, label: 'Tickets' },
  { to: '/calls', icon: Phone, label: 'Calls' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);

  return (
    <aside className="flex flex-col w-60 bg-white border-r border-gray-200 h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-teal-400">
          <Headphones className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold text-gray-800">Contact Center</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 -ml-0.5 pl-2.5'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="border-t border-gray-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? 'User')}&background=6366f1&color=fff`}
              alt={user?.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">
              {user?.role === 'agent' ? 'Support Agent' : user?.role}
            </p>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="border-t border-gray-100 px-4 py-3">
        <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
          <Settings className="w-4 h-4" />
          Settings
          <ChevronDown className="w-3.5 h-3.5 ml-auto" />
        </button>
      </div>
    </aside>
  );
}
