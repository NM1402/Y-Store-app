/**
 * API Client for Telegram Mini App
 * Handles all backend communication
 */

import axios from 'axios';
import telegram from './telegram-sdk';

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

class APIClient {
  constructor() {
    this.token = null;
    this.axios = axios.create({
      baseURL: `${API_BASE}/api/tma`,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.axios.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axios.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          this.clearAuth();
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('tma_token', token);
    } else {
      localStorage.removeItem('tma_token');
    }
  }

  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('tma_token');
    }
    return this.token;
  }

  clearAuth() {
    this.token = null;
    localStorage.removeItem('tma_token');
    localStorage.removeItem('tma_user');
  }

  // Auth
  async authenticate() {
    const initData = telegram.getInitData();
    
    // If no initData (browser testing), use sandbox mode
    const authData = initData || 'sandbox:1';
    
    const response = await this.axios.post('/auth', { init_data: authData });
    this.setToken(response.token);
    localStorage.setItem('tma_user', JSON.stringify(response.user));
    return response;
  }

  async getMe() {
    return this.axios.get('/me');
  }

  // Home
  async getHome() {
    return this.axios.get('/home');
  }

  // Categories
  async getCategories() {
    return this.axios.get('/categories');
  }

  // Products
  async getProducts(params = {}) {
    return this.axios.get('/products', { params });
  }

  async getProduct(id) {
    return this.axios.get(`/products/${id}`);
  }

  // Search
  async searchSuggest(query) {
    return this.axios.get('/search/suggest', { params: { q: query } });
  }

  async searchProducts(query) {
    return this.axios.get('/products', { params: { q: query } });
  }

  // Cart
  async previewCart(items) {
    return this.axios.post('/cart/preview', { items });
  }

  // Orders
  async createOrder(data) {
    return this.axios.post('/orders', data);
  }

  async getOrders() {
    return this.axios.get('/orders');
  }

  async getOrder(id) {
    return this.axios.get(`/orders/${id}`);
  }

  async deleteOrder(id) {
    return this.axios.delete(`/orders/${id}`);
  }

  async simulatePayment(id) {
    return this.axios.post(`/orders/${id}/simulate-payment`);
  }

  // Favorites
  async getFavorites() {
    return this.axios.get('/favorites');
  }

  async getFavoriteIds() {
    return this.axios.get('/favorites/ids');
  }

  async toggleFavorite(productId) {
    return this.axios.post('/favorites/toggle', { product_id: productId });
  }

  // Reviews
  async getProductReviews(productId) {
    return this.axios.get(`/products/${productId}/reviews`);
  }

  async createReview(data) {
    return this.axios.post('/reviews', data);
  }

  // Support
  async getSupportTickets() {
    return this.axios.get('/support/tickets');
  }

  async createSupportTicket(data) {
    return this.axios.post('/support/tickets', data);
  }
}

export const api = new APIClient();
export default api;
