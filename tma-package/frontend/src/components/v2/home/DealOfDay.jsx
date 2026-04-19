import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Clock, ShoppingCart } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

function msLeft(endsAtISO) {
  const t = new Date(endsAtISO).getTime();
  return Math.max(0, t - Date.now());
}

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (x) => String(x).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export default function DealOfDay({ title, productId, endsAtISO, discountPercent = 10, lang = "uk" }) {
  const [product, setProduct] = useState(null);
  const [left, setLeft] = useState(0);

  const endISO = useMemo(() => {
    if (endsAtISO) return endsAtISO;
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }, [endsAtISO]);

  useEffect(() => {
    const tick = () => setLeft(msLeft(endISO));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endISO]);

  useEffect(() => {
    const load = async () => {
      try {
        if (productId) {
          const r = await axios.get(`${API_URL}/api/products/${productId}`);
          setProduct(r.data);
          return;
        }
        // Fallback: get best-seller
        const r = await axios.get(`${API_URL}/api/products?limit=1&sort_by=rating&sort_order=desc`);
        const products = r.data?.items || r.data?.products || r.data || [];
        setProduct(Array.isArray(products) ? products[0] : null);
      } catch {
        setProduct(null);
      }
    };
    load();
  }, [productId]);

  if (!product) return null;

  const oldPrice = product.price || 0;
  const newPrice = Math.round(oldPrice * (1 - discountPercent / 100));
  const mainImage = product.images?.[0] || product.image || "";

  return (
    <section className="v2-deal">
      <div className="container v2-deal-wrap">
        <div className="v2-deal-left">
          <div className="v2-deal-title">
            <Clock size={20} style={{ display: "inline", marginRight: 8 }} />
            {title?.[lang] || title || (lang === "uk" ? "Товар дня" : "Товар дня")}
          </div>
          <div className="v2-deal-timer">{fmt(left)}</div>
          <div className="v2-deal-name">{product.name}</div>

          <div className="v2-deal-prices">
            <span className="v2-deal-new">{newPrice.toLocaleString()} грн</span>
            <span className="v2-deal-old">{oldPrice.toLocaleString()} грн</span>
            <span className="v2-deal-badge">-{discountPercent}%</span>
          </div>

          <Link to={`/product/${product.id}`} className="v2-deal-cta">
            <ShoppingCart size={16} style={{ marginRight: 6 }} />
            {lang === "uk" ? "Переглянути" : "Посмотреть"}
          </Link>
        </div>

        <div className="v2-deal-right">
          {mainImage && <img src={mainImage} alt={product.name} />}
        </div>
      </div>
    </section>
  );
}
