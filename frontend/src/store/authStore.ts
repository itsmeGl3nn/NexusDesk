import { create } from 'zustand';
import type { User } from '../types/user';
import { loginApi } from '../services/authService';
import { clearSession, readSession, saveSession } from '../services/session';
import { useTicketStore } from './ticketStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  expiresAt: number | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => void;
  syncSession: () => void;
}

const initial = readSession();
let loginAttempt = 0;
let activeToken = initial?.tokens.accessToken;
export const useAuthStore = create<AuthState>((set, get) => ({
  user: initial?.user ?? null,
  isAuthenticated: !!initial,
  expiresAt: initial?.expiresAt ?? null,
  isLoading: false,
  error: null,

  login: async (email, password, remember = false) => {
    const attempt = ++loginAttempt;
    set({ isLoading: true, error: null });
    try {
      const tokens = await loginApi(email.trim(), password);
      if (attempt !== loginAttempt) throw new Error('Sign-in was cancelled.');
      const session = saveSession(tokens, remember);
      activeToken = session.tokens.accessToken;
      useTicketStore.getState().reset();
      set({ user: session.user, expiresAt: session.expiresAt, isAuthenticated: true, isLoading: false });
    } catch (err) {
      if (attempt === loginAttempt) {
        set({ error: err instanceof Error ? err.message : 'Login failed', isLoading: false });
      }
      throw err;
    }
  },

  logout: () => {
    loginAttempt++;
    activeToken = undefined;
    clearSession();
    useTicketStore.getState().reset();
    set({ user: null, expiresAt: null, isAuthenticated: false, isLoading: false, error: null });
  },

  syncSession: () => {
    const session = readSession();
    if (!session) { get().logout(); return; }
    if (activeToken !== session.tokens.accessToken) {
      loginAttempt++;
      activeToken = session.tokens.accessToken;
      useTicketStore.getState().reset();
      set({ isLoading: false, error: null });
    }
    set({ user: session.user, expiresAt: session.expiresAt, isAuthenticated: true });
  },
}));
