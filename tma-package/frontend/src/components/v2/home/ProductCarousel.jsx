import React, { useEffect, useState } from "react";
import axios from "axios";
import ProductCard from "../../ProductCard";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ProductCarousel({ title, mode = "best_sellers", limit = 12, lang = "uk" }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        let url = `${API_URL}/api/products?limit=${limit}`;
        
        if (mode === "best_sellers") {
          url += "&sort_by=rating&sort_order=desc";
        } else if (mode === "discounted") {
          url += "&has_discount=true";
        } else if (mode === "new") {
          url += "&sort_by=created_at&sort_order=desc";
        }
        
        const r = await axios.get(url);
        const items = r.data?.items || r.data?.products || r.data || [];
        setProducts(Array.isArray(items) ? items : []);
      } catch (err) {
        console.error("Failed to load products:", err);
      }
    };
    load();
  }, [mode, limit]);

  if (!products.length) return null;

  return (
    <section className="py-6">
      <div className="container">
        <div className="v2-section-title">{title?.[lang] || title}</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
