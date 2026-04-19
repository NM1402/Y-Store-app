/**
 * User Behavior Store - Growth Layer v2
 * Tracks viewed products, behavior patterns, user segments
 * Enables personalization and retention
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUserStore = create(
  persist(
    (set, get) => ({
      // Recently viewed product IDs (max 20)
      viewed: [],
      
      // User segment: 'unknown' | 'budget' | 'mid' | 'premium'
      segment: 'unknown',
      
      // Favorites for retention
      favorites: [],
      
      // Add product to viewed history
      addViewed: (productId) => {
        set((state) => {
          const filtered = state.viewed.filter(id => id !== productId);
          return {
            viewed: [productId, ...filtered].slice(0, 20)
          };
        });
      },
      
      // Smart segment inference from cart behavior
      updateSegment: (cart) => {
        if (!cart || cart.length === 0) return;
        
        const avgPrice = cart.reduce((sum, item) => sum + (item.price || 0), 0) / cart.length;
        
        let newSegment = 'unknown';
        if (avgPrice > 30000) {
          newSegment = 'premium'; // High-value customers
        } else if (avgPrice > 10000) {
          newSegment = 'mid'; // Mid-range customers
        } else {
          newSegment = 'budget'; // Budget-conscious customers
        }
        
        set({ segment: newSegment });
      },
      
      // Toggle favorite
      toggleFavorite: (productId) => {
        set((state) => {
          const isFavorite = state.favorites.includes(productId);
          return {
            favorites: isFavorite
              ? state.favorites.filter(id => id !== productId)
              : [...state.favorites, productId]
          };
        });
      },
      
      // Check if product is favorite
      isFavorite: (productId) => {
        return get().favorites.includes(productId);
      },
      
      // Clear all behavior data
      reset: () => {
        set({
          viewed: [],
          segment: 'unknown',
          favorites: []
        });
      }
    }),
    {
      name: 'tma-user-store',
    }
  )
);

export default useUserStore;
