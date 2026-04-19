/**
 * P2.2: i18n Internationalization System
 * Provides translations for UK/RU languages
 */
import { useState, useEffect, createContext, useContext, useCallback } from 'react';

// Import translations
import uk from '../i18n/uk.json';
import ru from '../i18n/ru.json';

const translations = { uk, ru };

// Default language
const DEFAULT_LANG = 'uk';
const LANG_KEY = 'ys-lang';

// Context
const I18nContext = createContext(null);

// Get nested value from object
function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

// Provider component
export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LANG_KEY) || DEFAULT_LANG;
    }
    return DEFAULT_LANG;
  });

  // Save to localStorage when lang changes
  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  // Translation function
  const t = useCallback((key, params = {}) => {
    const translation = getNestedValue(translations[lang], key);
    
    if (!translation) {
      console.warn(`Translation missing: ${key}`);
      return key;
    }

    // Replace params like {{name}}
    if (typeof translation === 'string' && Object.keys(params).length) {
      return translation.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] || '');
    }

    return translation;
  }, [lang]);

  // Change language
  const setLang = useCallback((newLang) => {
    if (translations[newLang]) {
      setLangState(newLang);
    }
  }, []);

  // Toggle between uk/ru
  const toggleLang = useCallback(() => {
    setLangState(prev => prev === 'uk' ? 'ru' : 'uk');
  }, []);

  const value = {
    lang,
    setLang,
    toggleLang,
    t,
    availableLangs: Object.keys(translations),
    isUk: lang === 'uk',
    isRu: lang === 'ru'
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

// Hook to use translations
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

// Standalone translation function (for use outside React)
export function translate(key, lang = DEFAULT_LANG) {
  return getNestedValue(translations[lang], key) || key;
}

export default useI18n;
