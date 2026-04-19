import React from "react";
import { Link } from "react-router-dom";

export default function PromoGrid({ tiles = [], lang = "uk" }) {
  return (
    <section className="v2-promogrid">
      <div className="container v2-pg-grid">
        {tiles.map((t, idx) => (
          <Link
            to={t.href || "/catalog"}
            key={idx}
            className={`v2-pg-tile v2-pg-${t.size || "md"}`}
            style={{ backgroundImage: `url(${t.image})` }}
          >
            <div className="v2-pg-overlay" />
            <div className="v2-pg-content">
              {t.badge && <div className="v2-pg-badge">{t.badge?.[lang] || t.badge}</div>}
              <div className="v2-pg-title">{t.title?.[lang] || t.title}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
