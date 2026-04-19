import React, { createContext, useContext, useState, useCallback } from 'react';
import ukTranslations from '../i18n/uk.json';
import { translations as flatTranslations } from '../i18n/translations';

const LanguageContext = createContext();

// Only Ukrainian translations
const nestedTranslations = {
  uk: ukTranslations,
  ua: ukTranslations
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  // Always Ukrainian - no language switching
  const [language] = useState('ua');

  // No-op for compatibility
  const changeLanguage = () => {};

  /**
   * Translation function supporting both flat and nested keys
   */
  const t = useCallback((key, params = {}) => {
    // First try nested translations (uk.json)
    if (key.includes('.')) {
      const keys = key.split('.');
      let value = nestedTranslations[language];
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          value = undefined;
          break;
        }
      }
      
      if (typeof value === 'string') {
        return Object.entries(params).reduce(
          (str, [paramKey, paramValue]) => str.replace(new RegExp(`{${paramKey}}`, 'g'), paramValue),
          value
        );
      }
    }
    
    // Try flat translations
    const flatValue = flatTranslations[language]?.[key];
    if (flatValue) {
      return Object.entries(params).reduce(
        (str, [paramKey, paramValue]) => str.replace(new RegExp(`{${paramKey}}`, 'g'), paramValue),
        flatValue
      );
    }
    
    // Fallback: return the key itself
    return key;
  }, [language]);

  /**
   * Get all translations for a namespace
   */
  const tNs = useCallback((namespace) => {
    return nestedTranslations[language]?.[namespace] || {};
  }, [language]);

  const value = {
    language,
    changeLanguage,
    t,
    tNs,
    // Only Ukrainian
    languages: [
      { code: 'ua', name: 'Українська', flag: '🇺🇦' }
    ]
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export default LanguageContext;
