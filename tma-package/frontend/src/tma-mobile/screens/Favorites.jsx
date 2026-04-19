/**
 * Favorites Screen - ПОВНОЦІННИЙ ДИЗАЙН
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import useUserStore from '../store/user';
import api from '../lib/api-client';
import TopBar from '../components/TopBar';
import Empty from '../components/Empty';
import ProductCard from '../components/ProductCard-v2';
import Page from '../components/Page';
import './Favorites.css';

export default function Favorites() {
  const navigate = useNavigate();
  const { favorites } = useUserStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, [favorites]);

  const loadFavorites = async () => {
    if (favorites.length === 0) {
      setLoading(false);
      return;
    }

    try {
      // Load favorite products
      const promises = favorites.map(id => api.getProduct(id).catch(() => null));
      const results = await Promise.all(promises);
      const validProducts = results.filter(p => p !== null);
      setProducts(validProducts);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Page>
        <div className="tma-page">
          <TopBar title="Обране" showBack onBack={() => navigate(-1)} />
          <div className="tma-page-content">
            <div className="favorites__skeleton">
              <div className="favorites__skeleton-item" />
              <div className="favorites__skeleton-item" />
            </div>
          </div>
        </div>
      </Page>
    );
  }

  if (products.length === 0) {
    return (
      <Page>
        <div className="tma-page">
          <TopBar title="Обране" showBack onBack={() => navigate(-1)} />
          <div className="tma-page-content">
            <Empty
              icon={<Heart size={64} />}
              title="Обране порожнє"
              description="Додайте товари до обраного, щоб не загубити їх"
              actionText="Перейти до каталогу"
              onAction={() => navigate('/tma/catalog')}
            />
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="tma-page">
        <TopBar title="Обране" showBack onBack={() => navigate(-1)} />
        <div className="tma-page-content">
          <div className="favorites">
            <div className="favorites__grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onViewProduct={(id) => navigate(`/tma/product/${id}`)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
