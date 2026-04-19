/**
 * Social Metrics & Pricing Helpers
 * Deterministic pseudo-random social proof / scarcity values.
 * Stable per product id — не прыгают между рендерами.
 */

function hashId(id) {
  const s = String(id || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Кол-во покупок за неделю (50-199), стабильно по id */
export function getWeeklyPurchases(productId) {
  const h = hashId(productId);
  return 50 + ((h * 7) % 150);
}

/**
 * Псевдо-остаток на складе (1-15).
 * Если в продукте уже есть stock>0 — используем его, иначе генерим.
 */
export function getStockLevel(product) {
  if (product && typeof product.stock === 'number' && product.stock > 0) {
    return product.stock;
  }
  const h = hashId(product?.id);
  return 1 + ((h * 3) % 15);
}

/** Кол-во людей, просматривающих товар сейчас (3-20) */
export function getViewersNow(productId) {
  const h = hashId(productId);
  return 3 + ((h * 11) % 18);
}

/** Ежемесячный платёж при оплате частями */
export function getMonthlyPrice(price, months = 24) {
  if (!price || price <= 0) return 0;
  return Math.ceil(price / months / 10) * 10;
}

/** Сумма экономии в корзине (по old_price) */
export function getCartSavings(items) {
  return (items || []).reduce((sum, item) => {
    const old = item.old_price || 0;
    const p = item.price || 0;
    const qty = item.quantity || 1;
    if (old > p) return sum + (old - p) * qty;
    return sum;
  }, 0);
}

/** Форматирование цены в UAH */
export function formatPrice(value) {
  return new Intl.NumberFormat('uk-UA').format(Math.round(value || 0));
}
