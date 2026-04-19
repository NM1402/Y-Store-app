/**
 * AI Service - Secure Backend Integration
 * 
 * ✅ SECURE: All API calls go through backend proxy
 * No API keys exposed on frontend
 */

import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Get auth token from localStorage
const getAuthToken = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.token || null;
};

// Create axios instance with auth
const createAuthenticatedRequest = () => {
  const token = getAuthToken();
  return {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  };
};

/**
 * Generate product description via secure backend
 * @param {Object} params - Product parameters
 * @param {string} params.productName - Product name
 * @param {string} params.category - Product category
 * @param {number} params.price - Product price (optional)
 * @param {Array} params.features - Product features (optional)
 * @returns {Promise<Object>} Generated description
 */
export const generateProductDescription = async ({ productName, category, price, features = [] }) => {
  try {
    const config = createAuthenticatedRequest();
    
    const response = await axios.post(
      `${API_URL}/api/ai/generate-description`,
      {
        product_name: productName,
        category: category,
        price: price,
        features: features
      },
      config
    );

    return {
      success: true,
      description: response.data.description,
      shortDescription: response.data.short_description
    };
  } catch (error) {
    console.error('Error generating description:', error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message
    };
  }
};

/**
 * Generate AI product recommendations via secure backend
 * @param {Object} params - Recommendation parameters
 * @param {string} params.productName - Current product name
 * @param {string} params.category - Product category
 * @param {number} params.price - Product price
 * @param {Array} params.availableProducts - List of available products
 * @returns {Promise<Array>} Recommended product IDs with reasons
 */
export const generateProductRecommendations = async ({ productName, category, price, availableProducts = [] }) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/ai/recommendations`,
      {
        product_name: productName,
        category: category,
        price: price,
        available_products: availableProducts
      }
    );

    return {
      success: true,
      recommendations: response.data.recommendations || []
    };
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return {
      success: false,
      recommendations: [],
      error: error.response?.data?.detail || error.message
    };
  }
};

/**
 * AI Chatbot for customer support via secure backend
 * @param {Array} messages - Chat history
 * @param {Object} context - Additional context (cart, user, etc.)
 * @returns {Promise<Object>} AI response
 */
export const chatWithAI = async (messages, context = {}) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/ai/chat`,
      {
        messages: messages,
        context: context
      }
    );

    return {
      success: true,
      message: response.data.message
    };
  } catch (error) {
    console.error('Error in chat:', error);
    return {
      success: false,
      message: "Извините, произошла ошибка. Попробуйте позже или свяжитесь с поддержкой.",
      error: error.response?.data?.detail || error.message
    };
  }
};

/**
 * Generate SEO-optimized title and meta description via secure backend
 * @param {Object} params - Product parameters
 * @param {string} params.productName - Product name
 * @param {string} params.category - Product category
 * @param {Array} params.features - Product features (optional)
 * @returns {Promise<Object>} SEO texts
 */
export const generateSEO = async ({ productName, category, features = [] }) => {
  try {
    const config = createAuthenticatedRequest();
    
    const response = await axios.post(
      `${API_URL}/api/ai/seo`,
      {
        product_name: productName,
        category: category,
        features: features
      },
      config
    );

    return {
      success: true,
      title: response.data.title,
      metaDescription: response.data.metaDescription,
      keywords: response.data.keywords || []
    };
  } catch (error) {
    console.error('Error generating SEO:', error);
    return {
      success: false,
      error: error.response?.data?.detail || error.message
    };
  }
};

export default {
  generateProductDescription,
  generateProductRecommendations,
  chatWithAI,
  generateSEO
};
