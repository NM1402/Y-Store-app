import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api-client';
import useCartStore from '../store/cart';
import { useStoreInfo } from '../hooks/useStoreInfo';
import telegram from '../lib/telegram-sdk';
import TopBar from '../components/TopBar';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart } = useCartStore();
  const { storeInfo } = useStoreInfo();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    city: '',
    warehouse: '',
    payment_method: 'cash_on_delivery',
  });

  const paymentMethods = storeInfo?.payment?.methods || [
    { id: 'cash_on_delivery', name: 'Накладений платіж', icon: '💵', available: true },
    { id: 'card', name: 'Оплата карткою', icon: '💳', available: true },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.full_name || !form.phone || !form.city || !form.warehouse) {
      telegram.showAlert('Заповніть всі поля');
      return;
    }

    try {
      setLoading(true);
      telegram.showMainButtonProgress();

      const orderData = {
        ...form,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
      };

      await api.createOrder(orderData);
      clearCart();
      telegram.notificationOccurred('success');
      await telegram.showAlert('Замовлення оформлено! ✓');
      navigate('/tma/orders');
    } catch (error) {
      console.error('Checkout error:', error);
      telegram.notificationOccurred('error');
      telegram.showAlert('Помилка оформлення');
    } finally {
      setLoading(false);
      telegram.hideMainButtonProgress();
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('uk-UA').format(price);

  return (
    <div className="tma-page">
      <TopBar title="Оформлення" showBack />
      <div className="tma-page-content" style={{ padding: 'var(--space-4)', paddingBottom: '100px' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--tg-theme-hint-color)' }}>
                Ім'я та прізвище
              </label>
              <input
                type="text"
                className="tma-input"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--tg-theme-hint-color)' }}>
                Телефон
              </label>
              <input
                type="tel"
                className="tma-input"
                placeholder="+380..."
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--tg-theme-hint-color)' }}>
                Місто
              </label>
              <input
                type="text"
                className="tma-input"
                placeholder="Київ"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--tg-theme-hint-color)' }}>
                Відділення Нова Пошта
              </label>
              <input
                type="text"
                className="tma-input"
                placeholder="Відділення №1"
                value={form.warehouse}
                onChange={(e) => setForm({ ...form, warehouse: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--tg-theme-hint-color)' }}>
                Оплата
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {paymentMethods.filter(m => m.available).map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setForm({ ...form, payment_method: method.id })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-3)',
                      background: form.payment_method === method.id 
                        ? 'var(--tg-theme-button-color)' 
                        : 'var(--tg-theme-secondary-bg-color)',
                      color: form.payment_method === method.id 
                        ? 'var(--tg-theme-button-text-color)' 
                        : 'var(--tg-theme-text-color)',
                      border: 'none',
                      borderRadius: 'var(--radius-lg)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-base)'
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>{method.icon}</span>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{method.name}</div>
                      {method.description && (
                        <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8 }}>
                          {method.description}
                        </div>
                      )}
                    </div>
                    {form.payment_method === method.id && <span>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </form>

        <div style={{ position: 'fixed', bottom: 'calc(60px + var(--tg-safe-area-bottom))', left: 0, right: 0, padding: 'var(--space-4)', background: 'var(--tg-theme-bg-color)', borderTop: '1px solid var(--tg-theme-secondary-bg-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <span>До сплати:</span>
            <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
              {formatPrice(getTotal())} ₴
            </span>
          </div>
          <button
            type="submit"
            className="tma-btn tma-btn-primary"
            onClick={handleSubmit}
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Оформлення...' : 'Підтвердити замовлення'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
