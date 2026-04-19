/**
 * Analytics Tracker Service
 * Tracks user behavior, time on site, page views, interactions
 */

import axios from 'axios';

class AnalyticsTracker {
  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.currentPage = null;
    this.pageStartTime = null;
    this.sessionStartTime = Date.now();
    this.totalTimeOnSite = 0;
    this.pagesViewed = [];
    this.isActive = true;
    
    // Setup event listeners
    this.setupListeners();
    
    // Send data periodically
    this.startPeriodicSync();
  }

  getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  getUserId() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || 'anonymous';
  }

  setupListeners() {
    // Track page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseTracking();
      } else {
        this.resumeTracking();
      }
    });

    // Track before unload
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });

    // Track clicks on products
    document.addEventListener('click', (e) => {
      const productCard = e.target.closest('[data-testid^="product-card-"]');
      if (productCard) {
        const productId = productCard.getAttribute('data-testid').replace('product-card-', '');
        this.trackEvent('product_click', { product_id: productId });
      }
    });
  }

  trackPageView(pagePath, pageTitle = '', metadata = {}) {
    // End previous page tracking
    if (this.currentPage) {
      this.endPageView();
    }

    // Start new page tracking
    this.currentPage = pagePath;
    this.pageStartTime = Date.now();
    
    this.pagesViewed.push({
      page: pagePath,
      title: pageTitle,
      timestamp: new Date().toISOString(),
      ...metadata
    });

    // Send page view event
    this.sendEvent({
      event_type: 'page_view',
      page_path: pagePath,
      page_title: pageTitle,
      metadata: metadata
    });
  }

  endPageView() {
    if (!this.currentPage || !this.pageStartTime) return;

    const timeSpent = Date.now() - this.pageStartTime;
    
    this.sendEvent({
      event_type: 'page_leave',
      page_path: this.currentPage,
      time_spent: timeSpent
    });

    this.currentPage = null;
    this.pageStartTime = null;
  }

  trackEvent(eventType, data = {}) {
    this.sendEvent({
      event_type: eventType,
      ...data
    });
  }

  trackProductView(productId, productName, category, price) {
    this.sendEvent({
      event_type: 'product_view',
      product_id: productId,
      product_name: productName,
      category: category,
      price: price
    });
  }

  trackAddToCart(productId, quantity, price) {
    this.sendEvent({
      event_type: 'add_to_cart',
      product_id: productId,
      quantity: quantity,
      price: price
    });
  }

  trackAddToWishlist(productId) {
    this.sendEvent({
      event_type: 'add_to_wishlist',
      product_id: productId
    });
  }

  trackSearch(searchQuery, resultsCount) {
    this.sendEvent({
      event_type: 'search',
      query: searchQuery,
      results_count: resultsCount
    });
  }

  pauseTracking() {
    this.isActive = false;
    if (this.pageStartTime) {
      this.totalTimeOnSite += Date.now() - this.pageStartTime;
    }
  }

  resumeTracking() {
    this.isActive = true;
    if (this.currentPage) {
      this.pageStartTime = Date.now();
    }
  }

  async sendEvent(eventData) {
    try {
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/analytics/event`,
        {
          session_id: this.sessionId,
          user_id: this.getUserId(),
          timestamp: new Date().toISOString(),
          ...eventData
        }
      );
    } catch (error) {
      console.error('Failed to send analytics event:', error);
    }
  }

  startPeriodicSync() {
    // Send session data every 30 seconds
    this.syncInterval = setInterval(() => {
      if (this.isActive && this.currentPage) {
        const currentSessionTime = Date.now() - this.sessionStartTime;
        
        this.sendEvent({
          event_type: 'session_heartbeat',
          total_time: currentSessionTime,
          pages_viewed_count: this.pagesViewed.length,
          current_page: this.currentPage
        });
      }
    }, 30000); // Every 30 seconds
  }

  endSession() {
    // Calculate final session stats
    const sessionDuration = Date.now() - this.sessionStartTime;
    
    this.sendEvent({
      event_type: 'session_end',
      session_duration: sessionDuration,
      pages_viewed: this.pagesViewed.length,
      pages_list: this.pagesViewed
    });

    // Clear interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

// Create singleton instance
const analyticsTracker = new AnalyticsTracker();

export default analyticsTracker;
