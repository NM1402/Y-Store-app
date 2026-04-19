/**
 * LoadingState - Unified loading component for admin
 * Use EVERYWHERE instead of inline spinners
 */
import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ 
  text = 'Завантаження...', 
  size = 'default',
  className = '' 
}) {
  const sizeClasses = {
    small: 'h-6 w-6',
    default: 'h-10 w-10',
    large: 'h-14 w-14'
  };

  return (
    <div 
      className={`flex flex-col items-center justify-center py-12 ${className}`}
      data-testid="loading-state"
    >
      <Loader2 className={`${sizeClasses[size]} text-blue-600 animate-spin`} />
      {text && <p className="mt-3 text-gray-500 text-sm">{text}</p>}
    </div>
  );
}
