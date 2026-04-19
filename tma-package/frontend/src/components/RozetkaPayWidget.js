import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';

const RozetkaPayWidget = ({ 
  amount, 
  onTokenReceived, 
  customerEmail,
  customerId,
  onError 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [widgetKey, setWidgetKey] = useState(null);
  const widgetRef = useRef(null);
  const widgetInstanceRef = useRef(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Fetch widget key from backend
    const fetchWidgetKey = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/payment/rozetkapay/widget-key`);
        const data = await response.json();
        
        // Check if widget key is valid (not placeholder)
        if (data.widget_key && data.widget_key !== 'test_widget_key_placeholder' && data.widget_key.length > 10) {
          setWidgetKey(data.widget_key);
        } else {
          console.warn('Widget key is not configured properly');
          toast.error('Платіжний виджет недоступний. Використовуйте інший метод оплати.');
          setIsLoading(false);
          if (onError) onError(new Error('Widget key not configured'));
        }
      } catch (error) {
        console.error('Error fetching widget key:', error);
        toast.error('Помилка завантаження платіжної форми');
        setIsLoading(false);
        if (onError) onError(error);
      }
    };

    fetchWidgetKey();
  }, [onError]);

  useEffect(() => {
    // Load RozetkaPay widget script
    if (!widgetKey || scriptLoadedRef.current) return;

    const loadScript = () => {
      // Check if script already exists
      const existingScript = document.querySelector('script[src="https://cdn.rozetkapay.com/widget.js"]');
      if (existingScript) {
        scriptLoadedRef.current = true;
        setIsLoading(false);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.rozetkapay.com/widget.js';
      script.async = true;
      script.onload = () => {
        scriptLoadedRef.current = true;
        setIsLoading(false);
        console.log('RozetkaPay widget script loaded');
      };
      script.onerror = () => {
        console.error('Failed to load RozetkaPay widget script');
        toast.error('Не вдалося завантажити платіжну форму. Спробуйте інший метод оплати.');
        if (onError) onError(new Error('Script load failed'));
        setIsLoading(false);
      };
      
      // Add error handler to catch any runtime errors
      window.addEventListener('error', (event) => {
        if (event.filename && event.filename.includes('rozetkapay')) {
          console.error('RozetkaPay widget error:', event.message);
          event.preventDefault(); // Prevent default error display
        }
      }, true);

      document.body.appendChild(script);
    };

    loadScript();

    return () => {
      // Cleanup widget on unmount
      if (widgetInstanceRef.current) {
        try {
          widgetInstanceRef.current.close();
        } catch (e) {
          console.error('Error closing widget:', e);
        }
      }
    };
  }, [widgetKey, onError]);

  useEffect(() => {
    // Initialize widget when script is loaded
    if (isLoading || !widgetKey || !window.RPayCardWidget) return;

    const initWidget = () => {
      try {
        console.log('Initializing RozetkaPay widget...');
        
        // Wait for widget function to be available
        const checkWidget = () => {
          if (window.RPayCardWidget && typeof window.RPayCardWidget.init === 'function') {
            const widget = window.RPayCardWidget.init({
              key: widgetKey,
              amount: amount || 0,
              mode: 'inline',
              lang: 'uk',
              style: 'evo',
              type: 'full_card',
              selector: 'rozetkapay-widget-container',
              customer_email: customerEmail,
              customer_id: customerId,
              onToken: function(tokenData) {
                console.log('Token received from RozetkaPay:', tokenData);
                if (onTokenReceived) {
                  onTokenReceived({
                    token: tokenData.token,
                    expires_at: tokenData.expires_at,
                    card_mask: tokenData.card_mask
                  });
                }
              }
            });

            widgetInstanceRef.current = widget;
            
            // Listen for widget events
            document.addEventListener('widget-init-ready', () => {
              console.log('Widget initialized successfully');
              widget.open();
            });

            document.addEventListener('widget-init-error', (e) => {
              console.error('Widget initialization error:', e.detail);
              toast.error('Помилка ініціалізації платіжної форми');
              if (onError) onError(e.detail);
            });
          } else {
            setTimeout(checkWidget, 100);
          }
        };

        checkWidget();
      } catch (error) {
        console.error('Error initializing widget:', error);
        toast.error('Помилка ініціалізації платіжної форми');
        if (onError) onError(error);
      }
    };

    // Use __onWidgetReady callback as per RozetkaPay docs
    window.__onWidgetReady = initWidget;
    
    // If script already loaded, init immediately
    if (window.RPayCardWidget) {
      initWidget();
    }

    return () => {
      delete window.__onWidgetReady;
    };
  }, [isLoading, widgetKey, amount, customerEmail, customerId, onTokenReceived, onError]);

  return (
    <div className="rozetkapay-widget-wrapper">
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <span className="ml-3 text-gray-600">Завантаження платіжної форми...</span>
        </div>
      )}
      
      <div 
        id="rozetkapay-widget-container" 
        ref={widgetRef}
        className={isLoading ? 'hidden' : 'block'}
      />
      
      <style jsx>{`
        .rozetkapay-widget-wrapper {
          min-height: 200px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          background: white;
        }
      `}</style>
    </div>
  );
};

export default RozetkaPayWidget;
