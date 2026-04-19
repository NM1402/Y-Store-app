/**
 * Profile Screen - с реальной информацией о ФОПе
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/auth';
import useCartStore from '../store/cart';
import { useStoreInfo } from '../hooks/useStoreInfo';
import telegram from '../lib/telegram-sdk';
import TopBar from '../components/TopBar';
import Loading from '../components/Loading';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const cartCount = useCartStore(state => state.getCount());
  const { storeInfo, loading } = useStoreInfo();

  const menuItems = [
    { id: 'orders', icon: '📦', label: 'Мої замовлення', path: '/tma/orders' },
    { id: 'favorites', icon: '❤️', label: 'Обране', path: '/tma/favorites' },
  ];

  const handleMenuClick = (path) => {
    telegram.haptic('light');
    navigate(path);
  };

  const handleContactClick = (type, value) => {
    telegram.haptic('light');
    if (type === 'phone') {
      window.open(`tel:${value}`);
    } else if (type === 'email') {
      window.open(`mailto:${value}`);
    } else if (type === 'telegram') {
      telegram.openTelegramLink(`https://t.me/${value.replace('@', '')}`);
    }
  };

  if (loading) return <Loading />;

  const contacts = storeInfo?.contacts || {};
  const legal = storeInfo?.legal || {};
  const about = storeInfo?.about || {};

  return (
    <div className="tma-page">
      <TopBar title="Профіль" />

      <div className="tma-page-content profile">
        {/* User Card */}
        <div className="profile__user-card">
          <div className="profile__avatar">
            {user?.telegram_photo_url ? (
              <img src={user.telegram_photo_url} alt={user.full_name} />
            ) : (
              <div className="profile__avatar-placeholder">👤</div>
            )}
          </div>
          <div className="profile__user-info">
            <h2 className="profile__user-name">{user?.full_name || 'Користувач'}</h2>
            {user?.telegram_username && (
              <p className="profile__user-username">@{user.telegram_username}</p>
            )}
          </div>
        </div>

        {/* Menu */}
        <div className="profile__menu">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className="profile__menu-item"
              onClick={() => handleMenuClick(item.path)}
            >
              <span className="profile__menu-icon">{item.icon}</span>
              <span className="profile__menu-label">{item.label}</span>
              <span className="profile__menu-arrow">›</span>
            </button>
          ))}
        </div>

        {/* Store Info */}
        {storeInfo && (
          <div className="profile__store-info">
            <h3 className="profile__section-title">Про магазин</h3>
            
            <div className="profile__info-card">
              <h4 className="profile__info-title">{storeInfo.full_name}</h4>
              <p className="profile__info-desc">{storeInfo.description}</p>
              
              {about.total_customers && (
                <div className="profile__stats">
                  <div className="profile__stat">
                    <div className="profile__stat-value">{about.total_customers}</div>
                    <div className="profile__stat-label">Клієнтів</div>
                  </div>
                  <div className="profile__stat">
                    <div className="profile__stat-value">{about.total_orders}</div>
                    <div className="profile__stat-label">Замовлень</div>
                  </div>
                </div>
              )}
            </div>

            {/* Contacts */}
            <div className="profile__info-card">
              <h4 className="profile__info-title">Контакти</h4>
              
              {contacts.phone && (
                <button 
                  className="profile__contact-item"
                  onClick={() => handleContactClick('phone', contacts.phone)}
                >
                  <span className="profile__contact-icon">📞</span>
                  <span className="profile__contact-text">{contacts.phone}</span>
                </button>
              )}
              
              {contacts.email && (
                <button 
                  className="profile__contact-item"
                  onClick={() => handleContactClick('email', contacts.email)}
                >
                  <span className="profile__contact-icon">📧</span>
                  <span className="profile__contact-text">{contacts.email}</span>
                </button>
              )}
              
              {contacts.telegram && (
                <button 
                  className="profile__contact-item"
                  onClick={() => handleContactClick('telegram', contacts.telegram)}
                >
                  <span className="profile__contact-icon">✈️</span>
                  <span className="profile__contact-text">{contacts.telegram}</span>
                </button>
              )}
              
              {contacts.work_hours && (
                <div className="profile__contact-item" style={{ cursor: 'default' }}>
                  <span className="profile__contact-icon">⏰</span>
                  <span className="profile__contact-text">{contacts.work_hours}</span>
                </div>
              )}
            </div>

            {/* Legal Info */}
            <div className="profile__info-card">
              <h4 className="profile__info-title">Реквізити</h4>
              <div className="profile__legal">
                <p><strong>ФОП:</strong> {legal.fop_name}</p>
                <p><strong>ЄДРПОУ:</strong> {legal.edrpou}</p>
                <p><strong>Адреса:</strong> {legal.address}</p>
              </div>
            </div>
          </div>
        )}

        {/* Cart Info */}
        <div className="profile__info" style={{ marginTop: 'var(--space-4)' }}>
          <p className="profile__info-text">
            🛒 Товарів у кошику: <strong>{cartCount}</strong>
          </p>
          <p className="profile__info-text tma-text-hint" style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-xs)' }}>
            {storeInfo?.slogan || 'Y-Store - ваша техніка, наша якість!'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
