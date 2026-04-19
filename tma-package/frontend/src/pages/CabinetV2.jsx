import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Package, ChevronRight, Clock, Truck, CheckCircle, 
  XCircle, AlertCircle, LogOut, User, Phone, RefreshCw,
  Star, MessageSquare
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Order status badge component
const OrderStatusBadge = ({ status }) => {
  const statusConfig = {
    pending: { label: 'Очікує', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    processing: { label: 'В обробці', color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
    shipped: { label: 'Відправлено', color: 'bg-purple-100 text-purple-800', icon: Truck },
    delivered: { label: 'Доставлено', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    cancelled: { label: 'Скасовано', color: 'bg-red-100 text-red-800', icon: XCircle },
    refunded: { label: 'Повернено', color: 'bg-gray-100 text-gray-800', icon: RefreshCw },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  );
};

// Order card component
const OrderCard = ({ order, onClick }) => {
  const itemsCount = order.items?.length || 0;
  const firstItem = order.items?.[0];

  return (
    <Card 
      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
      data-testid={`order-card-${order.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{order.order_number}</h3>
          <p className="text-sm text-gray-500">
            {new Date(order.created_at).toLocaleDateString('uk-UA', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="flex items-center gap-3 mb-3">
        {firstItem?.image && (
          <img 
            src={firstItem.image} 
            alt={firstItem.title}
            className="w-16 h-16 object-cover rounded-lg"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 truncate">{firstItem?.title}</p>
          {itemsCount > 1 && (
            <p className="text-sm text-gray-500">та ще {itemsCount - 1} товар(ів)</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Package className="w-4 h-4" />
          <span>{itemsCount} товар(ів)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900">{order.total_amount?.toLocaleString()} ₴</span>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* TTN Badge */}
      {order.delivery?.ttn && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            <Truck className="w-4 h-4 inline mr-1" />
            ТТН: <span className="font-mono font-medium">{order.delivery.ttn}</span>
          </p>
        </div>
      )}
    </Card>
  );
};

const CabinetV2 = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [productsToReview, setProductsToReview] = useState([]);

  useEffect(() => {
    // Check if guest cabinet session exists
    const cabinetToken = localStorage.getItem('cabinet_token');
    const cabinetPhone = localStorage.getItem('cabinet_phone');

    if (isAuthenticated) {
      // Authenticated user - fetch from user cabinet
      fetchUserOrders();
      fetchProductsToReview();
    } else if (cabinetToken && cabinetPhone) {
      // Guest with OTP session
      setPhone(cabinetPhone);
      setIsGuestMode(true);
      fetchGuestOrders(cabinetToken);
    } else {
      // No session - redirect to login
      navigate('/cabinet/login');
    }
  }, [isAuthenticated, navigate]);

  const fetchUserOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/v2/cabinet/orders`, {
        withCredentials: true
      });
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsToReview = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/v2/cabinet/products-to-review`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      setProductsToReview(response.data.products || []);
    } catch (error) {
      console.error('Failed to fetch products to review:', error);
    }
  };

  const fetchGuestOrders = async (token) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/v2/cabinet/guest/orders`, {
        headers: { 'X-Cabinet-Token': token }
      });
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Failed to fetch guest orders:', error);
      if (error.response?.status === 401) {
        // Session expired
        localStorage.removeItem('cabinet_token');
        localStorage.removeItem('cabinet_phone');
        navigate('/cabinet/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isGuestMode) {
      const token = localStorage.getItem('cabinet_token');
      try {
        await axios.post(`${API_URL}/api/v2/cabinet/guest/logout`, {}, {
          headers: { 'X-Cabinet-Token': token }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
      localStorage.removeItem('cabinet_token');
      localStorage.removeItem('cabinet_phone');
      toast.success('Ви вийшли з кабінету');
      navigate('/cabinet/login');
    } else {
      logout();
      navigate('/');
    }
  };

  const handleOrderClick = (orderId) => {
    navigate(`/cabinet/orders/${orderId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container-main px-4">
          <div className="max-w-2xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-gray-200 rounded-xl"></div>
              <div className="h-32 bg-gray-200 rounded-xl"></div>
              <div className="h-32 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" data-testid="cabinet-page">
      <div className="container-main px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  {isAuthenticated ? (
                    <>
                      <h2 className="font-bold text-gray-900">{user?.full_name || 'Користувач'}</h2>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                    </>
                  ) : (
                    <>
                      <h2 className="font-bold text-gray-900">Гостьовий кабінет</h2>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {phone}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-gray-600"
                data-testid="logout-button"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Вийти
              </Button>
            </div>
          </Card>

          {/* Orders Section */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Мої замовлення ({orders.length})
            </h2>

            {orders.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Замовлень немає</h3>
                <p className="text-gray-500 mb-4">Ви ще не зробили жодного замовлення</p>
                <Button onClick={() => navigate('/products')} className="bg-green-600 hover:bg-green-700">
                  Перейти до каталогу
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    onClick={() => handleOrderClick(order.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Products to Review Section */}
          {!isGuestMode && productsToReview.length > 0 && (
            <div className="mb-6" data-testid="products-to-review-section">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Залиште відгук ({productsToReview.length})
              </h2>
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <p className="text-sm text-yellow-800 mb-4">
                  Ви отримали товари і можете залишити відгук. Ваша думка допоможе іншим покупцям!
                </p>
                <div className="space-y-3">
                  {productsToReview.slice(0, 3).map((product) => (
                    <div 
                      key={product.product_id}
                      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-yellow-100"
                    >
                      {product.image && (
                        <img 
                          src={product.image} 
                          alt={product.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{product.title}</p>
                        <p className="text-xs text-gray-500">Замовлення: {product.order_number}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/cabinet/orders/${product.order_id}`)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white"
                        data-testid={`review-product-${product.product_id}`}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Відгук
                      </Button>
                    </div>
                  ))}
                </div>
                {productsToReview.length > 3 && (
                  <p className="text-sm text-yellow-700 mt-3 text-center">
                    Та ще {productsToReview.length - 3} товар(ів) для відгуку
                  </p>
                )}
              </Card>
            </div>
          )}

          {/* Help Section */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Потрібна допомога?</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Зв'яжіться з нами: <a href="tel:+380XXXXXXXXX" className="font-medium underline">+380 XX XXX XX XX</a>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CabinetV2;
