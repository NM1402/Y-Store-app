/**
 * Home v2.1 — премиум-хедер, hero с overlay, фикс-пиллы категорий
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Lightbulb, Sparkles, HeartPulse, Flame, Cpu, Shield, Package, RotateCcw, CreditCard, Eye } from 'lucide-react';
import api from '../lib/api-client';
import telegram from '../lib/telegram-sdk';
import useUserStore from '../store/user';
import ProductCard from '../components/ProductCard-v2';
import Page from '../components/Page';
import './Home-v2.css';

export default function HomeV2() {
  const navigate = useNavigate();
  const { viewed } = useUserStore();

  const [bestsellers, setBestsellers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await api.getHome();
      setBestsellers((data.bestsellers || []).slice(0, 6));
      setAllProducts((data.bestsellers || []).concat(data.new_arrivals || []));

      setCategories([
        { id: 'appliances', name: 'Побутова техніка', icon: 'Home' },
        { id: 'lighting', name: 'Освітлення', icon: 'Lightbulb' },
        { id: 'beauty', name: 'Краса', icon: 'Sparkles' },
        { id: 'health', name: "Здоров'я", icon: 'HeartPulse' },
        { id: 'blackout', name: 'Свічки та блекаут', icon: 'Flame' },
        { id: 'electronics', name: 'Електроніка', icon: 'CpuIcon' },
        { id: 'military', name: 'Для військових', icon: 'Shield' },
      ]);
    } catch (e) {
      console.error('Failed to load home:', e);
      telegram.showAlert('Помилка завантаження');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryId) => {
    telegram.haptic('light');
    navigate(`/tma/catalog?category=${categoryId}`);
  };

  const renderIcon = (iconName) => {
    const iconProps = { size: 18, strokeWidth: 2 };
    switch (iconName) {
      case 'Home': return <Home {...iconProps} />;
      case 'Lightbulb': return <Lightbulb {...iconProps} />;
      case 'Sparkles': return <Sparkles {...iconProps} />;
      case 'HeartPulse': return <HeartPulse {...iconProps} />;
      case 'Flame': return <Flame {...iconProps} />;
      case 'CpuIcon': return <Cpu {...iconProps} />;
      case 'Shield': return <Shield {...iconProps} />;
      default: return null;
    }
  };

  const recentlyViewed = allProducts.filter(p => viewed.includes(p.id)).slice(0, 6);

  return (
    <Page>
      <div className="home-v2" data-testid="home-screen">
        {/* RICH HEADER — logo + title + subtitle */}
        <div className="home-v2__header" data-testid="home-header">
          <div className="home-v2__logo" aria-hidden="true">
            <img src="/ystore-logo.jpg" alt="Y-Store" />
          </div>
          <div className="home-v2__header-text">
            <div className="home-v2__header-title">Y-Store</div>
            <div className="home-v2__header-sub">Український маркетплейс</div>
          </div>
        </div>

        {/* HERO */}
        <div
          className="home-v2__hero"
          onClick={() => navigate('/tma/catalog')}
          data-testid="home-hero"
        >
          <img
            src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80"
            alt="Hero"
            className="home-v2__hero-img"
          />
          <div className="home-v2__hero-overlay">
            <div className="home-v2__hero-badge">
              <Flame size={14} />
              <span>Знижки до −30%</span>
            </div>
            <h2 className="home-v2__hero-title">Усе для дому та тилу</h2>
            <p className="home-v2__hero-sub">Тисячі товарів — від кухні до блекауту</p>
            <button className="home-v2__hero-btn" data-testid="home-hero-cta">Відкрити каталог</button>
          </div>
        </div>

        {/* CATEGORIES — fixed 44px pills */}
        <div className="home-v2__section">
          <div className="home-v2__section-title">Категорії</div>
          <div className="home-v2__chips">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className="home-v2__chip"
                onClick={() => handleCategoryClick(cat.id)}
                data-testid={`category-chip-${cat.id}`}
              >
                {renderIcon(cat.icon)}
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* RECENTLY VIEWED — retention */}
        {recentlyViewed.length > 0 && (
          <div className="home-v2__section">
            <div className="home-v2__section-header">
              <div className="home-v2__section-title">
                <Eye size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Ви дивились
              </div>
            </div>
            <div className="home-v2__scroll-row">
              {recentlyViewed.map((p) => (
                <div key={p.id} className="home-v2__scroll-item">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BESTSELLERS */}
        <div className="home-v2__section">
          <div className="home-v2__section-header">
            <div className="home-v2__section-title">Хіти продажу</div>
            <button
              className="home-v2__section-link"
              onClick={() => navigate('/tma/catalog')}
              data-testid="home-see-all"
            >
              Всі →
            </button>
          </div>

          {loading ? (
            <div className="home-v2__grid">
              {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton-card" />)}
            </div>
          ) : (
            <div className="home-v2__grid" data-testid="home-bestsellers">
              {bestsellers.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        {/* BENEFITS */}
        <div className="home-v2__benefits">
          <div className="home-v2__benefit">
            <div className="home-v2__benefit-icon"><Package size={22} /></div>
            <div className="home-v2__benefit-text">
              <div className="home-v2__benefit-title">Швидка доставка</div>
              <div className="home-v2__benefit-sub">Новою Поштою 1–2 дні</div>
            </div>
          </div>
          <div className="home-v2__benefit">
            <div className="home-v2__benefit-icon"><RotateCcw size={22} /></div>
            <div className="home-v2__benefit-text">
              <div className="home-v2__benefit-title">Повернення 14 днів</div>
              <div className="home-v2__benefit-sub">Без зайвих питань</div>
            </div>
          </div>
          <div className="home-v2__benefit">
            <div className="home-v2__benefit-icon"><CreditCard size={22} /></div>
            <div className="home-v2__benefit-text">
              <div className="home-v2__benefit-title">Зручна оплата</div>
              <div className="home-v2__benefit-sub">Карткою або при отриманні</div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
