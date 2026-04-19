import React, { createContext, useContext, useState, useEffect } from 'react';
import { cartAPI } from '../utils/api';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { toast } from 'sonner';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  // Try to get items from localStorage first
  const getInitialCart = () => {
    try {
      const savedCart = localStorage.getItem('guest_cart');
      if (savedCart) {
        return JSON.parse(savedCart);
      }
    } catch (e) {
      console.log('No saved cart');
    }
    return { items: [] };
  };

  const [cart, setCart] = useState(getInitialCart);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();

  // Save to localStorage whenever cart changes
  useEffect(() => {
    if (!isAuthenticated && cart?.items?.length > 0) {
      localStorage.setItem('guest_cart', JSON.stringify(cart));
    }
  }, [cart, isAuthenticated]);

  // Fetch cart on mount and when auth changes (works for guests too)
  useEffect(() => {
    fetchCart();
  }, [isAuthenticated]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await cartAPI.get();
      const serverCart = response.data;
      
      // Merge with localStorage cart for guests
      if (!isAuthenticated) {
        const localCart = getInitialCart();
        if (localCart.items?.length > 0 && (!serverCart.items || serverCart.items.length === 0)) {
          // Use local cart if server is empty
          setCart(localCart);
          return;
        }
      }
      
      setCart(serverCart);
      if (!isAuthenticated && serverCart?.items?.length > 0) {
        localStorage.setItem('guest_cart', JSON.stringify(serverCart));
      }
    } catch (error) {
      // Guest cart might not exist yet - use localStorage
      if (!isAuthenticated) {
        const localCart = getInitialCart();
        if (localCart.items?.length > 0) {
          setCart(localCart);
          return;
        }
      }
      console.log('Cart fetch:', error?.response?.status === 401 ? 'Guest mode' : error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId, quantity = 1, productData = null) => {
    try {
      const response = await cartAPI.addItem({ product_id: productId, quantity });
      
      // Update cart immediately from the response
      if (response.data && response.data.cart) {
        setCart(response.data.cart);
        // Also save to localStorage for guests
        if (!isAuthenticated) {
          localStorage.setItem('guest_cart', JSON.stringify(response.data.cart));
        }
      } else {
        // Fallback: fetch fresh cart
        const cartResponse = await cartAPI.get();
        setCart(cartResponse.data);
        if (!isAuthenticated) {
          localStorage.setItem('guest_cart', JSON.stringify(cartResponse.data));
        }
      }
      
      return { success: true };
    } catch (error) {
      // If API fails, try to add locally for guests
      if (!isAuthenticated && productData) {
        const newItem = {
          product_id: productId,
          quantity,
          ...productData
        };
        setCart(prev => {
          const existingIndex = prev.items?.findIndex(i => i.product_id === productId);
          let newItems;
          if (existingIndex >= 0) {
            newItems = [...prev.items];
            newItems[existingIndex].quantity += quantity;
          } else {
            newItems = [...(prev.items || []), newItem];
          }
          const newCart = { ...prev, items: newItems };
          localStorage.setItem('guest_cart', JSON.stringify(newCart));
          return newCart;
        });
        return { success: true };
      }
      toast.error(error.response?.data?.detail || t('failedToAddToCart'), { duration: 2000 });
      return { success: false };
    }
  };

  const removeFromCart = async (productId) => {
    try {
      await cartAPI.removeItem(productId);
      await fetchCart();
      toast.success(t('removedFromCart'));
      return { success: true };
    } catch (error) {
      toast.error(t('failedToRemoveFromCart'));
      return { success: false };
    }
  };

  const clearCart = async () => {
    try {
      await cartAPI.clear();
      setCart({ items: [] });
      localStorage.removeItem('guest_cart');
      toast.success(t('cartCleared'));
      return { success: true };
    } catch (error) {
      // Clear local anyway
      setCart({ items: [] });
      localStorage.removeItem('guest_cart');
      toast.error(t('failedToClearCart'));
      return { success: false };
    }
  };

  const cartItemsCount = cart?.items?.length || 0;
  const cartTotal = cart?.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;

  const value = {
    cart,
    loading,
    addToCart,
    removeFromCart,
    clearCart,
    fetchCart,
    cartItemsCount,
    cartTotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};