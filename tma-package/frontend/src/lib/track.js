/**
 * Lightweight Analytics Track SDK
 * Sends events to /api/v2/analytics/event
 */
import axios from 'axios';

const getSid = () => {
  let sid = localStorage.getItem('analytics_sid');
  if (!sid) {
    sid = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem('analytics_sid', sid);
  }
  return sid;
};

const getUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || null;
  } catch {
    return null;
  }
};

/**
 * Track an analytics event
 * @param {string} event - Event name (page_view, product_view, add_to_cart, etc.)
 * @param {object} payload - Additional event data
 */
export async function track(event, payload = {}) {
  const sid = getSid();
  const body = {
    event,
    sid,
    user_id: getUserId(),
    page: window.location.pathname,
    ref: document.referrer || null,
    ...payload,
  };
  
  try {
    await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/v2/analytics/event`, body);
  } catch (error) {
    // Silent fail - don't interrupt user experience
    console.debug('Analytics track error:', error.message);
  }
}

// Convenience methods
export const trackPageView = (pagePath, pageTitle) => 
  track('page_view', { page: pagePath, page_title: pageTitle });

export const trackProductView = (productId, productName, price) =>
  track('product_view', { product_id: productId, product_name: productName, price });

export const trackAddToCart = (productId, quantity, price) =>
  track('add_to_cart', { product_id: productId, quantity, price });

export const trackCheckoutStart = () =>
  track('checkout_start');

export const trackOrderCreated = (orderId, total) =>
  track('order_created', { order_id: orderId, total });

export const trackPaymentCreated = (orderId, method) =>
  track('payment_created', { order_id: orderId, payment_method: method });

export const trackPaymentPaid = (orderId) =>
  track('payment_paid', { order_id: orderId });

export default {
  track,
  trackPageView,
  trackProductView,
  trackAddToCart,
  trackCheckoutStart,
  trackOrderCreated,
  trackPaymentCreated,
  trackPaymentPaid
};
