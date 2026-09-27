import { Search, Bell, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between min-h-16 gap-2 px-3 sm:px-6 bg-white border-b border-gray-200">
      {/* Search */}
      <div className="relative hidden sm:block min-w-0 w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search tickets..."
          className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Right actions */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-4 ml-auto">
        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center">
            3
          </span>
        </button>

        {/* User */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? 'User')}&background=6366f1&color=fff&size=32`}
              alt={user?.name}
              className="w-full h-full object-cover"
            />
          </div>
          <span className="hidden md:inline text-sm font-medium text-gray-700">{user?.name}</span>
        </div>

        {/* Logout */}
        <button
          onClick={() => { logout(); navigate('/login', { replace: true }); }}
          className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <LogOut className="w-4 h-4" />
            Logout
          </span>
        </button>
      </div>
    </header>
  );
}
