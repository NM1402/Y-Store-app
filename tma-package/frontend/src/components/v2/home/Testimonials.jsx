import React from "react";
import { Star } from "lucide-react";

export default function Testimonials({ title, items = [], lang = "uk" }) {
  return (
    <section className="v2-testimonials">
      <div className="container">
        <div className="v2-section-title">{title?.[lang] || title}</div>
        <div className="v2-t-grid">
          {items.map((t, i) => (
            <div key={i} className="v2-t-card">
              <div className="v2-t-top">
                <div className="v2-t-name">{t.name}</div>
                <div className="v2-t-stars">
                  {[...Array(t.rating || 5)].map((_, idx) => (
                    <Star key={idx} size={14} fill="#f59e0b" stroke="#f59e0b" />
                  ))}
                </div>
              </div>
              <div className="v2-t-text">{t.text?.[lang] || t.text}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
