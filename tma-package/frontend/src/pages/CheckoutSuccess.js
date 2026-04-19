import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { checkoutAPI } from '../utils/api';
import { Button } from '../components/ui/button';
import { 
  CheckCircle, 
  Package, 
  Loader2, 
  CreditCard, 
  Clock,
  Copy,
  ArrowRight,
  ShoppingBag
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const orderNumberFromState = location.state?.orderNumber;
  const orderIdFromState = location.state?.orderId;
  const totalFromState = location.state?.total;
  
  const [status, setStatus] = useState(sessionId ? 'checking' : 'success');
  const [attempts, setAttempts] = useState(0);
  const [orderDetails, setOrderDetails] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (sessionId) {
      checkPaymentStatus();
    } else if (orderNumberFromState) {
      // Save order number to localStorage for easy lookup
      localStorage.setItem('last_order_number', orderNumberFromState);
      fetchOrderDetails(orderNumberFromState);
    }
  }, [sessionId, attempts, orderNumberFromState]);

  const fetchOrderDetails = async (orderNumber) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/v2/orders/by-number/${orderNumber}`
      );
      if (response.data) {
        setOrderDetails(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch order details:', error);
    }
  };

  const checkPaymentStatus = async () => {
    try {
      const response = await checkoutAPI.getStatus(sessionId);
      
      if (response.data.payment_status === 'paid') {
        setStatus('success');
      } else if (response.data.payment_status === 'failed') {
        setStatus('error');
      } else if (attempts < 10) {
        setTimeout(() => setAttempts(a => a + 1), 2000);
      } else {
        setStatus('pending');
      }
    } catch (error) {
      if (attempts < 10) {
        setTimeout(() => setAttempts(a => a + 1), 2000);
      } else {
        setStatus('error');
      }
    }
  };

  const copyOrderNumber = () => {
    const orderNum = orderNumberFromState || orderDetails?.order_number;
    if (orderNum) {
      navigator.clipboard.writeText(orderNum);
      setCopied(true);
      toast.success('Номер замовлення скопійовано');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Checking payment
  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">
            Перевіряємо оплату...
          </h2>
          <p className="text-slate-500">
            Це займе кілька секунд
          </p>
          <div className="mt-6 flex justify-center gap-1">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: `${i * 0.15}s`}} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Success
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Success Card - Square layout */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Compact Header */}
            <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 p-5 text-center">
              <div className="w-16 h-16 mx-auto mb-2 bg-white rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <h1 className="text-xl font-bold text-white">Замовлення оформлено!</h1>
            </div>

            {/* Content - 2 columns grid */}
            <div className="p-5 space-y-3">
              {/* Order Number + Sum Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Order Number - smaller */}
                <div 
                  onClick={copyOrderNumber}
                  className="bg-slate-50 rounded-xl p-3 cursor-pointer hover:bg-slate-100 transition-all"
                >
                  <p className="text-xs text-slate-400 mb-0.5">Замовлення</p>
                  <p className="text-sm font-bold text-slate-700 font-mono truncate">
                    #{(orderNumberFromState || orderDetails?.order_number || 'N/A').replace('Y-', '')}
                  </p>
                </div>

                {/* Total - bigger */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3">
                  <p className="text-xs text-amber-600 mb-0.5">Сума</p>
                  <p className="text-xl font-bold text-amber-700">
                    {(totalFromState || orderDetails?.total_amount)?.toLocaleString('uk-UA')} ₴
                  </p>
                </div>
              </div>

              {/* Payment Method - compact */}
              <div className="bg-violet-50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">
                    {sessionId ? 'Оплачено онлайн' : 'Оплата при отриманні'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {sessionId ? 'Оплата підтверджена' : 'Готівкою або карткою'}
                  </p>
                </div>
              </div>

              {/* What's Next - compact 2x2 grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { done: true, text: 'Замовлення отримано' },
                  { done: true, text: 'SMS підтвердження' },
                  { done: false, text: "Зв'яжемось з вами" },
                  { done: false, text: 'Доставка 1-3 дні' },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.done ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}>
                      {step.done ? (
                        <CheckCircle className="w-3 h-3 text-white" />
                      ) : (
                        <ArrowRight className="w-2.5 h-2.5 text-white" />
                      )}
                    </div>
                    <span className={step.done ? 'text-slate-700' : 'text-slate-500'}>
                      {step.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link to="/orders" className="block">
                  <Button 
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold"
                  >
                    <Package className="w-4 h-4 mr-1.5" />
                    Замовлення
                  </Button>
                </Link>
                
                <Link to="/catalog" className="block">
                  <Button 
                    variant="outline"
                    className="w-full h-11 rounded-xl text-sm font-semibold border-2"
                  >
                    <ShoppingBag className="w-4 h-4 mr-1.5" />
                    Каталог
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pending
  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <Clock className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">
            Очікується оплата
          </h2>
          <p className="text-slate-500 mb-6">
            Ваша оплата обробляється. Ви отримаєте повідомлення після завершення.
          </p>
          <Link to="/orders">
            <Button className="h-12 px-8 rounded-xl">
              Переглянути замовлення
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Error
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-400 to-rose-500 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-4xl">⚠️</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-3">
          Помилка оплати
        </h2>
        <p className="text-slate-500 mb-6">
          Виникла проблема з оплатою. Спробуйте ще раз або зверніться до підтримки.
        </p>
        <div className="space-y-3">
          <Link to="/cart" className="block">
            <Button className="w-full h-12 rounded-xl">
              Повернутися до кошика
            </Button>
          </Link>
          <Link to="/" className="block">
            <Button variant="outline" className="w-full h-12 rounded-xl">
              На головну
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
