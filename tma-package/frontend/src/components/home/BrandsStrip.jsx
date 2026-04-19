/**
 * BrandsStrip - Popular Brands Carousel
 * Horizontal scrolling brand logos with images
 */
import React from "react";
import { Link } from "react-router-dom";

const brands = [
  { name: "Apple", slug: "apple", logo: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
  { name: "Samsung", slug: "samsung", logo: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
  { name: "Sony", slug: "sony", logo: "https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg" },
  { name: "LG", slug: "lg", logo: "https://upload.wikimedia.org/wikipedia/commons/2/20/LG_symbol.svg" },
  { name: "Xiaomi", slug: "xiaomi", logo: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_%282021-%29.svg" },
  { name: "Huawei", slug: "huawei", logo: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Huawei_Logo.svg" },
  { name: "Google", slug: "google", logo: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" },
  { name: "Microsoft", slug: "microsoft", logo: "https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg" },
  { name: "Dell", slug: "dell", logo: "https://upload.wikimedia.org/wikipedia/commons/4/48/Dell_Logo.svg" },
  { name: "HP", slug: "hp", logo: "https://upload.wikimedia.org/wikipedia/commons/a/ad/HP_logo_2012.svg" },
  { name: "Lenovo", slug: "lenovo", logo: "https://upload.wikimedia.org/wikipedia/commons/b/b8/Lenovo_logo_2015.svg" },
  { name: "ASUS", slug: "asus", logo: "https://upload.wikimedia.org/wikipedia/commons/2/2e/ASUS_Logo.svg" },
];

export default function BrandsStrip() {
  return (
    <section className="ys-brands-section" data-testid="brands-strip">
      <div className="ys-brands-header">
        <h2 className="ys-brands-title">Популярні бренди</h2>
      </div>
      
      <div className="ys-brands-carousel">
        <div className="ys-brands-track">
          {/* Double for seamless loop */}
          {[...brands, ...brands].map((brand, i) => (
            <Link 
              key={`${brand.slug}-${i}`}
              to={`/catalog?brand=${brand.slug}`}
              className="ys-brand-card"
              title={brand.name}
            >
              <div className="ys-brand-logo">
                <img 
                  src={brand.logo} 
                  alt={brand.name}
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <span className="ys-brand-fallback" style={{display: 'none'}}>
                  {brand.name.charAt(0)}
                </span>
              </div>
              <span className="ys-brand-name">{brand.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
