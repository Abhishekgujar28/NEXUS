import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { authService } from '@/lib/services';
import { clearTokens, saveTokens, loadTokens } from '@/lib/api';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'authed' | 'guest';
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      status: 'idle',

      init: async () => {
        const { accessToken } = loadTokens();
        if (!accessToken) {
          set({ status: 'guest', user: null });
          return;
        }
        set({ status: 'loading' });
        try {
          const { user } = await authService.me();
          set({ user, status: 'authed' });
        } catch {
          clearTokens();
          set({ status: 'guest', user: null });
        }
      },

      login: async (email, password) => {
        const res = await authService.login({ email, password });
        saveTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
        set({ user: res.user, status: 'authed' });
      },

      register: async (name, email, password) => {
        const res = await authService.register({ name, email, password });
        saveTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
        set({ user: res.user, status: 'authed' });
      },

      logout: async () => {
        const { refreshToken } = loadTokens();
        try {
          await authService.logout(refreshToken);
        } catch {
          /* best effort */
        }
        clearTokens();
        set({ user: null, status: 'guest' });
      },

      setUser: (u) => set({ user: u }),
    }),
    {
      name: 'nexus.auth.v1',
      partialize: (s) => ({ user: s.user }),
    }
  )
);
