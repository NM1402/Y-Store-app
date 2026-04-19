import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function BlogTeasers({ title, items = [], lang = "uk" }) {
  return (
    <section className="v2-blog">
      <div className="container">
        <div className="v2-section-title">{title?.[lang] || title}</div>
        <div className="v2-blog-grid">
          {items.map((it, i) => (
            <Link key={i} to={it.href || "#"} className="v2-blog-card">
              <div className="v2-blog-h">{it.title?.[lang] || it.title}</div>
              <div className="v2-blog-more">
                {lang === "uk" ? "Читати" : "Читать"} <ArrowRight size={14} style={{ display: "inline" }} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
