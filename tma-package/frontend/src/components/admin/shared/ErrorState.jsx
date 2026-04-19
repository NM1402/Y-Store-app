/**
 * ErrorState - Unified error component for admin
 * Use EVERYWHERE instead of inline error messages
 */
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../ui/button';

export default function ErrorState({ 
  title = 'Помилка',
  message = 'Сталася помилка. Спробуйте ще раз.',
  error = null,
  onRetry = null,
  showRetry = true,
  className = ''
}) {
  // Extract message from error object if provided
  const displayMessage = error?.message || message;

  return (
    <div 
      className={`flex flex-col items-center justify-center py-12 text-center ${className}`}
      data-testid="error-state"
    >
      <div className="rounded-full bg-red-100 p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm mb-4 max-w-md">{displayMessage}</p>
      {showRetry && onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Спробувати знову
        </Button>
      )}
    </div>
  );
}
