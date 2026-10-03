import { useEffect } from 'react'
import { SESSION_EXPIRED, SESSION_KEY } from './services/session'
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TicketsPage from './pages/TicketsPage'
import ContactPage from './pages/ContactPage'
import DashboardLayout from './components/layout/DashboardLayout'
import { useAuthStore } from './store/authStore'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  const { isAuthenticated, expiresAt, logout, syncSession } = useAuthStore();
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === SESSION_KEY || event.key === null) syncSession();
    };
    window.addEventListener('focus', syncSession);
    window.addEventListener('storage', onStorage);
    window.addEventListener(SESSION_EXPIRED, logout);
    const timer = expiresAt ? window.setTimeout(syncSession, Math.max(0, expiresAt - Date.now())) : undefined;
    return () => {
      window.removeEventListener('focus', syncSession);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SESSION_EXPIRED, logout);
      window.clearTimeout(timer);
    };
  }, [expiresAt, logout, syncSession]);
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route element={<RequireAuth><DashboardLayout /></RequireAuth>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/calls" element={<DashboardPage />} />
        <Route path="/customers" element={<DashboardPage />} />
        <Route path="/analytics" element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  )
}

export default App
