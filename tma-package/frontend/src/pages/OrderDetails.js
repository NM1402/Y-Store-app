import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Package, 
  ArrowLeft,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  RefreshCw,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  ShoppingCart,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_STEPS = [
  { key: 'pending', icon: Clock, label: { uk: 'Очікує', ru: 'Ожидает' } },
  { key: 'confirmed', icon: CheckCircle, label: { uk: 'Підтверджено', ru: 'Подтверждено' } },
  { key: 'processing', icon: RefreshCw, label: { uk: 'Обробка', ru: 'Обработка' } },
  { key: 'shipped', icon: Truck, label: { uk: 'Відправлено', ru: 'Отправлено' } },
  { key: 'delivered', icon: CheckCircle, label: { uk: 'Доставлено', ru: 'Доставлено' } },
];

const OrderDetails = () => {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const T = {
    uk: {
      title: 'Деталі замовлення',
      orderNumber: 'Замовлення',
      status: 'Статус',
      customer: 'Одержувач',
      delivery: 'Доставка',
      payment: 'Оплата',
      items: 'Товари',
      total: 'Разом',
      subtotal: 'Товари',
      deliveryCost: 'Доставка',
      ttn: 'ТТН',
      trackTtn: 'Відстежити',
      copyTtn: 'Скопіювати ТТН',
      repeatOrder: 'Повторити замовлення',
      back: 'Назад',
      warehouse: 'Відділення',
      cashOnDelivery: 'Оплата при отриманні',
      cardOnline: 'Оплата карткою онлайн',
      paid: 'Сплачено',
      pending: 'Очікує оплати'
    },
    ru: {
      title: 'Детали заказа',
      orderNumber: 'Заказ',
      status: 'Статус',
      customer: 'Получатель',
      delivery: 'Доставка',
      payment: 'Оплата',
      items: 'Товары',
      total: 'Итого',
      subtotal: 'Товары',
      deliveryCost: 'Доставка',
      ttn: 'ТТН',
      trackTtn: 'Отследить',
      copyTtn: 'Скопировать ТТН',
      repeatOrder: 'Повторить заказ',
      back: 'Назад',
      warehouse: 'Отделение',
      cashOnDelivery: 'Оплата при получении',
      cardOnline: 'Оплата картой онлайн',
      paid: 'Оплачено',
      pending: 'Ожидает оплаты'
    }
  };

  const txt = T[language] || T.uk;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchOrder = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/api/v2/cabinet/orders/${id}`, {
          withCredentials: true
        });
        setOrder(response.data);
      } catch (error) {
        console.error('Failed to fetch order:', error);
        toast.error('Замовлення не знайдено');
        navigate('/account/orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, isAuthenticated, navigate]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'uk' ? 'uk-UA' : 'ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyTtn = () => {
    if (order?.delivery?.ttn) {
      navigator.clipboard.writeText(order.delivery.ttn);
      toast.success('ТТН скопійовано!');
    }
  };

  const handleRepeatOrder = async () => {
    try {
      await axios.post(`${API_URL}/api/v2/cabinet/orders/${id}/repeat`, {}, {
        withCredentials: true
      });
      toast.success('Товари додано до кошика!');
      navigate('/cart');
    } catch (error) {
      toast.error('Помилка при повторенні замовлення');
    }
  };

  const getCurrentStep = () => {
    const statusIndex = STATUS_STEPS.findIndex(s => s.key === order?.status);
    return statusIndex >= 0 ? statusIndex : 0;
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) return null;

  const currentStep = getCurrentStep();
  const subtotal = order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-8">
      <div className="container-main px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/account/orders">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900">
              {txt.orderNumber} #{order.order_number || order.id?.slice(0, 8)}
            </h1>
            <p className="text-gray-500">{formatDate(order.created_at)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Timeline */}
            <Card className="p-6 bg-white/80 backdrop-blur border-0 shadow-lg">
              <h2 className="font-bold text-lg mb-6">{txt.status}</h2>
              <div className="flex items-center justify-between">
                {STATUS_STEPS.map((step, index) => {
                  const StepIcon = step.icon;
                  const isCompleted = index <= currentStep;
                  const isCurrent = index === currentStep;
                  
                  return (
                    <div key={step.key} className="flex flex-col items-center flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                        isCompleted 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-green-200' : ''}`}>
                        <StepIcon className="w-5 h-5" />
                      </div>
                      <span className={`text-xs text-center ${isCompleted ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
                        {step.label[language]}
                      </span>
                      {index < STATUS_STEPS.length - 1 && (
                        <div className={`absolute h-1 w-full top-5 left-1/2 ${
                          index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                        }`} style={{ zIndex: -1 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* TTN Tracking */}
            {order.delivery?.ttn && (
              <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">{txt.ttn}</p>
                    <p className="text-2xl font-mono font-bold">{order.delivery.ttn}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={copyTtn}
                      className="bg-white/20 hover:bg-white/30 text-white"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      {txt.copyTtn}
                    </Button>
                    <a 
                      href={`https://novaposhta.ua/tracking/?cargo_number=${order.delivery.ttn}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button 
                        variant="secondary" 
                        size="sm"
                        className="bg-white/20 hover:bg-white/30 text-white"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        {txt.trackTtn}
                      </Button>
                    </a>
                  </div>
                </div>
              </Card>
            )}

            {/* Items */}
            <Card className="p-6 bg-white/80 backdrop-blur border-0 shadow-lg">
              <h2 className="font-bold text-lg mb-4">{txt.items}</h2>
              <div className="space-y-4">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex gap-4 py-4 border-b border-gray-100 last:border-0">
                    <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                      {item.image && (
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-gray-500 text-sm">{item.quantity} шт.</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{(item.price * item.quantity).toLocaleString()} ₴</p>
                      <p className="text-gray-400 text-sm">{item.price.toLocaleString()} ₴/шт</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Total */}
            <Card className="p-6 bg-white/80 backdrop-blur border-0 shadow-lg">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">{txt.subtotal}</span>
                  <span>{subtotal.toLocaleString()} ₴</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{txt.deliveryCost}</span>
                  <span>{order.delivery?.delivery_cost?.toLocaleString() || 0} ₴</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-bold text-lg">{txt.total}</span>
                  <span className="font-black text-2xl text-blue-600">
                    {order.total_amount?.toLocaleString()} ₴
                  </span>
                </div>
              </div>

              <Button 
                onClick={handleRepeatOrder}
                className="w-full mt-4 bg-green-600 hover:bg-green-700"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {txt.repeatOrder}
              </Button>
            </Card>

            {/* Customer */}
            <Card className="p-6 bg-white/80 backdrop-blur border-0 shadow-lg">
              <h3 className="font-bold mb-4">{txt.customer}</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Package className="w-4 h-4 text-gray-500" />
                  </div>
                  <span>{order.customer?.full_name}</span>
                </div>
                {order.customer?.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-gray-500" />
                    </div>
                    <span>{order.customer.phone}</span>
                  </div>
                )}
                {order.customer?.email && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-gray-500" />
                    </div>
                    <span>{order.customer.email}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Delivery */}
            <Card className="p-6 bg-white/80 backdrop-blur border-0 shadow-lg">
              <h3 className="font-bold mb-4">{txt.delivery}</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-semibold">{order.delivery?.city_name}</p>
                    <p className="text-gray-500 text-sm">{txt.warehouse}: {order.delivery?.warehouse_name}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Payment */}
            <Card className="p-6 bg-white/80 backdrop-blur border-0 shadow-lg">
              <h3 className="font-bold mb-4">{txt.payment}</h3>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p>{order.payment_method === 'cash_on_delivery' ? txt.cashOnDelivery : txt.cardOnline}</p>
                  <p className={`text-sm ${order.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {order.payment_status === 'paid' ? txt.paid : txt.pending}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
