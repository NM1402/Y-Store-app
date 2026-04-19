import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Package, 
  Truck, 
  CreditCard, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ChevronRight,
  Copy,
  ExternalLink,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  ArrowLeft
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Order status config
const STATUS_CONFIG = {
  new: { label: 'Новий', color: 'bg-blue-100 text-blue-700', icon: Clock },
  awaiting_payment: { label: 'Очікує оплату', color: 'bg-amber-100 text-amber-700', icon: CreditCard },
  paid: { label: 'Оплачено', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  processing: { label: 'В обробці', color: 'bg-purple-100 text-purple-700', icon: Package },
  shipped: { label: 'Відправлено', color: 'bg-indigo-100 text-indigo-700', icon: Truck },
  delivered: { label: 'Доставлено', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  cancelled: { label: 'Скасовано', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  returned: { label: 'Повернення', color: 'bg-orange-100 text-orange-700', icon: RefreshCw }
};

const OrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [searchMode, setSearchMode] = useState('order'); // 'order' or 'phone'

  useEffect(() => {
    // Check if user has recent orders in localStorage
    const recentOrderNumber = localStorage.getItem('last_order_number');
    if (recentOrderNumber) {
      searchOrderByNumber(recentOrderNumber);
    }
  }, []);

  const searchOrderByNumber = async (orderNumber) => {
    if (!orderNumber) return;
    
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/v2/orders/by-number/${orderNumber.trim()}`
      );
      
      if (response.data) {
        setOrders([response.data]);
      } else {
        setOrders([]);
        toast.error('Замовлення не знайдено');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Замовлення не знайдено');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const searchOrdersByPhone = async (phone) => {
    if (!phone || phone.length < 10) {
      toast.error('Введіть повний номер телефону');
      return;
    }
    
    setLoading(true);
    try {
      // Format phone
      let formattedPhone = phone.replace(/\D/g, '');
      if (!formattedPhone.startsWith('380')) {
        formattedPhone = '38' + formattedPhone;
      }
      formattedPhone = '+' + formattedPhone;

      const response = await axios.get(
        `${API_URL}/api/v2/orders/by-phone/${encodeURIComponent(formattedPhone)}`
      );
      
      if (response.data && response.data.length > 0) {
        setOrders(response.data);
        toast.success(`Знайдено ${response.data.length} замовлень`);
      } else {
        setOrders([]);
        toast.error('Замовлень не знайдено');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Помилка пошуку');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Скопійовано');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchMode === 'order') {
      searchOrderByNumber(searchQuery);
    } else {
      searchOrdersByPhone(searchPhone);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Мої замовлення</h1>
              <p className="text-slate-500 text-sm">Відстежуйте статус ваших замовлень</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Знайти замовлення</h2>
          
          {/* Search mode tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSearchMode('order')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                searchMode === 'order' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              За номером
            </button>
            <button
              onClick={() => setSearchMode('phone')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                searchMode === 'phone' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              За телефоном
            </button>
          </div>

          <form onSubmit={handleSearch} className="flex gap-3">
            {searchMode === 'order' ? (
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Введіть номер замовлення (Y-260302-B5CF34)"
                className="flex-1 h-12 rounded-xl"
              />
            ) : (
              <div className="flex-1 flex border rounded-xl overflow-hidden">
                <span className="flex items-center px-4 bg-slate-50 text-slate-500 border-r">
                  +38
                </span>
                <input
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="0XX XXX XX XX"
                  className="flex-1 px-4 h-12 outline-none"
                />
              </div>
            )}
            <Button type="submit" className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700">
              <Search className="w-5 h-5" />
            </Button>
          </form>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Завантаження...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">Замовлень не знайдено</h3>
            <p className="text-slate-500 mb-6">
              Введіть номер замовлення або телефон для пошуку
            </p>
            <Link to="/catalog">
              <Button className="rounded-xl">
                Перейти до каталогу
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard 
                key={order.id || order.order_number} 
                order={order}
                onCopy={copyToClipboard}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Order Card Component
const OrderCard = ({ order, onCopy, formatDate }) => {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
  const StatusIcon = statusConfig.icon;

  const handlePayNow = async () => {
    // Navigate to payment resume
    window.location.href = `/payment/resume/${order.id}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div 
        className="p-5 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusConfig.color.split(' ')[0]}`}>
              <StatusIcon className={`w-6 h-6 ${statusConfig.color.split(' ')[1]}`} />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-lg">#{order.order_number}</p>
              <p className="text-sm text-slate-500">
                {formatDate(order.created_at)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-slate-800">
              {order.total_amount?.toLocaleString('uk-UA')} ₴
            </p>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t px-5 py-4 space-y-4 bg-slate-50">
          {/* Order Items */}
          {order.items && order.items.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Товари:</p>
              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-700">
                      {item.title || item.name || 'Товар'} × {item.quantity}
                    </span>
                    <span className="font-medium text-slate-800">
                      {(item.price * item.quantity).toLocaleString('uk-UA')} ₴
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivery Info */}
          {order.delivery && (
            <div className="flex items-start gap-3 p-3 bg-white rounded-xl">
              <Truck className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium text-slate-800">Доставка</p>
                <p className="text-sm text-slate-600">
                  {order.delivery.city_name}, {order.delivery.warehouse_name}
                </p>
                {/* TTN (tracking number) */}
                {order.ttn && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm font-medium text-emerald-600">ТТН:</span>
                    <code className="bg-emerald-50 px-2 py-1 rounded text-emerald-700 font-mono text-sm">
                      {order.ttn}
                    </code>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onCopy(order.ttn); }}
                      className="p-1 hover:bg-emerald-100 rounded"
                    >
                      <Copy className="w-4 h-4 text-emerald-600" />
                    </button>
                    <a 
                      href={`https://novaposhta.ua/tracking/?cargo_number=${order.ttn}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-blue-100 rounded"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Customer Info */}
          {order.customer && (
            <div className="flex items-start gap-3 p-3 bg-white rounded-xl">
              <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="font-medium text-slate-800">{order.customer.full_name}</p>
                <p className="text-sm text-slate-600">{order.customer.phone}</p>
              </div>
            </div>
          )}

          {/* Payment Actions */}
          {(order.status === 'awaiting_payment' || order.status === 'new') && order.payment_method === 'card' && (
            <div className="pt-2">
              <Button 
                onClick={handlePayNow}
                className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-medium"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Оплатити зараз
              </Button>
            </div>
          )}

          {/* Copy order number */}
          <button
            onClick={(e) => { e.stopPropagation(); onCopy(order.order_number); }}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
          >
            <Copy className="w-4 h-4" />
            Копіювати номер замовлення
          </button>
        </div>
      )}

      {/* Expand indicator */}
      <div className="px-5 py-2 bg-slate-50 border-t flex justify-center">
        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </div>
    </div>
  );
};

export default OrdersPage;
