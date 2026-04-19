/**
 * Validators for Checkout
 * Блокуємо "4 цифри незрозумілі", емодзі, символи — лише літери, дефіси, апостроф і пробіл.
 */

// Буквы UA/RU/EN + " ' - space
const NAME_RE = /^[А-ЯЁІЇЄҐа-яёіїєґA-Za-z\s'\u2019-]+$/;
const CITY_RE = /^[А-ЯЁІЇЄҐа-яёіїєґA-Za-z\s'\u2019.\-()]+$/;

export function validateName(value, { minLen = 2, field = "Поле" } = {}) {
  const v = (value || '').trim();
  if (!v) return `${field} обов'язкове`;
  if (v.length < minLen) return `${field}: мінімум ${minLen} символи`;
  if (v.length > 40) return `${field} занадто довге`;
  if (/\d/.test(v)) return `${field} не повинно містити цифр`;
  if (!NAME_RE.test(v)) return `${field}: дозволені лише літери, дефіс та апостроф`;
  return null;
}

export function validateCity(value) {
  const v = (value || '').trim();
  if (!v) return "Оберіть місто зі списку";
  if (v.length < 2) return "Вкажіть принаймні 2 літери";
  if (!CITY_RE.test(v)) return "Місто має містити тільки літери";
  return null;
}

/**
 * Ukrainian Mobile Operators (2026)
 * Offline-перевірка префіксу. Для онлайн-перевірки існування номера
 * використовуйте бекенд-сервіси (не рекомендується на фронті).
 */
const UA_OPERATORS = {
  // Kyivstar
  '39': 'Київстар', '67': 'Київстар', '68': 'Київстар',
  '96': 'Київстар', '97': 'Київстар', '98': 'Київстар',
  // Vodafone (ex-MTS)
  '50': 'Vodafone', '66': 'Vodafone', '95': 'Vodafone', '99': 'Vodafone',
  // Lifecell
  '63': 'lifecell', '73': 'lifecell', '93': 'lifecell',
  // Intertelecom (CDMA, рідко, але валідний)
  '94': 'Intertelecom',
  // 3Mob (ex-Utel/PEOPLEnet)
  '91': '3Mob',
  // Ukrtelecom mobile / InMax
  '92': 'Ukrtelecom',
};

export function validatePhoneUA(value) {
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return "Вкажіть номер телефону";
  if (!digits.startsWith('380')) return "Номер має починатись з +380";
  if (digits.length !== 12) return "Невірна довжина номера (+380 XX XXX XX XX)";
  const op = digits.slice(3, 5);
  if (!UA_OPERATORS[op]) {
    const validCodes = Object.keys(UA_OPERATORS).sort().join(', ');
    return `Невідомий оператор. Дійсні коди: ${validCodes}`;
  }
  // Перевірка на "всі нулі" / "всі однакові цифри" — очевидно фейкові
  const subscriber = digits.slice(5);
  if (/^(\d)\1+$/.test(subscriber)) return "Номер виглядає несправжнім";
  if (subscriber === '0000000') return "Вкажіть реальний номер";
  return null;
}

/** Визначити оператора за номером (для UI-підказки) */
export function detectOperatorUA(value) {
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length < 5 || !digits.startsWith('380')) return null;
  return UA_OPERATORS[digits.slice(3, 5)] || null;
}

export function validateBranch(value, { cityRef } = {}) {
  const v = (value || '').trim();
  if (!v) return "Оберіть відділення зі списку";
  if (!cityRef) return "Спочатку оберіть місто";
  return null;
}

/** Capitalize first letter of each word — для красивого вводу ПІБ */
export function capitalizeName(value) {
  return (value || '')
    .replace(/[^А-ЯЁІЇЄҐа-яёіїєґA-Za-z\s'\u2019-]/g, '') // strip digits/symbols inline
    .split(' ')
    .map(w => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}
