/**
 * API Client for Telegram Mini App
 * Handles communication with both TMA backend (auth, orders) and main backend (catalog, products)
 */

import axios from "axios";
import telegram from "./telegram-sdk";

const TMA_API_BASE =
  process.env.REACT_APP_TMA_BACKEND_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  "";

const MAIN_API_BASE =
  process.env.REACT_APP_MAIN_BACKEND_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  "";

class APIClient {
  constructor() {
    this.token = null;

    // TMA backend (auth, orders for TMA)
    this.tmaAxios = axios.create({
      baseURL: `${TMA_API_BASE}/api/tma`,
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Main backend (catalog, products, home)
    this.mainAxios = axios.create({
      baseURL: `${MAIN_API_BASE}/api`,
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // TMA request interceptor
    this.tmaAxios.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // TMA response interceptor
    this.tmaAxios.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          this.clearAuth();
        }
        return Promise.reject(error);
      },
    );

    // Main response interceptor (extract data, no auth needed for public endpoints)
    this.mainAxios.interceptors.response.use(
      (response) => response.data,
      (error) => Promise.reject(error),
    );
  }

  normalizePath(path = "") {
    if (!path) return "/";
    if (path.startsWith("/api/v2/")) return path.replace("/api/v2", "");
    if (path.startsWith("/v2/")) return path;
    if (path.startsWith("/api/tma/")) return path.replace("/api/tma", "");
    if (path.startsWith("/tma/")) return path;
    return path;
  }

  // TMA-specific methods (using tmaAxios)
  async getTMAPath(path, config = {}) {
    return this.tmaAxios.get(this.normalizePath(path), config);
  }

  async postTMAPath(path, data = {}, config = {}) {
    return this.tmaAxios.post(this.normalizePath(path), data, config);
  }

  // Main backend methods (using mainAxios)
  async getMainPath(path, config = {}) {
    return this.mainAxios.get(this.normalizePath(path), config);
  }

  async postMainPath(path, data = {}, config = {}) {
    return this.mainAxios.post(this.normalizePath(path), data, config);
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem("tma_token", token);
    } else {
      localStorage.removeItem("tma_token");
    }
  }

  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem("tma_token");
    }
    return this.token;
  }

  clearAuth() {
    this.token = null;
    localStorage.removeItem("tma_token");
    localStorage.removeItem("tma_user");
  }

  // Auth
  async authenticate() {
    const initData = telegram.getInitData();

    // If no initData (browser testing), use sandbox mode
    const authData = initData || "sandbox:1";

    const response = await this.tmaAxios.post("/auth", { init_data: authData });
    this.setToken(response.token);
    localStorage.setItem("tma_user", JSON.stringify(response.user));
    return response;
  }

  async getMe() {
    return this.tmaAxios.get("/me");
  }

  // Home — загружает популярные товары с main backend
  async getHome() {
    try {
      // Get popular products (bestsellers)
      const result = await this.mainAxios.get("/v2/products/search", {
        params: { sort: "pop", limit: 12, page: 1 },
      });

      return {
        bestsellers: result.items || result.products || [],
        new_arrivals: [],
      };
    } catch (e) {
      console.error("getHome error:", e);
      return { bestsellers: [], new_arrivals: [] };
    }
  }

  // Categories — вызывает /api/v2/catalog/tree на main backend
  async getCategories() {
    return this.mainAxios.get("/catalog/tree");
  }

  // Products — вызывает /api/v2/catalog/{slug}/products на main backend
  async getProducts(params = {}) {
    // Если params.category_id или params.slug, используем /v2/catalog/{slug}/products
    if (params.slug) {
      const slug = params.slug;
      delete params.slug;
      return this.mainAxios.get(`/catalog/${slug}/products`, { params });
    }
    // Fallback: generic search
    return this.mainAxios.get("/products", { params });
  }

  // Get single product from main backend
  async getProduct(id) {
    return this.mainAxios.get(`/products/${id}`);
  }

  // Search — вызывает main backend
  async searchSuggest(query) {
    return this.mainAxios.get("/v2/search/suggest", { params: { q: query } });
  }

  async searchProducts(query) {
    return this.mainAxios.get("/v2/search", { params: { q: query } });
  }

  // Cart (main backend)
  async previewCart(items) {
    return this.mainAxios.post("/v2/cart/preview", { items });
  }

  // Orders (TMA backend)
  async createOrder(data) {
    return this.tmaAxios.post("/orders", data);
  }

  async getOrders() {
    return this.tmaAxios.get("/orders");
  }

  async getOrder(id) {
    return this.tmaAxios.get(`/orders/${id}`);
  }

  async deleteOrder(id) {
    return this.tmaAxios.delete(`/orders/${id}`);
  }

  async simulatePayment(id) {
    return this.tmaAxios.post(`/orders/${id}/simulate-payment`);
  }

  // Favorites (main backend)
  async getFavorites() {
    return this.mainAxios.get("/v2/favorites");
  }

  async getFavoriteIds() {
    return this.mainAxios.get("/v2/favorites/ids");
  }

  async toggleFavorite(productId) {
    return this.mainAxios.post("/v2/favorites/toggle", {
      product_id: productId,
    });
  }

  // Reviews (main backend)
  async getProductReviews(productId) {
    return this.mainAxios.get(`/v2/products/${productId}/reviews`);
  }

  async createReview(data) {
    return this.mainAxios.post("/v2/reviews", data);
  }

  // Support (TMA backend)
  async getSupportTickets() {
    return this.tmaAxios.get("/support/my-tickets");
  }

  async createSupportTicket(data) {
    return this.tmaAxios.post("/support/ticket", data);
  }
}

export const api = new APIClient();
export default api;
