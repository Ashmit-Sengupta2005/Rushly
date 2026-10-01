import { create } from 'zustand';
import type { User } from '@/types/api';

interface AuthState {
  user: User | null;
  isBootstrapped: boolean;      // true once the initial /auth/refresh attempt resolved (success OR fail)
  setUser: (user: User | null) => void;
  setBootstrapped: () => void;
  clear: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isBootstrapped: false,
  setUser: (user) => set({ user }),
  setBootstrapped: () => set({ isBootstrapped: true }),
  clear: () => set({ user: null }),
}));

// Selectors — stable references, avoid rerenders
export const useIsAuthenticated = () => useAuth((s) => s.user !== null);
export const useCurrentUser = () => useAuth((s) => s.user);