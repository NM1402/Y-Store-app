/**
 * API Client - единый axios instance
 * Все запросы через этот клиент
 */
import axios from 'axios';
import axiosRetry from 'axios-retry';

// Base URL из env
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

// Создаём axios instance
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 20000, // 20 секунд
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // для guest cart cookies
});

// Retry logic для сетевых ошибок
axiosRetry(apiClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
  },
});

/**
 * Request interceptor - добавляем токен
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor - обработка ошибок
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Нормализуем ошибку
    const normalizedError = normalizeError(error);
    
    // 401 - redirect на login (кроме auth endpoints и guest endpoints)
    const isAuthEndpoint = error.config?.url?.includes('/auth/');
    const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
    const isGuestEndpoint = error.config?.url?.includes('/cart');
    
    if (normalizedError.status === 401 && !isAuthEndpoint && !isAuthPage && !isGuestEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(normalizedError);
  }
);

/**
 * Нормализация ошибок в единый формат
 */
export const normalizeError = (error) => {
  // Сетевая ошибка
  if (!error.response) {
    return {
      message: 'Помилка мережі. Перевірте з\'єднання.',
      status: 0,
      details: error.message,
      isNetworkError: true,
    };
  }
  
  const { response } = error;
  const status = response.status;
  const data = response.data;
  
  // Стандартные HTTP ошибки
  const statusMessages = {
    400: 'Невірний запит',
    401: 'Необхідна авторизація',
    403: 'Доступ заборонено',
    404: 'Не знайдено',
    422: 'Помилка валідації',
    429: 'Занадто багато запитів',
    500: 'Помилка сервера',
    502: 'Сервер недоступний',
    503: 'Сервіс тимчасово недоступний',
  };
  
  return {
    message: data?.detail || data?.message || statusMessages[status] || 'Невідома помилка',
    status,
    details: data,
    isValidationError: status === 422,
    isAuthError: status === 401 || status === 403,
    isServerError: status >= 500,
  };
};

/**
 * Хелпер для извлечения данных из response
 */
export const unwrap = (response) => response.data;

/**
 * Хелпер для безопасного вызова API
 */
export const safeCall = async (apiCall) => {
  try {
    const response = await apiCall();
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export default apiClient;
