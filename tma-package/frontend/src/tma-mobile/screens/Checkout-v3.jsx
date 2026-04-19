/**
 * Checkout v3 — PRODUCTION
 * ▸ Nova Poshta autocomplete (city + warehouse via /api/tma/np)
 * ▸ Validation (phone, name, cityRef, warehouseRef)
 * ▸ Real order creation via /api/tma/orders
 * ▸ WayForPay redirect on card payment
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Banknote, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import useCheckoutStore from '../store/checkout';
import useCartStore from '../store/cart';
import telegram from '../lib/telegram-sdk';
import api from '../lib/api-client';
import Page from '../components/Page';
import NovaPoshtaPicker from '../components/NovaPoshtaPicker';
import './Checkout-v3.css';

const PHONE_RE = /^\+?380\d{9}$/;
const NAME_RE = /^[А-ЯЁІЇЄҐа-яёіїєґA-Za-z\s'\u2019-]{2,30}$/;

export default function CheckoutV3() {
  const navigate = useNavigate();
  const phoneInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    step,
    nextStep,
    prevStep,
    contact,
    delivery,
    payment,
    updateContact,
    updateDelivery,
    updatePayment,
    reset,
  } = useCheckoutStore();

  const { getTotal, items, clearCart } = useCartStore();
  const total = getTotal();

  // Redirect if cart empty
  useEffect(() => {
    if (items.length === 0 && !submitting) {
      toast.error('Кошик порожній');
      navigate('/tma/cart');
    }
  }, [items, navigate, submitting]);

  // Prefill phone prefix
  useEffect(() => {
    if (!contact.phone || contact.phone === '') {
      updateContact({ phone: '+380 ' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-focus phone on step 1
  useEffect(() => {
    if (step === 1 && phoneInputRef.current) {
      setTimeout(() => phoneInputRef.current?.focus(), 100);
    }
  }, [step]);

  const formatPhone = (value) => {
    const cleaned = value.replace(/\D/g, '');
    let digits = cleaned;
    if (!digits.startsWith('380')) {
      if (digits.startsWith('0')) digits = '38' + digits;
      else if (digits.length > 0) digits = '380' + digits;
    }
    digits = digits.slice(0, 12);
    if (digits.length <= 3) return '+' + digits;
    if (digits.length <= 5) return `+${digits.slice(0, 3)} ${digits.slice(3)}`;
    if (digits.length <= 8) return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
    if (digits.length <= 10)
      return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  };

  const handlePhoneChange = (e) => {
    updateContact({ phone: formatPhone(e.target.value) });
  };

  const validateStep1 = () => {
    const phoneDigits = (contact.phone || '').replace(/\D/g, '');
    if (!PHONE_RE.test(phoneDigits)) {
      toast.error('Невірний номер: +380 XX XXX XX XX');
      return false;
    }
    if (!NAME_RE.test((contact.lastName || '').trim())) {
      toast.error('Введіть коректне прізвище');
      return false;
    }
    if (!NAME_RE.test((contact.firstName || '').trim())) {
      toast.error('Введіть коректне ім\'я');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!delivery.cityRef) {
      toast.error('Виберіть місто зі списку');
      return false;
    }
    if (!delivery.branchRef) {
      toast.error('Виберіть відділення зі списку');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    telegram.haptic('light');
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !payment) {
      toast.error('Оберіть спосіб оплати');
      return;
    }
    nextStep();
  };

  const handlePrev = () => {
    telegram.haptic('light');
    prevStep();
  };

  // NP picker change → store cityRef + warehouseRef
  const handleNpChange = (np) => {
    updateDelivery({
      city: np.cityName || '',
      cityRef: np.cityRef || '',
      branch: np.warehouseName || '',
      branchRef: np.warehouseRef || '',
    });
  };

  const handleConfirm = async () => {
    if (submitting) return;
    if (!validateStep1() || !validateStep2()) return;

    telegram.haptic('heavy');
    setSubmitting(true);

    // Build payload for backend
    const phoneDigits = (contact.phone || '').replace(/\D/g, '');
    const fullName = `${contact.lastName || ''} ${contact.firstName || ''}`.trim();
    const paymentMethod = payment === 'card' ? 'card' : 'cash_on_delivery';

    const payload = {
      items: items.map((it) => ({
        product_id: it.product_id || it.id,
        quantity: it.quantity || 1,
      })),
      full_name: fullName,
      first_name: contact.firstName || '',
      last_name: contact.lastName || '',
      phone: '+' + phoneDigits,
      email: contact.email || null,
      city: delivery.city,
      city_ref: delivery.cityRef,
      warehouse: delivery.branch,
      warehouse_ref: delivery.branchRef,
      payment_method: paymentMethod,
    };

    try {
      // Ensure we are authenticated (sandbox or telegram initData)
      if (!api.getToken()) {
        try { await api.authenticate(); } catch (_) { /* ignore; backend requires auth */ }
      }

      const result = await api.createOrder(payload);

      // Success — save orderId for status polling on success page
      const orderId = result.id || result.order_number;
      clearCart();
      reset();

      // Card payment → redirect to WayForPay, land on success page with pending state
      if (paymentMethod === 'card' && result.payment_url) {
        // Persist minimal info so Success page can poll even after full reload
        try {
          localStorage.setItem('tma_pending_order', JSON.stringify({
            id: orderId,
            payment_url: result.payment_url,
            total: result.total_amount,
            created_at: Date.now(),
          }));
        } catch (_) {}

        toast.success('Перехід до оплати...');
        const inTelegram = !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData);
        if (inTelegram) {
          telegram.openLink(result.payment_url);
          setTimeout(() => {
            navigate('/tma/order-success', {
              state: { orderId, paymentMethod, paymentUrl: result.payment_url },
            });
          }, 400);
        } else {
          // Browser: navigate to success page first (so user sees pending state),
          // then redirect to WFP.
          navigate('/tma/order-success', {
            state: { orderId, paymentMethod, paymentUrl: result.payment_url },
          });
          setTimeout(() => {
            window.location.href = result.payment_url;
          }, 150);
        }
        return;
      }

      // Cash on delivery — straight to success
      toast.success('Замовлення оформлено!');
      navigate('/tma/order-success', {
        state: { orderId, paymentMethod },
      });
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Помилка створення замовлення';
      toast.error(typeof msg === 'string' ? msg : 'Помилка. Спробуйте ще раз.');
      console.error('Checkout submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('uk-UA').format(price);

  return (
    <Page>
      <div className="checkout" data-testid="checkout-v3">
        {/* TOP BAR */}
        <div className="checkout__topbar">
          <button
            className="checkout__topbar-back"
            onClick={() => navigate('/tma')}
            data-testid="checkout-back-btn"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="checkout__topbar-title">Оформлення</h1>
          <div className="checkout__topbar-spacer" />
        </div>

        <div className="checkout__wrapper">
          <div className="checkout__progress">
            <div className={`checkout__dot ${step >= 1 ? 'checkout__dot--active' : ''}`} />
            <div className={`checkout__dot ${step >= 2 ? 'checkout__dot--active' : ''}`} />
            <div className={`checkout__dot ${step >= 3 ? 'checkout__dot--active' : ''}`} />
            <div className={`checkout__dot ${step >= 4 ? 'checkout__dot--active' : ''}`} />
          </div>

          <div className="checkout__content">
            {step === 1 && (
              <div className="checkout__step" data-testid="checkout-step-1">
                <h2 className="checkout__title">Контакти</h2>
                <p className="checkout__subtitle">Куди відправити ваше замовлення?</p>

                <label className="checkout__label">Телефон *</label>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  className="checkout__input"
                  placeholder="+380 XX XXX XX XX"
                  value={contact.phone || '+380 '}
                  onChange={handlePhoneChange}
                  maxLength={19}
                  data-testid="phone-input"
                />

                <label className="checkout__label">Прізвище *</label>
                <input
                  type="text"
                  className="checkout__input"
                  placeholder="Введіть ваше прізвище"
                  value={contact.lastName || ''}
                  onChange={(e) => updateContact({ lastName: e.target.value })}
                  data-testid="lastname-input"
                />

                <label className="checkout__label">Ім'я *</label>
                <input
                  type="text"
                  className="checkout__input"
                  placeholder="Введіть ваше ім'я"
                  value={contact.firstName || ''}
                  onChange={(e) => updateContact({ firstName: e.target.value })}
                  data-testid="firstname-input"
                />

                <label className="checkout__label">Email (необов'язково)</label>
                <input
                  type="email"
                  className="checkout__input"
                  placeholder="you@example.com"
                  value={contact.email || ''}
                  onChange={(e) => updateContact({ email: e.target.value })}
                  data-testid="email-input"
                />
              </div>
            )}

            {step === 2 && (
              <div className="checkout__step" data-testid="checkout-step-2">
                <h2 className="checkout__title">Доставка</h2>
                <p className="checkout__subtitle">Нова Пошта</p>

                <NovaPoshtaPicker
                  value={{
                    cityRef: delivery.cityRef,
                    cityName: delivery.city,
                    warehouseRef: delivery.branchRef,
                    warehouseName: delivery.branch,
                  }}
                  onChange={handleNpChange}
                />
              </div>
            )}

            {step === 3 && (
              <div className="checkout__step" data-testid="checkout-step-3">
                <h2 className="checkout__title">Оплата</h2>
                <p className="checkout__subtitle">Оберіть спосіб оплати</p>

                <div
                  className={`checkout__option ${payment === 'card' ? 'checkout__option--active' : ''}`}
                  onClick={() => {
                    telegram.haptic('light');
                    updatePayment('card');
                  }}
                  data-testid="payment-card"
                >
                  <div className="checkout__option-icon">
                    <CreditCard size={24} />
                  </div>
                  <div className="checkout__option-body">
                    <div className="checkout__option-title">Карткою онлайн</div>
                    <div className="checkout__option-sub">WayForPay · безпечна оплата</div>
                  </div>
                </div>

                <div
                  className={`checkout__option ${payment === 'cash' ? 'checkout__option--active' : ''}`}
                  onClick={() => {
                    telegram.haptic('light');
                    updatePayment('cash');
                  }}
                  data-testid="payment-cash"
                >
                  <div className="checkout__option-icon">
                    <Banknote size={24} />
                  </div>
                  <div className="checkout__option-body">
                    <div className="checkout__option-title">Накладений платіж</div>
                    <div className="checkout__option-sub">Оплата при отриманні</div>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="checkout__step" data-testid="checkout-step-4">
                <h2 className="checkout__title">Підтвердження</h2>
                <p className="checkout__subtitle">Перевірте дані замовлення</p>

                <div className="checkout__summary">
                  <div className="checkout__summary-row">
                    <span className="checkout__summary-label">Телефон:</span>
                    <span className="checkout__summary-value">{contact.phone}</span>
                  </div>
                  {(contact.firstName || contact.lastName) && (
                    <div className="checkout__summary-row">
                      <span className="checkout__summary-label">Ім'я:</span>
                      <span className="checkout__summary-value">
                        {contact.lastName} {contact.firstName}
                      </span>
                    </div>
                  )}
                  <div className="checkout__summary-row">
                    <span className="checkout__summary-label">Місто:</span>
                    <span className="checkout__summary-value">{delivery.city}</span>
                  </div>
                  <div className="checkout__summary-row">
                    <span className="checkout__summary-label">Відділення:</span>
                    <span className="checkout__summary-value">{delivery.branch}</span>
                  </div>
                  <div className="checkout__summary-row">
                    <span className="checkout__summary-label">Оплата:</span>
                    <span className="checkout__summary-value">
                      {payment === 'card' ? 'Карткою онлайн' : 'Накладений платіж'}
                    </span>
                  </div>
                </div>

                <div className="checkout__total-card">
                  <div className="checkout__total-label">До сплати</div>
                  <div className="checkout__total-value">{formatPrice(total)} ₴</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="checkout__actions">
          {step > 1 && (
            <button
              onClick={handlePrev}
              className="checkout__btn checkout__btn--secondary"
              disabled={submitting}
              data-testid="checkout-btn-prev"
            >
              Назад
            </button>
          )}
          {step < 4 ? (
            <button
              onClick={handleNext}
              className="checkout__btn checkout__btn--primary"
              data-testid="checkout-btn-next"
            >
              Далі
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              className="checkout__btn checkout__btn--primary"
              disabled={submitting}
              data-testid="checkout-btn-confirm"
            >
              {submitting
                ? 'Обробка...'
                : payment === 'card'
                  ? `Перейти до оплати • ${formatPrice(total)} ₴`
                  : `Підтвердити • ${formatPrice(total)} ₴`}
            </button>
          )}
        </div>
      </div>
    </Page>
  );
}
