/**
 * Store Info Hook - получение реальной информации о магазине
 */

import { useState, useEffect } from 'react';
import { api } from '../lib/api-client';

export const useStoreInfo = () => {
  const [storeInfo, setStoreInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStoreInfo();
  }, []);

  const loadStoreInfo = async () => {
    try {
      const data = await api.axios.get('/tma/store-info');
      setStoreInfo(data);
    } catch (err) {
      console.error('Store info load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { storeInfo, loading, error };
};
