/**
 * Recommendation Engine v1
 * Scoring-based product recommendations (Amazon-style)
 * Runs entirely client-side for instant performance
 */

/**
 * Calculate recommendation score for a product
 * Growth Layer v2: Segment-based personalization
 * @param {Object} product - Product to score
 * @param {Array} cart - Current cart items
 * @param {Array} viewed - Recently viewed product IDs
 * @param {Number} avgCartPrice - Average price in cart
 * @param {String} segment - User segment ('budget'|'mid'|'premium'|'unknown')
 * @returns {Number} - Recommendation score
 */
function calculateScore(product, cart, viewed, avgCartPrice, segment = 'unknown') {
  let score = 0;

  // 1. Base popularity (if available from backend)
  score += product.popularity || product.views || 0;

  // 2. Category match with cart
  if (cart.length > 0) {
    const cartCategories = cart.map(item => item.category).filter(Boolean);
    if (cartCategories.includes(product.category)) {
      score += 30;
    }
  }

  // 3. Price proximity (prefer similar price range)
  if (cart.length > 0 && avgCartPrice) {
    const priceDiff = Math.abs(product.price - avgCartPrice);
    const proximityScore = Math.max(0, 20 - (priceDiff / 1000));
    score += proximityScore;
  }

  // 4. Recently viewed bonus
  if (viewed.includes(product.id)) {
    score += 15;
  }

  // 5. GROWTH v2: Segment-based scoring
  if (segment === 'premium') {
    // Premium users: boost expensive items
    score += product.price * 0.002;
  } else if (segment === 'budget') {
    // Budget users: penalize expensive items
    score -= product.price * 0.002;
  }
  // Mid segment: no price bias

  // 6. Don't recommend items already in cart
  if (cart.find(item => item.product_id === product.id || item.id === product.id)) {
    score = 0;
  }

  return score;
}

/**
 * Get smart product recommendations
 * Growth Layer v2: Segment-aware recommendations
 * @param {Object} params
 * @param {Array} params.products - All available products
 * @param {Array} params.cart - Current cart items
 * @param {Array} params.viewed - Recently viewed product IDs
 * @param {String} params.segment - User segment
 * @param {Number} params.limit - Max recommendations to return
 * @returns {Array} - Sorted recommended products
 */
export function getRecommendations({
  products = [],
  cart = [],
  viewed = [],
  segment = 'unknown',
  limit = 6
}) {
  if (!products || products.length === 0) {
    return [];
  }

  // Calculate average cart price
  const avgCartPrice = cart.length > 0
    ? cart.reduce((sum, item) => sum + (item.price || 0), 0) / cart.length
    : 0;

  // Score all products with segment awareness
  const scoredProducts = products
    .map(product => ({
      ...product,
      score: calculateScore(product, cart, viewed, avgCartPrice, segment)
    }))
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scoredProducts;
}

/**
 * Get smart upsell product to reach free delivery threshold
 * @param {Object} params
 * @param {Array} params.products - All available products
 * @param {Number} params.currentTotal - Current cart total
 * @param {Number} params.threshold - Free delivery threshold
 * @returns {Object|null} - Recommended upsell product or null
 */
export function getSmartUpsell({
  products = [],
  currentTotal = 0,
  threshold = 2000
}) {
  if (currentTotal >= threshold) {
    return null;
  }

  const missing = threshold - currentTotal;
  const maxPrice = missing + 300; // Allow slight overspend

  // Find products in the right price range
  const candidates = products
    .filter(p => p.price >= missing && p.price <= maxPrice)
    .sort((a, b) => {
      // Prefer products closer to exact missing amount
      const aDiff = Math.abs(p.price - missing);
      const bDiff = Math.abs(b.price - missing);
      return aDiff - bDiff;
    });

  return candidates[0] || null;
}

/**
 * Sort catalog products by personalized relevance
 * @param {Object} params
 * @param {Array} params.products - Products to sort
 * @param {Array} params.cart - Current cart
 * @param {Array} params.viewed - Viewed history
 * @param {String} params.segment - User segment
 * @returns {Array} - Sorted products
 */
export function sortByRelevance({ products, cart, viewed, segment }) {
  return getRecommendations({
    products,
    cart,
    viewed,
    segment,
    limit: products.length
  });
}
