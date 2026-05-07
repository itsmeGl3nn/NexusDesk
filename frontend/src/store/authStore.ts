import { create } from 'zustand';
import type { User } from '../types/user';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: {
    id: '1',
    name: 'Alex Johnson',
    email: 'alex.johnson@company.com',
    role: 'agent',
  },
  setUser: (user) => set({ user }),
}));
