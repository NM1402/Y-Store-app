/**
 * App Store - Zustand
 * Global app state
 */

import { create } from 'zustand';

const useAppStore = create((set) => ({
  isLoading: false,
  activeTab: 'home',
  searchQuery: '',
  
  setLoading: (isLoading) => set({ isLoading }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));

export default useAppStore;
