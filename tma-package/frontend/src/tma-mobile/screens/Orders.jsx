/**
 * Orders Screen — Мої замовлення
 * - Повний список замовлень користувача
 * - Статуси: pending_payment, paid, payment_failed, new, ...
 * - Для pending_payment/failed — кнопка "Доплатити" → reuse payment_url
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  CreditCard,
  RefreshCw,
  Trash2,
  Zap,
  Copy,
  PackageCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api-client';
import telegram from '../lib/telegram-sdk';
import TopBar from '../components/TopBar';
import Empty from '../components/Empty';
import Page from '../components/Page';
import './Orders.css';

const STATUS_CONFIG = {
  new:              { label: 'Новий',             color: '#2563EB', bg: 'rgba(37, 99, 235, 0.1)',  icon: Clock },
  pending_payment:  { label: 'Очікує оплати',     color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', icon: Clock },
  awaiting_payment: { label: 'Очікує оплати',     color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', icon: Clock },
  paid:             { label: 'Оплачено',          color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', icon: CheckCircle },
  payment_failed:   { label: 'Помилка оплати',    color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)',  icon: AlertTriangle },
  confirmed:        { label: 'Підтверджено',      color: '#0EA5A4', bg: 'rgba(14, 165, 164, 0.1)',  icon: CheckCircle },
  processing:       { label: 'Сформовано ТТН',    color: '#0EA5A4', bg: 'rgba(14, 165, 164, 0.12)', icon: PackageCheck },
  shipped:          { label: 'Відправлено',       color: '#0EA5A4', bg: 'rgba(14, 165, 164, 0.1)',  icon: Package },
  delivered:        { label: 'Доставлено',        color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', icon: CheckCircle },
  cancelled:        { label: 'Скасовано',         color: '#6B7280', bg: 'rgba(107, 114, 128, 0.12)', icon: XCircle },
  refunded:         { label: 'Повернено',         color: '#6B7280', bg: 'rgba(107, 114, 128, 0.12)', icon: RefreshCw },
};

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = async () => {
    try {
      // Ensure auth (sandbox or telegram)
      if (!api.getToken()) {
        try { await api.authenticate(); } catch (_) {}
      }
      const data = await api.getOrders();
      const list = data?.orders || data || [];
      setOrders(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('Не вдалося завантажити замовлення');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    telegram.haptic('light');
    loadOrders();
  };

  const handlePayAgain = (order) => {
    const url = order?.payment?.checkout_url || order?.payment_url;
    if (!url) {
      toast.error('Посилання на оплату недоступне');
      return;
    }
    telegram.haptic('medium');
    const inTelegram = !!(window.Telegram?.WebApp?.initData);
    if (inTelegram) {
      try { telegram.openLink(url); } catch (_) { window.location.href = url; }
    } else {
      window.location.href = url;
    }
  };

  const handleDelete = async (order) => {
    const ok = window.confirm(
      `Видалити замовлення № ${order.order_number || order.id.slice(0, 8)}?\n\nЦю дію неможливо скасувати.`
    );
    if (!ok) return;
    telegram.haptic('medium');
    try {
      await api.deleteOrder(order.id);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      toast.success('Замовлення видалено');
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Не вдалося видалити';
      toast.error(typeof msg === 'string' ? msg : 'Помилка');
    }
  };

  const handleSimulatePay = async (order) => {
    telegram.haptic('light');
    try {
      const res = await api.simulatePayment(order.id);
      if (res?.success) {
        toast.success('Оплату симульовано ✅');
        // Reload to show updated status
        loadOrders();
      } else {
        toast.error(res?.message || 'Не вдалося симулювати');
      }
    } catch (e) {
      toast.error('Недоступно у production');
    }
  };

  // Simulation button is visible only in sandbox / preview (no real Telegram initData)
  const simulationAvailable = !window.Telegram?.WebApp?.initData;

  const handleCopyTtn = async (ttn) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(ttn);
      } else {
        const ta = document.createElement('textarea');
        ta.value = ttn;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      telegram.haptic('success');
      toast.success(`ТТН ${ttn} скопійовано`);
    } catch (e) {
      toast.error('Не вдалося скопіювати');
    }
  };

  const handleProductClick = (productId) => {
    if (!productId) return;
    telegram.haptic('light');
    navigate(`/tma/product/${productId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatPrice = (price) => new Intl.NumberFormat('uk-UA').format(Math.round(price || 0));

  if (loading) {
    return (
      <Page>
        <div className="tma-page">
          <TopBar title="Мої замовлення" showBack onBack={() => navigate(-1)} />
          <div className="tma-page-content">
            <div className="orders__skeleton">
              <div className="orders__skeleton-item" />
              <div className="orders__skeleton-item" />
              <div className="orders__skeleton-item" />
            </div>
          </div>
        </div>
      </Page>
    );
  }

  if (orders.length === 0) {
    return (
      <Page>
        <div className="tma-page">
          <TopBar title="Мої замовлення" showBack onBack={() => navigate(-1)} />
          <div className="tma-page-content">
            <Empty
              icon={<Package size={64} />}
              title="Замовлень поки немає"
              description="Оберіть товари з каталогу та оформіть перше замовлення"
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
        <TopBar title="Мої замовлення" showBack onBack={() => navigate(-1)} />
        <div className="tma-page-content">
          <div className="orders">
            <div className="orders__top">
              <span className="orders__count">{orders.length} замовлення</span>
              <button
                className="orders__refresh"
                onClick={handleRefresh}
                disabled={refreshing}
                aria-label="Оновити"
                data-testid="orders-refresh"
              >
                <RefreshCw size={16} className={refreshing ? 'orders__refresh-icon--spin' : ''} />
              </button>
            </div>

            {orders.map((order) => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
              const StatusIcon = cfg.icon;
              const isPending = order.status === 'pending_payment' || order.status === 'awaiting_payment';
              const isFailed = order.status === 'payment_failed';
              const canPay = (isPending || isFailed) && (order?.payment?.checkout_url || order?.payment_url);
              const canDelete = ['new', 'pending_payment', 'awaiting_payment', 'payment_failed', 'cancelled']
                .includes(order.status) && !(order?.delivery?.tracking_number);

              return (
                <div
                  key={order.id}
                  className="orders__card"
                  data-testid={`order-${order.id}`}
                >
                  <div className="orders__header">
                    <div className="orders__number">
                      <Package size={16} />
                      <span>№ {order.order_number || order.id.slice(0, 8)}</span>
                    </div>
                    <div
                      className="orders__status"
                      style={{ color: cfg.color, background: cfg.bg }}
                    >
                      <StatusIcon size={14} />
                      <span>{cfg.label}</span>
                    </div>
                  </div>

                  <div className="orders__body">
                    <div className="orders__row">
                      <Clock size={14} className="orders__row-icon" />
                      <span>{formatDate(order.created_at)}</span>
                    </div>

                    {order.delivery?.city_name && (
                      <div className="orders__row">
                        <MapPin size={14} className="orders__row-icon" />
                        <span className="orders__row-text">
                          {order.delivery.city_name}
                          {(order.delivery.warehouse_name || order.delivery.branch_name) &&
                            `, ${order.delivery.warehouse_name || order.delivery.branch_name}`}
                        </span>
                      </div>
                    )}

                    {order.items && order.items.length > 0 && (
                      <div className="orders__items">
                        {order.items.slice(0, 2).map((it, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="orders__item orders__item--clickable"
                            onClick={() => handleProductClick(it.product_id || it.id)}
                            data-testid={`order-item-${order.id}-${idx}`}
                          >
                            <span className="orders__item-title">{it.title}</span>
                            <span className="orders__item-qty">× {it.quantity}</span>
                          </button>
                        ))}
                        {order.items.length > 2 && (
                          <div className="orders__item-more">
                            …і ще {order.items.length - 2}
                          </div>
                        )}
                      </div>
                    )}

                    {order.delivery?.tracking_number && (
                      <div className="orders__ttn">
                        <div className="orders__ttn-row">
                          <div className="orders__ttn-icon">
                            <PackageCheck size={16} />
                          </div>
                          <div className="orders__ttn-body">
                            <div className="orders__ttn-label">ТТН Нова Пошта</div>
                            <div className="orders__ttn-value">{order.delivery.tracking_number}</div>
                          </div>
                          <button
                            className="orders__ttn-copy"
                            onClick={() => handleCopyTtn(order.delivery.tracking_number)}
                            data-testid={`copy-ttn-${order.id}`}
                            title="Копіювати"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                        {order.delivery?.estimated_delivery_date && (
                          <div className="orders__ttn-est">
                            Очікуване прибуття: {order.delivery.estimated_delivery_date}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="orders__total">
                      <span className="orders__total-label">Разом</span>
                      <span className="orders__total-value">
                        {formatPrice(order.total_amount || 0)} ₴
                      </span>
                    </div>
                  </div>

                  {canPay && (
                    <button
                      className="orders__pay-btn"
                      onClick={() => handlePayAgain(order)}
                      data-testid={`pay-again-${order.id}`}
                    >
                      <CreditCard size={18} />
                      {isFailed ? 'Спробувати ще раз' : 'Доплатити'}
                    </button>
                  )}

                  {order.status === 'paid' && order?.payment?.paid_at && (
                    <div className="orders__paid-note">
                      ✅ Оплачено {formatDate(order.payment.paid_at)}
                      {order.payment.simulated ? ' · симуляція' : ''}
                    </div>
                  )}

                  {(canDelete || (simulationAvailable && isPending)) && (
                    <div className="orders__actions-row">
                      {simulationAvailable && (isPending || isFailed) && (
                        <button
                          className="orders__action orders__action--sim"
                          onClick={() => handleSimulatePay(order)}
                          data-testid={`sim-pay-${order.id}`}
                          title="Симулювати оплату (тест)"
                        >
                          <Zap size={14} />
                          Симулювати
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="orders__action orders__action--danger"
                          onClick={() => handleDelete(order)}
                          data-testid={`delete-${order.id}`}
                          title="Видалити замовлення"
                        >
                          <Trash2 size={14} />
                          Видалити
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Page>
  );
}
