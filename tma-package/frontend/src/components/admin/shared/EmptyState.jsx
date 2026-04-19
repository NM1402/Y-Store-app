/**
 * EmptyState - Unified empty data component for admin
 */
import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '../../ui/button';

export default function EmptyState({ 
  icon: Icon = Inbox,
  title = 'Немає даних',
  message = 'Тут поки що нічого немає.',
  action = null,
  actionLabel = 'Додати',
  className = ''
}) {
  return (
    <div 
      className={`flex flex-col items-center justify-center py-12 text-center ${className}`}
      data-testid="empty-state"
    >
      <div className="rounded-full bg-gray-100 p-4 mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm mb-4 max-w-md">{message}</p>
      {action && (
        <Button onClick={action}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
