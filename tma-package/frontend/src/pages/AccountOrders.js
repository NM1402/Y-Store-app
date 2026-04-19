import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';
import { 
  Package, 
  ChevronRight,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: { uk: 'Очікує', ru: 'Ожидает' } },
  confirmed: { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100', label: { uk: 'Підтверджено', ru: 'Подтверждено' } },
  processing: { icon: RefreshCw, color: 'text-purple-600', bg: 'bg-purple-100', label: { uk: 'Обробляється', ru: 'Обрабатывается' } },
  shipped: { icon: Truck, color: 'text-green-600', bg: 'bg-green-100', label: { uk: 'Відправлено', ru: 'Отправлено' } },
  delivered: { icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-200', label: { uk: 'Доставлено', ru: 'Доставлено' } },
  cancelled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: { uk: 'Скасовано', ru: 'Отменено' } },
  returned: { icon: RefreshCw, color: 'text-orange-600', bg: 'bg-orange-100', label: { uk: 'Повернено', ru: 'Возврат' } },
};

const AccountOrders = () => {
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const T = {
    uk: {
      title: 'Мої замовлення',
      empty: 'У вас ще немає замовлень',
      goShopping: 'Перейти до каталогу',
      orderNumber: 'Замовлення',
      total: 'Сума',
      items: 'товарів',
      details: 'Детальніше',
      back: 'Назад'
    },
    ru: {
      title: 'Мои заказы',
      empty: 'У вас пока нет заказов',
      goShopping: 'Перейти в каталог',
      orderNumber: 'Заказ',
      total: 'Сумма',
      items: 'товаров',
      details: 'Подробнее',
      back: 'Назад'
    }
  };

  const txt = T[language] || T.uk;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchOrders = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/api/v2/cabinet/orders?page=${page}&limit=10`, {
          withCredentials: true
        });
        setOrders(response.data.orders || []);
        setTotalPages(response.data.pages || 1);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, navigate, page]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'uk' ? 'uk-UA' : 'ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusConfig = (status) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-8">
      <div className="container-main px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/account">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-black text-gray-900">{txt.title}</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <Card className="p-12 text-center bg-white/80 backdrop-blur">
            <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <p className="text-xl text-gray-500 mb-6">{txt.empty}</p>
            <Button onClick={() => navigate('/products')} className="bg-blue-600 hover:bg-blue-700">
              {txt.goShopping}
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              const StatusIcon = statusConfig.icon;
              
              return (
                <Link key={order.id} to={`/account/orders/${order.id}`}>
                  <Card className="p-6 bg-white/80 backdrop-blur border-0 shadow-lg hover:shadow-xl transition-all hover:scale-[1.01] cursor-pointer mb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Order info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-bold text-lg">
                            {txt.orderNumber} #{order.order_number || order.id?.slice(0, 8)}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 ${statusConfig.bg} ${statusConfig.color}`}>
                            <StatusIcon className="w-4 h-4" />
                            {statusConfig.label[language]}
                          </span>
                        </div>
                        <p className="text-gray-500 text-sm">
                          {formatDate(order.created_at)}
                        </p>
                        
                        {/* Items preview */}
                        <div className="flex items-center gap-2 mt-3">
                          {order.items?.slice(0, 3).map((item, idx) => (
                            <div 
                              key={idx} 
                              className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden"
                            >
                              {item.image && (
                                <img src={item.image} alt="" className="w-full h-full object-cover" />
                              )}
                            </div>
                          ))}
                          {order.items?.length > 3 && (
                            <span className="text-gray-400 text-sm">+{order.items.length - 3}</span>
                          )}
                          <span className="text-gray-500 text-sm ml-2">
                            {order.items?.length || 0} {txt.items}
                          </span>
                        </div>

                        {/* TTN */}
                        {order.delivery?.ttn && (
                          <div className="mt-3 text-sm">
                            <span className="text-gray-500">ТТН: </span>
                            <span className="font-mono font-semibold text-blue-600">{order.delivery.ttn}</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Total & action */}
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">{txt.total}</p>
                          <p className="text-2xl font-black text-gray-900">
                            {order.total_amount?.toLocaleString()} ₴
                          </p>
                        </div>
                        <ChevronRight className="w-6 h-6 text-gray-400" />
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={p === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPage(p)}
                    className={p === page ? 'bg-blue-600' : ''}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountOrders;
