import React, { createContext, useContext, useState, useEffect } from 'react';

const ComparisonContext = createContext();

export const useComparison = () => {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error('useComparison must be used within ComparisonProvider');
  }
  return context;
};

export const ComparisonProvider = ({ children }) => {
  const [comparisonItems, setComparisonItems] = useState([]);
  const MAX_COMPARISON_ITEMS = 4; // Maximum items to compare

  // Load comparison items from localStorage on mount
  useEffect(() => {
    const storedItems = localStorage.getItem('comparison');
    if (storedItems) {
      try {
        setComparisonItems(JSON.parse(storedItems));
      } catch (error) {
        console.error('Failed to parse comparison items:', error);
      }
    }
  }, []);

  // Save comparison items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('comparison', JSON.stringify(comparisonItems));
  }, [comparisonItems]);

  const addToComparison = (product) => {
    setComparisonItems((prev) => {
      // Check if already in comparison
      if (prev.find((item) => item.id === product.id)) {
        return prev;
      }
      
      // Check if max limit reached
      if (prev.length >= MAX_COMPARISON_ITEMS) {
        return prev; // Don't add if limit reached
      }
      
      return [...prev, product];
    });
  };

  const removeFromComparison = (productId) => {
    setComparisonItems((prev) => prev.filter((item) => item.id !== productId));
  };

  const isInComparison = (productId) => {
    return comparisonItems.some((item) => item.id === productId);
  };

  const clearComparison = () => {
    setComparisonItems([]);
  };

  const canAddMore = () => {
    return comparisonItems.length < MAX_COMPARISON_ITEMS;
  };

  const value = {
    comparisonItems,
    addToComparison,
    removeFromComparison,
    isInComparison,
    clearComparison,
    canAddMore,
    comparisonCount: comparisonItems.length,
    maxItems: MAX_COMPARISON_ITEMS,
  };

  return (
    <ComparisonContext.Provider value={value}>
      {children}
    </ComparisonContext.Provider>
  );
};

export default ComparisonContext;
