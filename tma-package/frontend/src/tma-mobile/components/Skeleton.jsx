/**
 * Skeleton Loader Component
 */

import React from 'react';

const Skeleton = ({ width = '100%', height = '20px', borderRadius = 'var(--radius-md)', style = {} }) => {
  return (
    <div
      className="tma-skeleton"
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
    />
  );
};

export const ProductCardSkeleton = () => {
  return (
    <div className="product-card">
      <Skeleton width="100%" height="200px" />
      <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <Skeleton width="80%" height="16px" />
        <Skeleton width="60%" height="24px" />
      </div>
    </div>
  );
};

export const ProductGridSkeleton = ({ count = 6 }) => {
  return (
    <div className="home__products-grid">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
};

export default Skeleton;
