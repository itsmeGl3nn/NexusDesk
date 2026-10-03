import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { User } from '../types/user';

export default function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: User['role'][] }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && (!user || !roles.includes(user.role))) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
