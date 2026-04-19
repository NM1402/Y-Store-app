/**
 * Profile v2.0 - Premium Telegram Mini App Profile
 * З реальною інформацією про магазин та замовленнями користувача
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ShoppingBag, Heart, MessageCircle, ChevronRight, Phone, Mail, Clock, Package, MapPin } from 'lucide-react';
import telegram from '../lib/telegram-sdk';
import api from '../lib/api-client';
import useCartStore from '../store/cart';
import TopBar from '../components/TopBar';
import Page from '../components/Page';
import './Profile-v2.css';

export default function ProfileV2() {
  const navigate = useNavigate();
  const cartCount = useCartStore((state) => state.getCount());
  const [telegramUser, setTelegramUser] = useState(null);
  const [storeInfo, setStoreInfo] = useState(null);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  useEffect(() => {
    // Get Telegram user data
    const user = telegram.getUser();
    setTelegramUser(user);
    
    // Load store info and orders
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load store info (публічна, без auth)
      try {
        const storeData = await api.get('/tma/store-info');
        setStoreInfo(storeData);
      } catch (err) {
        console.log('Store info not loaded, using fallback');
        // Fallback data
        setStoreInfo({
          name: 'Y-Store',
          full_name: 'ФОП Тищенко Олександр Миколайович',
          description: 'Y-Store — український маркетплейс корисних речей. Широкий асортимент товарів для дому, кухні, здоров\'я, дітей, тварин, військових та блекауту. Швидка доставка Новою Поштою 1–2 дні по Україні, повернення 14 днів без питань.',
          contacts: {
            phone: '+380 (50) 247-41-61',
            phone_2: '+380 (63) 724-77-03',
            email: 'support@y-store.in.ua',
            work_hours: 'Пн-Пт: 9:00-18:00, Сб: 10:00-17:00',
            work_hours_note: 'Неділя - Вихідний',
            response_time: 'Відповідаємо протягом 24 годин'
          },
          legal: {
            fop_name: 'ФОП Тищенко Олександр Миколайович',
            edrpou: '380637247703',
            address: 'проспект Миколи Бажана, 24/1',
            city: 'Київ, Україна',
            postal_code: '02149',
            delivery_point: 'м. Київ НП 23'
          },
          about: {
            year_founded: 2020,
            total_customers: '10,000+'
          }
        });
      }
      
      // Load my orders (потребує auth, може не спрацювати)
      try {
        const ordersData = await api.get('/tma/my-orders');
        setMyOrders(ordersData.orders || []);
      } catch (err) {
        console.log('Orders not loaded:', err);
        setMyOrders([]);
      }
    } catch (error) {
      console.error('Failed to load profile data:', error);
      // Set minimal fallback
      setStoreInfo({
        name: 'Y-Store',
        contacts: { 
          phone: '+380 (50) 247-41-61',
          phone_2: '+380 (63) 724-77-03', 
          email: 'support@y-store.in.ua', 
          work_hours: 'Пн-Пт: 9:00-18:00, Сб: 10:00-17:00',
          work_hours_note: 'Неділя - Вихідний'
        },
        legal: { 
          fop_name: 'ФОП Тищенко Олександр Миколайович', 
          edrpou: '380637247703', 
          address: 'проспект Миколи Бажана, 24/1',
          city: 'Київ, Україна',
          postal_code: '02149'
        },
        about: { year_founded: 2020, total_customers: '10,000+' }
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      'new': 'Нове',
      'confirmed': 'Підтверджено',
      'shipped': 'Відправлено',
      'delivered': 'Доставлено',
      'cancelled': 'Скасовано',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'new': '#FFA500',
      'confirmed': '#0EA5A4',
      'shipped': '#0EA5A4',
      'delivered': '#10B981',
      'cancelled': '#EF4444',
    };
    return colorMap[status] || '#6B7280';
  };

  const handleMenuClick = (path) => {
    telegram.haptic('light');
    navigate(path);
  };

  const menuItems = [
    {
      id: 'orders',
      icon: <ShoppingBag size={20} />,
      label: 'Мої замовлення',
      path: '/tma/orders',
      badge: myOrders.length > 0 ? myOrders.length : null,
    },
    {
      id: 'favorites',
      icon: <Heart size={20} />,
      label: 'Обране',
      path: '/tma/favorites',
      badge: null,
    },
    {
      id: 'support',
      icon: <MessageCircle size={20} />,
      label: 'Підтримка',
      path: '/tma/support',
      badge: null,
    },
  ];

  const renderUserCard = () => {
    if (!telegramUser) {
      return (
        <div className="profile-v2__user-card">
          <div className="profile-v2__avatar">
            <User size={32} />
          </div>
          <div className="profile-v2__user-info">
            <h2 className="profile-v2__user-name">Користувач</h2>
            <p className="profile-v2__user-hint">Дані Telegram недоступні</p>
          </div>
        </div>
      );
    }

    const fullName = [telegramUser.first_name, telegramUser.last_name]
      .filter(Boolean)
      .join(' ') || 'Користувач';
    
    return (
      <div className="profile-v2__user-card" data-testid="profile-user-card">
        <div className="profile-v2__avatar">
          {telegramUser.photo_url ? (
            <img src={telegramUser.photo_url} alt={fullName} />
          ) : (
            <div className="profile-v2__avatar-placeholder">
              <User size={32} />
            </div>
          )}
        </div>
        <div className="profile-v2__user-info">
          <h2 className="profile-v2__user-name">{fullName}</h2>
          {telegramUser.username && (
            <p className="profile-v2__user-username">@{telegramUser.username}</p>
          )}
        </div>
      </div>
    );
  };

  if (loading || !storeInfo) {
    return (
      <Page>
        <div className="tma-page">
          <TopBar title="Профіль" />
          <div className="tma-page-content">
            <div className="profile-v2">
              <p>Завантаження...</p>
            </div>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="tma-page">
        <TopBar title="Профіль" />
        <div className="tma-page-content">
          <div className="profile-v2">
            {/* User Card */}
            {renderUserCard()}

            {/* Quick Stats */}
            <div className="profile-v2__stats">
              <div className="profile-v2__stat-card">
                <div className="profile-v2__stat-value">{cartCount}</div>
                <div className="profile-v2__stat-label">У кошику</div>
              </div>
              <div className="profile-v2__stat-card">
                <div className="profile-v2__stat-value">{myOrders.length}</div>
                <div className="profile-v2__stat-label">Замовлень</div>
              </div>
              <div className="profile-v2__stat-card">
                <div className="profile-v2__stat-value">0</div>
                <div className="profile-v2__stat-label">Обране</div>
              </div>
            </div>

            {/* Recent Orders */}
            {myOrders.length > 0 && (
              <div className="profile-v2__section">
                <div className="profile-v2__section-title">Останні замовлення</div>
                <div className="profile-v2__orders">
                  {myOrders.slice(0, 3).map((order) => (
                    <div key={order.id} className="profile-v2__order-card">
                      <div className="profile-v2__order-header">
                        <span className="profile-v2__order-number">
                          #{order.order_number || order.id.slice(0, 8)}
                        </span>
                        <span 
                          className="profile-v2__order-status"
                          style={{ color: getStatusColor(order.status) }}
                        >
                          {getStatusText(order.status)}
                        </span>
                      </div>
                      <div className="profile-v2__order-body">
                        <p className="profile-v2__order-total">
                          {order.total_amount?.toFixed(0) || 0} ₴
                        </p>
                        {order.delivery?.city_name && (
                          <p className="profile-v2__order-delivery">
                            <MapPin size={14} />
                            <span>{order.delivery.city_name}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Menu Items */}
            <div className="profile-v2__section">
              <div className="profile-v2__section-title">Мій акаунт</div>
              <div className="profile-v2__menu">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    className="profile-v2__menu-item"
                    onClick={() => handleMenuClick(item.path)}
                    data-testid={`profile-menu-${item.id}`}
                  >
                    <div className="profile-v2__menu-icon">{item.icon}</div>
                    <div className="profile-v2__menu-label">{item.label}</div>
                    {item.badge && (
                      <div className="profile-v2__menu-badge">{item.badge}</div>
                    )}
                    <ChevronRight
                      size={20}
                      className="profile-v2__menu-arrow"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Store Info */}
            <div className="profile-v2__section">
              <div className="profile-v2__section-title">Про магазин</div>
              
              <div className="profile-v2__info-card">
                <h3 className="profile-v2__info-title">{storeInfo.name}</h3>
                {storeInfo.description && (
                  <>
                    <p className={`profile-v2__info-desc ${!isDescriptionExpanded && storeInfo.description.length > 150 ? 'profile-v2__info-desc--collapsed' : ''}`}>
                      {storeInfo.description}
                    </p>
                    {storeInfo.description.length > 150 && (
                      <button 
                        className="profile-v2__expand-btn"
                        onClick={() => {
                          setIsDescriptionExpanded(!isDescriptionExpanded);
                          telegram.haptic('light');
                        }}
                      >
                        {isDescriptionExpanded ? 'Згорнути' : 'Читати далі'}
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Contacts */}
              <div className="profile-v2__info-card">
                <h4 className="profile-v2__info-subtitle">Контакти</h4>
                
                <div className="profile-v2__contact-list">
                  <div className="profile-v2__contact-item">
                    <Phone size={18} />
                    <span>{storeInfo.contacts.phone}</span>
                  </div>
                  {storeInfo.contacts.phone_2 && (
                    <div className="profile-v2__contact-item">
                      <Phone size={18} />
                      <span>{storeInfo.contacts.phone_2}</span>
                    </div>
                  )}
                  <div className="profile-v2__contact-item">
                    <Mail size={18} />
                    <span>{storeInfo.contacts.email}</span>
                  </div>
                  <div className="profile-v2__contact-item">
                    <Clock size={18} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span>{storeInfo.contacts.work_hours}</span>
                      {storeInfo.contacts.work_hours_note && (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                          {storeInfo.contacts.work_hours_note}
                        </span>
                      )}
                    </div>
                  </div>
                  {storeInfo.contacts.response_time && (
                    <div className="profile-v2__contact-item" style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
                      <span>{storeInfo.contacts.response_time}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Legal Info (ФОП) */}
              <div className="profile-v2__info-card">
                <h4 className="profile-v2__info-subtitle">Реквізити</h4>
                
                <div className="profile-v2__legal-list">
                  <div className="profile-v2__legal-item">
                    <span className="profile-v2__legal-label">ФОП:</span>
                    <span className="profile-v2__legal-value">{storeInfo.legal.fop_name}</span>
                  </div>
                  <div className="profile-v2__legal-item">
                    <span className="profile-v2__legal-label">ЄДРПОУ:</span>
                    <span className="profile-v2__legal-value">{storeInfo.legal.edrpou}</span>
                  </div>
                  <div className="profile-v2__legal-item">
                    <span className="profile-v2__legal-label">Адреса:</span>
                    <span className="profile-v2__legal-value">{storeInfo.legal.address}</span>
                  </div>
                  {storeInfo.legal.city && (
                    <div className="profile-v2__legal-item">
                      <span className="profile-v2__legal-label">Місто:</span>
                      <span className="profile-v2__legal-value">{storeInfo.legal.city}</span>
                    </div>
                  )}
                  {storeInfo.legal.postal_code && (
                    <div className="profile-v2__legal-item">
                      <span className="profile-v2__legal-label">Індекс:</span>
                      <span className="profile-v2__legal-value">{storeInfo.legal.postal_code}</span>
                    </div>
                  )}
                  {storeInfo.legal.delivery_point && (
                    <div className="profile-v2__legal-item">
                      <span className="profile-v2__legal-label">Самовивіз:</span>
                      <span className="profile-v2__legal-value">{storeInfo.legal.delivery_point}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* App Info */}
            <div className="profile-v2__app-info">
              <p className="profile-v2__app-version">
                Версія: 2.0 • Telegram Mini App
              </p>
              <p className="profile-v2__app-platform">
                {storeInfo.about.year_founded} • {storeInfo.about.total_customers} клієнтів
              </p>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
