/**
 * PromoGrid - Hot Offers Grid
 * 4 compact category cards with gradient backgrounds
 */
import React from "react";
import { Link } from "react-router-dom";
import { Smartphone, Laptop, Tv, Headphones, ArrowRight, Percent } from "lucide-react";

const PromoGrid = () => {
  const promos = [
    {
      title: "Смартфони",
      subtitle: "До -30%",
      category: "smartphones",
      bgColor: "#8b5cf6",
      image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop",
      icon: Smartphone,
    },
    {
      title: "Ноутбуки",
      subtitle: "USB-C зарядка",
      category: "laptops",
      bgColor: "#3b82f6",
      image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop",
      icon: Laptop,
    },
    {
      title: "Телевізори",
      subtitle: "4K / Smart TV",
      category: "tv",
      bgColor: "#10b981",
      image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=300&fit=crop",
      icon: Tv,
    },
    {
      title: "Аксесуари",
      subtitle: "До -50%",
      category: "accessories",
      bgColor: "#f97316",
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop",
      icon: Headphones,
    },
  ];

  return (
    <section className="ys-hot-offers" data-testid="promo-grid">
      <div className="ys-hot-header">
        <h2 className="ys-hot-title">
          <Percent className="w-6 h-6" />
          Гарячі пропозиції
        </h2>
      </div>
      
      <div className="ys-hot-grid">
        {promos.map((p, index) => (
          <Link
            key={index}
            to={`/catalog?category=${p.category}`}
            className="ys-hot-card"
            style={{ '--card-color': p.bgColor }}
            data-testid={`promo-card-${p.category}`}
          >
            {/* Background Image */}
            <div className="ys-hot-bg">
              <img src={p.image} alt={p.title} loading="lazy" />
              <div className="ys-hot-overlay" style={{ background: `linear-gradient(135deg, ${p.bgColor}dd 0%, ${p.bgColor}99 100%)` }} />
            </div>
            
            {/* Content */}
            <div className="ys-hot-content">
              <div className="ys-hot-icon">
                <p.icon size={28} strokeWidth={1.5} />
              </div>
              <div className="ys-hot-text">
                <h3 className="ys-hot-name">{p.title}</h3>
                <span className="ys-hot-discount">{p.subtitle}</span>
              </div>
              <div className="ys-hot-arrow">
                <ArrowRight size={20} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default PromoGrid;
