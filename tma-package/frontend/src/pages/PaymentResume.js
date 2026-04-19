import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { RefreshCw, CreditCard, Check, Clock, AlertCircle, Home } from 'lucide-react';

export default function PaymentResume() {
  const { orderId } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const auto = sp.get('auto') === '1';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [minutesLeft, setMinutesLeft] = useState(null);

  const fetchResume = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const r = await axios.get(`/api/v2/payments/resume/${orderId}`);
      setData(r.data);
    } catch (e) {
      setErr('Не вдалося завантажити статус оплати. Спробуйте пізніше.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { fetchResume(); }, [fetchResume]);

  const action = data?.action;
  const payUrl = data?.payment?.payment_url;
  const mode = data?.policy_mode;
  const dep = data?.deposit || {};

  // Auto-open payment if requested
  useEffect(() => {
    if (!data) return;
    if (auto && payUrl && (action === 'PAY_FULL' || action === 'PAY_DEPOSIT')) {
      window.location.href = payUrl;
    }
  }, [auto, data, payUrl, action]);

  // Countdown timer
  useEffect(() => {
    if (!data || action === 'GO_SUCCESS') return;
    
    const created = new Date(data.updated_at);
    const updateTimer = () => {
      const diff = 24 * 60 - Math.floor((Date.now() - created.getTime()) / 60000);
      setMinutesLeft(diff > 0 ? diff : 0);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [data, action]);

  const title = useMemo(() => {
    if (!data) return 'Оплата';
    if (action === 'GO_SUCCESS') return 'Оплату підтверджено';
    if (action === 'PAY_DEPOSIT') return 'Підтвердіть доставку';
    return 'Завершіть оплату';
  }, [data, action]);

  const desc = useMemo(() => {
    if (!data) return '';
    if (action === 'GO_SUCCESS') return 'Замовлення вже оплачено. Дякуємо!';
    if (action === 'PAY_DEPOSIT') {
      return `Щоб зберегти можливість оплати при отриманні, потрібно оплатити доставку (${Math.round(dep.amount || 0)} грн).`;
    }
    if (mode === 'FULL_PREPAID') {
      return 'Для цього замовлення доступна лише онлайн-оплата. Це пов\'язано з умовами доставки.';
    }
    return 'Натисніть кнопку нижче, щоб перейти до сторінки оплати.';
  }, [data, action, dep.amount, mode]);

  const recreatePayment = async () => {
    try {
      const r = await axios.post(`/api/v2/payments/resume/${orderId}/recreate`);
      if (r.data.payment_url) {
        window.location.href = r.data.payment_url;
      }
    } catch (e) {
      setErr('Не вдалося створити нове посилання на оплату');
    }
  };

  const goSuccess = () => navigate(`/order-success?order=${orderId}`);
  const goHome = () => navigate('/');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Завантаження...</span>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md bg-white border rounded-2xl shadow-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{err}</p>
          <button 
            onClick={fetchResume}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
          >
            Спробувати знову
          </button>
        </div>
      </div>
    );
  }

  if (!data?.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="text-gray-600">Немає даних</div>
      </div>
    );
  }

  const StatusIcon = action === 'GO_SUCCESS' ? Check : 
                     action === 'PAY_DEPOSIT' ? CreditCard : CreditCard;
  const iconColor = action === 'GO_SUCCESS' ? 'text-green-500' : 'text-blue-500';

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="w-full max-w-xl bg-white border rounded-3xl shadow-xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className={`w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4`}>
            <StatusIcon className={`w-8 h-8 ${iconColor}`} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-2">{desc}</p>
        </div>

        {/* Order Info */}
        <div className="rounded-2xl bg-gray-50 p-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Замовлення:</span>
            <span className="font-mono font-medium">{orderId?.slice(0, 8)}...</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Статус:</span>
            <span className={`font-medium ${
              data.order_status === 'PAID' ? 'text-green-600' :
              data.order_status === 'AWAITING_PAYMENT' ? 'text-yellow-600' : 'text-gray-600'
            }`}>
              {data.order_status}
            </span>
          </div>
          {mode && (
            <div className="flex justify-between">
              <span className="text-gray-500">Режим:</span>
              <span className="font-medium">{mode}</span>
            </div>
          )}
          {data.deposit?.required && (
            <div className="flex justify-between">
              <span className="text-gray-500">Депозит:</span>
              <span className={`font-medium ${data.deposit.paid ? 'text-green-600' : 'text-yellow-600'}`}>
                {data.deposit.paid ? '✓ сплачено' : `${Math.round(data.deposit.amount)} грн`}
              </span>
            </div>
          )}
        </div>

        {/* Urgency Timer */}
        {minutesLeft !== null && minutesLeft > 0 && action !== 'GO_SUCCESS' && (
          <div className="flex items-center justify-center gap-2 text-orange-600 bg-orange-50 rounded-xl py-3 px-4">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              Замовлення буде скасовано через {Math.floor(minutesLeft / 60)}год {minutesLeft % 60}хв
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {action === 'GO_SUCCESS' ? (
            <button
              onClick={goSuccess}
              className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Перейти до підтвердження
            </button>
          ) : (
            <>
              <a
                href={payUrl || '#'}
                className={`block w-full px-6 py-4 rounded-2xl text-center font-semibold shadow-lg transition-all ${
                  payUrl 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl' 
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                <CreditCard className="w-5 h-5 inline mr-2" />
                Оплатити зараз
              </a>

              <button
                onClick={recreatePayment}
                className="w-full px-6 py-4 rounded-2xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-all"
              >
                Створити нове посилання на оплату
              </button>

              <button
                onClick={fetchResume}
                className="w-full px-6 py-3 rounded-2xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Оновити статус
              </button>
            </>
          )}

          <button
            onClick={goHome}
            className="w-full px-6 py-3 rounded-2xl text-gray-500 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            На головну
          </button>
        </div>

        {/* Help text */}
        <p className="text-xs text-center text-gray-400">
          Якщо ви вже оплатили, натисніть "Оновити статус". 
          Оплата може оброблятися до 5 хвилин.
        </p>
      </div>
    </div>
  );
}
