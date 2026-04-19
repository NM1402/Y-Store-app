/**
 * Cart Store - Zustand
 * Mobile-first cart management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api-client';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product, quantity = 1) => {
        const items = get().items;
        const existing = items.find(item => item.product_id === product.id);
        
        if (existing) {
          set({
            items: items.map(item =>
              item.product_id === product.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          set({
            items: [
              ...items,
              {
                product_id: product.id,
                title: product.title,
                price: product.price,
                old_price: product.old_price || null,
                category: product.category || product.category_slug || null,
                image: product.images?.[0] || '',
                quantity,
              },
            ],
          });
        }
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter(item => item.product_id !== productId),
        });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
        } else {
          set({
            items: get().items.map(item =>
              item.product_id === productId
                ? { ...item, quantity }
                : item
            ),
          });
        }
      },

      clearCart: () => {
        set({ items: [] });
      },

      getCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getTotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },
    }),
    {
      name: 'tma-cart-storage',
    }
  )
);

export default useCartStore;
