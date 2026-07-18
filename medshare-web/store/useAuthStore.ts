import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  currentUser: User | null;
  role: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  login: (data: { user: User; token: string; refreshToken?: string; permissions?: string[] }) => void;
  logout: () => void;
  restoreSession: () => void; // Usually called to validate the existing token with the backend
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      currentUser: null,
      role: null,
      permissions: [],
      isAuthenticated: false,
      login: ({ user, token, refreshToken, permissions = [] }) => {
        set({
          user: user, // user shouldn't be mapped to user, it's currentUser
          currentUser: user,
          role: user.role,
          token,
          refreshToken: refreshToken || null,
          permissions,
          isAuthenticated: true,
        });
      },
      logout: () => {
        set({
          currentUser: null,
          role: null,
          token: null,
          refreshToken: null,
          permissions: [],
          isAuthenticated: false,
        });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
        }
      },
      restoreSession: () => {
        const state = get();
        if (state.token && state.currentUser) {
          // Additional logic to verify token validity can go here.
          set({ isAuthenticated: true });
        } else {
          set({ isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-storage', // unique name
    }
  )
);
