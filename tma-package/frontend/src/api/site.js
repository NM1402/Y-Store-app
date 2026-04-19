/**
 * Site Settings API - Header config, socials
 * Refactored to use apiClient
 */
import apiClient from '../utils/api/apiClient';

// Default header config (fallback)
export const defaultHeaderConfig = {
  showTopbar: true,
  topbarStyle: "dark",
  phones: ["+380502474161", "+380637247703"],
  socials: [
    { type: "telegram", url: "https://t.me/ystore", enabled: true },
    { type: "instagram", url: "https://instagram.com/ystore", enabled: true },
    { type: "tiktok", url: "https://tiktok.com/@ystore", enabled: true },
    { type: "facebook", url: "https://facebook.com/ystore", enabled: true },
  ],
  workingHours: "Пн-Пт: 9:00-19:00, Сб: 10:00-17:00"
};

/**
 * Phone validation - Ukrainian format
 */
export const validatePhone = (phone) => {
  // Ukrainian phone: +380XXXXXXXXX or 0XXXXXXXXX
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  const uaRegex = /^(\+?38)?0\d{9}$/;
  return uaRegex.test(cleanPhone);
};

/**
 * Normalize phone to +380 format
 */
export const normalizePhone = (phone) => {
  const clean = phone.replace(/[\s\-\(\)]/g, '');
  if (clean.startsWith('+380')) return clean;
  if (clean.startsWith('380')) return '+' + clean;
  if (clean.startsWith('0')) return '+38' + clean;
  return clean;
};

/**
 * Social URL validation by type
 */
export const validateSocialUrl = (type, url) => {
  const patterns = {
    telegram: /^https?:\/\/(t\.me|telegram\.me)\/.+/i,
    instagram: /^https?:\/\/(www\.)?instagram\.com\/.+/i,
    facebook: /^https?:\/\/(www\.)?facebook\.com\/.+/i,
    tiktok: /^https?:\/\/(www\.)?tiktok\.com\/@?.+/i,
    youtube: /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/i,
    viber: /^viber:\/\/|^https?:\/\/invite\.viber\.com\/.+/i,
  };
  
  const pattern = patterns[type];
  if (!pattern) return true; // Unknown type - allow any URL
  return pattern.test(url);
};

/**
 * Get header configuration from API
 * Returns fallback on error
 */
export async function getHeaderConfig() {
  try {
    const res = await apiClient.get('/v2/site/header');
    return res.data;
  } catch (error) {
    console.warn('Using default header config:', error);
    return defaultHeaderConfig;
  }
}

/**
 * Admin: Get all site settings
 */
export async function getSiteSettings() {
  const res = await apiClient.get('/v2/admin/site-settings');
  return res.data;
}

/**
 * Admin: Update site settings
 */
export async function updateSiteSettings(settings) {
  const res = await apiClient.patch('/v2/admin/site-settings', settings);
  return res.data;
}

/**
 * Admin: Update phones only
 */
export async function updatePhones(phones) {
  // Validate and normalize
  const validPhones = phones
    .filter(p => p && validatePhone(p))
    .map(p => normalizePhone(p));
  
  if (validPhones.length === 0) {
    throw new Error('Потрібен хоча б один валідний телефон');
  }
  
  return updateSiteSettings({ header: { phones: validPhones } });
}

/**
 * Admin: Update social links only
 */
export async function updateSocialLinks(socials) {
  // Validate URLs
  for (const social of socials) {
    if (social.url && !validateSocialUrl(social.type, social.url)) {
      throw new Error(`Невірна URL для ${social.type}`);
    }
  }
  
  return updateSiteSettings({ header: { socials } });
}
