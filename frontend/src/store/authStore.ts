import { create } from 'zustand';
import type { User } from '../types/user';
import { loginApi, type AuthTokens } from '../services/authService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

function saveTokens(tokens: AuthTokens) {
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('idToken', tokens.idToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
}

function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('idToken');
  localStorage.removeItem('refreshToken');
}

function decodeUser(idToken: string): User {
  const payload = JSON.parse(atob(idToken.split('.')[1]));
  const groups: string[] = payload['cognito:groups'] ?? [];
  const role = groups.includes('admin') ? 'admin' : groups.includes('supervisor') ? 'supervisor' : 'agent';
  return {
    id: payload.sub,
    name: payload.email?.split('@')[0] ?? 'User',
    email: payload.email ?? '',
    role,
  };
}

const storedToken = localStorage.getItem('idToken');
const initialUser = storedToken ? decodeUser(storedToken) : null;

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  isAuthenticated: !!initialUser,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const tokens = await loginApi(email, password);
      saveTokens(tokens);
      const user = decodeUser(tokens.idToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    clearTokens();
    set({ user: null, isAuthenticated: false, error: null });
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
