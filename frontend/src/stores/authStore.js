import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Auth store — persisted to localStorage.
 * accessToken: kept in memory (not persisted for security, refreshed on reload)
 * user: persisted so we can show UI without network round-trip
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken) => {
        set({ user, accessToken, isAuthenticated: true });
      },

      setAccessToken: (accessToken) => {
        set({ accessToken });
      },

      setUser: (user) => {
        set({ user });
      },

      logout: () => {
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      get isAuth() {
        return get().isAuthenticated && !!get().accessToken;
      },
    }),
    {
      name: 'bloomlater-auth',
      partialize: (state) => ({
        // Only persist user data, never the raw access token
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
