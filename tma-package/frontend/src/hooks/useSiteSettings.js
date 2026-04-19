/**
 * useSiteSettings Hook
 * Единый источник настроек сайта для Header, Footer, Nav
 */
import { useState, useEffect, useCallback } from 'react';
import { getHeaderConfig, defaultHeaderConfig } from '../api/site';

/**
 * Hook для получения настроек сайта
 * @returns {Object} { settings, loading, error, refetch }
 */
export function useSiteSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getHeaderConfig();
      setSettings(data);
    } catch (err) {
      console.error('Failed to fetch site settings:', err);
      setError(err);
      // Use defaults on error
      setSettings(defaultHeaderConfig);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
    // Convenience getters
    phones: settings?.phones || defaultHeaderConfig.phones,
    socials: settings?.socials?.filter(s => s.enabled) || [],
    workingHours: settings?.workingHours || defaultHeaderConfig.workingHours,
    showTopbar: settings?.showTopbar ?? true,
    topbarStyle: settings?.topbarStyle || 'dark',
  };
}

export default useSiteSettings;
