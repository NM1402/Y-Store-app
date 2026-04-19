/**
 * Empty State Component - Premium Design
 * Использует Lucide иконки вместо эмодзи
 */

import React from 'react';
import './Empty.css';

const Empty = ({ icon, title, description, actionText, onAction }) => {
  return (
    <div className="empty-state" data-testid="empty-state">
      <div className="empty-state__icon">
        {icon}
      </div>
      <h3 className="empty-state__title">{title}</h3>
      {description && (
        <p className="empty-state__description">{description}</p>
      )}
      {actionText && onAction && (
        <button 
          className="empty-state__action" 
          onClick={onAction}
          data-testid="empty-state-action"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default Empty;
