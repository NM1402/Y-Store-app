/**
 * Analytics and Conversion Tracking Utilities
 * For Google Ads, Google Analytics, and other tracking platforms
 */

// Google Tag Manager / Google Ads Conversion Tracking
export const trackEvent = (eventName, eventData = {}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventData);
  }
  
  // Also send to dataLayer for GTM
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...eventData
    });
  }
};

// Track page views
export const trackPageView = (url) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'YOUR_GA_TRACKING_ID', {
      page_path: url
    });
  }
};

// E-commerce tracking for Google Ads
export const trackPurchase = (transactionData) => {
  trackEvent('purchase', {
    transaction_id: transactionData.orderId,
    value: transactionData.total,
    currency: 'UAH',
    items: transactionData.items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity
    }))
  });
};

export const trackAddToCart = (product) => {
  trackEvent('add_to_cart', {
    currency: 'UAH',
    value: product.price,
    items: [{
      item_id: product.id,
      item_name: product.name,
      price: product.price,
      quantity: 1
    }]
  });
};

export const trackViewItem = (product) => {
  trackEvent('view_item', {
    currency: 'UAH',
    value: product.price,
    items: [{
      item_id: product.id,
      item_name: product.name,
      price: product.price
    }]
  });
};

export const trackBeginCheckout = (cartData) => {
  trackEvent('begin_checkout', {
    currency: 'UAH',
    value: cartData.total,
    items: cartData.items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity
    }))
  });
};

// Track phone number clicks (valuable for Google Ads)
export const trackPhoneClick = () => {
  trackEvent('phone_click', {
    event_category: 'engagement',
    event_label: 'phone_number_click'
  });
};

// Track catalog interactions
export const trackCatalogOpen = () => {
  trackEvent('catalog_open', {
    event_category: 'navigation'
  });
};

export const trackCategoryView = (categoryName) => {
  trackEvent('view_item_list', {
    item_list_name: categoryName,
    event_category: 'category_view'
  });
};

// Track search queries
export const trackSearch = (searchTerm) => {
  trackEvent('search', {
    search_term: searchTerm
  });
};

// Track user registration
export const trackSignUp = (method = 'email') => {
  trackEvent('sign_up', {
    method: method
  });
};

// Track login
export const trackLogin = (method = 'email') => {
  trackEvent('login', {
    method: method
  });
};

export default {
  trackEvent,
  trackPageView,
  trackPurchase,
  trackAddToCart,
  trackViewItem,
  trackBeginCheckout,
  trackPhoneClick,
  trackCatalogOpen,
  trackCategoryView,
  trackSearch,
  trackSignUp,
  trackLogin
};
