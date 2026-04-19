/**
 * Loading Component
 */

import React from 'react';

const Loading = ({ text = 'Завантаження...' }) => {
  return (
    <div className="tma-loading">
      <div style={{ textAlign: 'center' }}>
        <div className="tma-spinner" />
        <p className="tma-text-sm tma-text-hint" style={{ marginTop: 'var(--space-3)' }}>
          {text}
        </p>
      </div>
    </div>
  );
};

export default Loading;
