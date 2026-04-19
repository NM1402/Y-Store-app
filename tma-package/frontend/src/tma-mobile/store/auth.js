/**
 * Auth Store - Zustand
 * Authentication state management
 */

import { create } from 'zustand';
import { api } from '../lib/api-client';
import telegram from '../lib/telegram-sdk';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  loading: true,
  error: null,

  initialize: async () => {
    try {
      set({ loading: true, error: null });
      
      // Try to get token from storage
      const storedToken = api.getToken();
      
      if (storedToken) {
        // Verify token
        try {
          const user = await api.getMe();
          set({ user, token: storedToken, loading: false });
          return;
        } catch (e) {
          // Token invalid, clear it
          api.clearAuth();
        }
      }

      // Authenticate with Telegram
      const response = await api.authenticate();
      set({ 
        user: response.user, 
        token: response.token,
        loading: false 
      });
    } catch (error) {
      console.error('Auth error:', error);
      set({ error: error.message, loading: false });
    }
  },

  logout: () => {
    api.clearAuth();
    set({ user: null, token: null });
  },

  isAuthenticated: () => {
    return !!get().token;
  },
}));

export default useAuthStore;
