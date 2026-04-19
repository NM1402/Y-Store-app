import React, { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';

/**
 * Cookie consent banner - non-blocking, bottom of screen
 * Only Ukrainian language, no language selection
 */
const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if already accepted
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (cookieConsent === 'accepted') {
      setIsVisible(false);
      return;
    }
    
    // Show banner for new users
    setIsVisible(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    localStorage.setItem('welcomeCompleted', 'true');
    setIsVisible(false);
  };

  const handleClose = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    localStorage.setItem('welcomeCompleted', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div 
      data-testid="cookie-banner"
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-in slide-in-from-bottom duration-500"
    >
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl border border-gray-200 p-4 flex flex-col sm:flex-row items-center gap-4">
        {/* Cookie Icon & Text */}
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <Cookie className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-700">
              Ми використовуємо файли cookie для покращення вашого досвіду на сайті.{' '}
              <a href="/terms" className="text-blue-600 hover:underline">
                Політика конфіденційності
              </a>
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleAccept}
            data-testid="cookie-accept-btn"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-full transition-all duration-300 hover:scale-105 text-sm shadow-md"
          >
            Прийняти
          </button>
          <button
            onClick={handleClose}
            data-testid="cookie-close-btn"
            className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-300"
            aria-label="Закрити"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Export with old name for compatibility
export default CookieBanner;
