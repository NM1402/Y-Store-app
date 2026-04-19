import React, { createContext, useContext, useState } from 'react';

const CatalogContext = createContext();

export const useCatalog = () => {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }
  return context;
};

export const CatalogProvider = ({ children }) => {
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  const openCatalog = () => setIsCatalogOpen(true);
  const closeCatalog = () => setIsCatalogOpen(false);
  const toggleCatalog = () => setIsCatalogOpen(prev => !prev);

  return (
    <CatalogContext.Provider
      value={{
        isCatalogOpen,
        openCatalog,
        closeCatalog,
        toggleCatalog,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
};
