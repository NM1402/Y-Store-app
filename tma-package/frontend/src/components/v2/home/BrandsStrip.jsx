import React from "react";

export default function BrandsStrip({ brands = [] }) {
  return (
    <section className="v2-brands">
      <div className="container v2-brands-row">
        {brands.map((b, i) => (
          <div key={i} className="v2-brand-pill">{b}</div>
        ))}
      </div>
    </section>
  );
}
