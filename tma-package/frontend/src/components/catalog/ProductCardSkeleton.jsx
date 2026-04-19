import React from "react";

export default function ProductCardSkeleton() {
  return (
    <div className="ys-pcard ys-pcard-skel" aria-hidden="true">
      <div className="ys-pcard-media">
        <div className="ys-skel ys-skel-badge" />
        <div className="ys-skel ys-skel-actions" />
        <div className="ys-imgbox">
          <div className="ys-skel ys-skel-img" />
        </div>
      </div>

      <div className="ys-pcard-body">
        <div className="ys-skel ys-skel-title" />
        <div className="ys-skel ys-skel-title short" />

        <div className="ys-pcard-meta">
          <div className="ys-skel ys-skel-chip" />
          <div className="ys-skel ys-skel-chip" />
        </div>

        <div className="ys-pcard-footer">
          <div>
            <div className="ys-skel ys-skel-price" />
            <div className="ys-skel ys-skel-old" />
          </div>
          <div className="ys-skel ys-skel-btn" />
        </div>
      </div>
    </div>
  );
}
