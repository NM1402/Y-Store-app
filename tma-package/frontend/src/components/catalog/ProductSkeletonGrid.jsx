/**
 * ProductSkeletonGrid - скелетоны загрузки для товаров (B8 style)
 */
import React from "react";
import ProductCardSkeleton from "./ProductCardSkeleton";

export default function ProductSkeletonGrid({ count = 12 }) {
  return (
    <div className="ys-products-grid">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
