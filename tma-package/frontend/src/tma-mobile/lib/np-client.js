/**
 * Nova Poshta autocomplete API client
 */
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || '';

const client = axios.create({
  baseURL: `${API}/api/tma/np`,
  timeout: 12000,
});

/** Debounce util — повертає функцію, що виконається тільки через N мс без нових викликів */
export function debounce(fn, delay = 250) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

export async function searchCities(q, limit = 10) {
  const query = (q || '').trim();
  if (query.length < 1) return { items: [] };
  const { data } = await client.get('/cities', { params: { q: query, limit } });
  return data;
}

export async function searchWarehouses(cityRef, q = '', limit = 30) {
  if (!cityRef) return { items: [] };
  const params = { city_ref: cityRef, limit };
  if (q) params.q = q;
  const { data } = await client.get('/warehouses', { params });
  return data;
}
