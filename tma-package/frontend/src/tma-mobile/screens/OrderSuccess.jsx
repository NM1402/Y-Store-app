/**
 * Order Success / Status screen
 * - Polls /api/tma/orders/{id} every 3s to detect status transitions.
 * - PAID / paid → success state
 * - pending_payment → shows "Доплатити" CTA (reopens WayForPay URL)
 * - payment_failed → retry CTA
 * - new (cash) → confirmed success (cash-on-delivery)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, AlertTriangle, CreditCard } from 'lucide-react';
import useCheckoutStore from '../store/checkout';
import useCartStore from '../store/cart';
import api from '../lib/api-client';
import telegram from '../lib/telegram-sdk';
import './OrderSuccess.css';

const TERMINAL_PAID = new Set(['paid', 'PAID']);
const TERMINAL_FAILED = new Set(['payment_failed', 'FAILED', 'cancelled', 'CANCELLED']);
const PENDING_PAY = new Set(['pending_payment', 'awaiting_payment']);

export default function OrderSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { reset: resetCheckout } = useCheckoutStore();
  const { clearCart } = useCartStore();

  // Recover from navigation state or localStorage (after WFP redirect round-trip)
  const recoverPending = () => {
    try {
      const raw = localStorage.getItem('tma_pending_order');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const nav = location.state || {};
  const pending = recoverPending();

  const [orderId] = useState(nav.orderId || pending?.id || null);
  const [paymentMethod] = useState(nav.paymentMethod || (pending?.payment_url ? 'card' : 'cash'));
  const [paymentUrl, setPaymentUrl] = useState(nav.paymentUrl || pending?.payment_url || null);

  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState(paymentMethod === 'card' ? 'pending_payment' : 'new');
  const [loading, setLoading] = useState(false);
  const pollRef = useRef(null);
  const mountedRef = useRef(true);

  const isPaidCard = TERMINAL_PAID.has(status);
  const isPendingCard = paymentMethod === 'card' && PENDING_PAY.has(status);
  const isFailedCard = TERMINAL_FAILED.has(status);
  const isCashConfirmed = paymentMethod !== 'card';

  const loadOrder = useCallback(async () => {
    if (!orderId) return null;
    try {
      const data = await api.getOrder(orderId);
      if (!mountedRef.current) return null;
      setOrder(data);
      const s = (data.payment?.status || data.status || '').toString();
      setStatus(s);
      if (TERMINAL_PAID.has(s)) {
        // Clear pending marker
        try { localStorage.removeItem('tma_pending_order'); } catch {}
      }
      if (data.payment?.checkout_url && !paymentUrl) {
        setPaymentUrl(data.payment.checkout_url);
      }
      return data;
    } catch (e) {
      console.error('Order fetch error:', e);
      return null;
    }
  }, [orderId, paymentUrl]);

  // Mount: haptic, initial fetch
  useEffect(() => {
    telegram.haptic(isCashConfirmed ? 'success' : 'light');
    clearCart();
    resetCheckout();
    if (orderId) loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling only while card payment is pending
  useEffect(() => {
    mountedRef.current = true;
    if (paymentMethod === 'card' && !TERMINAL_PAID.has(status) && !TERMINAL_FAILED.has(status)) {
      pollRef.current = setInterval(loadOrder, 3000);
    }
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [paymentMethod, status, loadOrder]);

  // Cleanup stale pending after long idle (>30 min)
  useEffect(() => {
    if (pending && pending.created_at && Date.now() - pending.created_at > 30 * 60 * 1000) {
      try { localStorage.removeItem('tma_pending_order'); } catch {}
    }
  }, [pending]);

  const handlePayAgain = () => {
    if (!paymentUrl) return;
    telegram.haptic('medium');
    const inTelegram = !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData);
    if (inTelegram) {
      telegram.openLink(paymentUrl);
    } else {
      window.location.href = paymentUrl;
    }
  };

  const handleCheckNow = async () => {
    setLoading(true);
    await loadOrder();
    setLoading(false);
  };

  const handleBackToHome = () => {
    telegram.haptic('light');
    navigate('/tma');
  };

  const handleViewOrders = () => {
    telegram.haptic('light');
    navigate('/tma/orders');
  };

  const formatPrice = (n) => new Intl.NumberFormat('uk-UA').format(n || 0);
  const amount = order?.total_amount ?? pending?.total;

  return (
    <div className="order-success" data-testid="order-success">
      <div className="order-success__content">
        {/* STATE: PAID */}
        {(isPaidCard || isCashConfirmed) && (
          <>
            <div className="order-success__icon order-success__icon--success">
              <CheckCircle size={72} strokeWidth={2.2} />
            </div>
            <h1 className="order-success__title">
              {isCashConfirmed ? 'Замовлення оформлено!' : 'Оплату отримано!'}
            </h1>
            <p className="order-success__message">
              {isCashConfirmed
                ? "Ми зв'яжемося з вами для підтвердження деталей доставки."
                : 'Дякуємо за покупку. Чекайте SMS з ТТН найближчим часом.'}
            </p>

            {order?.order_number && (
              <div className="order-success__order-num" data-testid="order-num">
                № {order.order_number}
              </div>
            )}

            <div className="order-success__info">
              <div className="order-success__info-row">
                <span>📞</span> <span>Очікуйте дзвінка від менеджера</span>
              </div>
              <div className="order-success__info-row">
                <span>📦</span> <span>Доставка Новою Поштою за 1–2 дні</span>
              </div>
            </div>
          </>
        )}

        {/* STATE: PENDING CARD */}
        {isPendingCard && !isPaidCard && (
          <>
            <div className="order-success__icon order-success__icon--pending">
              <Clock size={72} strokeWidth={2.2} />
            </div>
            <h1 className="order-success__title">Очікуємо оплату</h1>
            <p className="order-success__message">
              Ваше замовлення створено, але ще не оплачене.
              <br />
              Завершіть оплату, щоб ми взяли його в роботу.
            </p>

            {amount ? (
              <div className="order-success__amount">
                <div className="order-success__amount-label">До сплати</div>
                <div className="order-success__amount-value">{formatPrice(amount)} ₴</div>
              </div>
            ) : null}

            {order?.order_number && (
              <div className="order-success__order-num">№ {order.order_number}</div>
            )}

            {paymentUrl && (
              <button
                className="order-success__pay-btn"
                onClick={handlePayAgain}
                data-testid="pay-again-btn"
              >
                <CreditCard size={20} />
                Оплатити
              </button>
            )}

            <button
              className="order-success__check-btn"
              onClick={handleCheckNow}
              disabled={loading}
              data-testid="check-status-btn"
            >
              {loading ? 'Перевірка...' : 'Перевірити статус'}
            </button>

            <p className="order-success__hint">
              Статус оновиться автоматично після успішної оплати.
            </p>
          </>
        )}

        {/* STATE: FAILED */}
        {isFailedCard && (
          <>
            <div className="order-success__icon order-success__icon--failed">
              <AlertTriangle size={72} strokeWidth={2.2} />
            </div>
            <h1 className="order-success__title">Оплата не пройшла</h1>
            <p className="order-success__message">
              На жаль, оплату не вдалося завершити. Ви можете спробувати ще раз
              або зв'язатися з підтримкою.
            </p>
            {paymentUrl && (
              <button
                className="order-success__pay-btn"
                onClick={handlePayAgain}
                data-testid="pay-retry-btn"
              >
                <CreditCard size={20} />
                Спробувати ще раз
              </button>
            )}
          </>
        )}
      </div>

      <div className="order-success__actions">
        <button
          onClick={handleBackToHome}
          className="order-success__btn order-success__btn--primary"
          data-testid="back-to-home-btn"
        >
          На головну
        </button>
        <button
          onClick={handleViewOrders}
          className="order-success__btn order-success__btn--secondary"
          data-testid="view-orders-btn"
        >
          Мої замовлення
        </button>
      </div>
    </div>
  );
}
