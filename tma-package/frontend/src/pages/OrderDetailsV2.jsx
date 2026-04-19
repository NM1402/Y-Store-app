import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Package, Truck, Clock, CheckCircle, XCircle,
  Phone, Mail, MapPin, CreditCard, Copy, ExternalLink, RefreshCw,
  Star, MessageSquare
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Timeline component for order status history
const OrderTimeline = ({ statusHistory = [], currentStatus }) => {
  const statuses = [
    { key: 'pending', label: 'Нове замовлення', icon: Clock },
    { key: 'processing', label: 'В обробці', icon: RefreshCw },
    { key: 'shipped', label: 'Відправлено', icon: Truck },
    { key: 'delivered', label: 'Доставлено', icon: CheckCircle },
  ];

  const currentIndex = statuses.findIndex(s => s.key === currentStatus);

  return (
    <div className="relative">
      {statuses.map((status, index) => {
        const isCompleted = index <= currentIndex;
        const isCurrent = status.key === currentStatus;
        const Icon = status.icon;
        const historyItem = statusHistory.find(h => h.status === status.key);

        return (
          <div key={status.key} className="flex items-start gap-4 pb-6 last:pb-0">
            {/* Timeline line */}
            <div className="relative flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isCompleted 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-400'
              } ${isCurrent ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              {index < statuses.length - 1 && (
                <div className={`w-0.5 h-full absolute top-10 ${
                  index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1.5">
              <p className={`font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                {status.label}
              </p>
              {historyItem && (
                <p className="text-sm text-gray-500">
                  {new Date(historyItem.timestamp).toLocaleString('uk-UA')}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const OrderDetailsV2 = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [reviewableItems, setReviewableItems] = useState([]);
  const [reviewForm, setReviewForm] = useState({ productId: null, rating: 5, text: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const cabinetToken = localStorage.getItem('cabinet_token');
    
    if (isAuthenticated) {
      fetchUserOrder();
    } else if (cabinetToken) {
      setIsGuestMode(true);
      fetchGuestOrder(cabinetToken);
    } else {
      navigate('/cabinet/login');
    }
  }, [orderId, isAuthenticated, navigate]);

  const fetchUserOrder = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/v2/cabinet/orders/${orderId}`, {
        withCredentials: true
      });
      setOrder(response.data);
      
      // Fetch reviewable items for this order
      if (response.data.status === 'delivered' || response.data.status === 'completed') {
        fetchReviewableItems();
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
      toast.error('Не вдалося завантажити замовлення');
      navigate('/cabinet');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewableItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/v2/cabinet/orders/${orderId}/reviewable-items`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true 
        }
      );
      setReviewableItems(response.data.items || []);
    } catch (error) {
      console.error('Failed to fetch reviewable items:', error);
    }
  };

  const handleSubmitReview = async (productId) => {
    if (!reviewForm.text.trim()) {
      toast.error('Будь ласка, напишіть відгук');
      return;
    }

    try {
      setSubmittingReview(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/reviews`,
        {
          product_id: productId,
          rating: reviewForm.rating,
          text: reviewForm.text.trim()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Відгук додано! Дякуємо!');
      setReviewForm({ productId: null, rating: 5, text: '' });
      
      // Refresh reviewable items
      fetchReviewableItems();
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error(error.response?.data?.detail || 'Помилка при додаванні відгуку');
    } finally {
      setSubmittingReview(false);
    }
  };

  const fetchGuestOrder = async (token) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/v2/cabinet/guest/orders/${orderId}`, {
        headers: { 'X-Cabinet-Token': token }
      });
      setOrder(response.data);
    } catch (error) {
      console.error('Failed to fetch guest order:', error);
      toast.error('Не вдалося завантажити замовлення');
      navigate('/cabinet');
    } finally {
      setLoading(false);
    }
  };

  const copyTTN = () => {
    if (order?.delivery?.ttn) {
      navigator.clipboard.writeText(order.delivery.ttn);
      toast.success('ТТН скопійовано');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container-main px-4">
          <div className="max-w-2xl mx-auto animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded w-1/3"></div>
            <div className="h-48 bg-gray-200 rounded-xl"></div>
            <div className="h-32 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container-main px-4 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-4">Замовлення не знайдено</h2>
          <Button onClick={() => navigate('/cabinet')}>Повернутися до кабінету</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" data-testid="order-details-page">
      <div className="container-main px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={() => navigate('/cabinet')}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{order.order_number}</h1>
              <p className="text-sm text-gray-500">
                {new Date(order.created_at).toLocaleString('uk-UA')}
              </p>
            </div>
          </div>

          {/* Status Card */}
          <Card className="p-6 mb-6">
            <h2 className="font-bold text-gray-900 mb-4">Статус замовлення</h2>
            <OrderTimeline 
              statusHistory={order.status_history || []} 
              currentStatus={order.status}
            />
          </Card>

          {/* TTN Tracking */}
          {order.delivery?.ttn && (
            <Card className="p-6 mb-6 bg-green-50 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-green-800">Номер ТТН</h3>
                  <p className="text-2xl font-mono font-bold text-green-700 mt-1">
                    {order.delivery.ttn}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyTTN}
                    className="bg-white"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Копіювати
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://novaposhta.ua/tracking/?cargo_number=${order.delivery.ttn}`, '_blank')}
                    className="bg-white"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Відстежити
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Order Items */}
          <Card className="p-6 mb-6">
            <h2 className="font-bold text-gray-900 mb-4">Товари</h2>
            <div className="space-y-4">
              {order.items?.map((item, index) => {
                const reviewableItem = reviewableItems.find(r => r.product_id === item.product_id);
                const canReview = reviewableItem?.can_review && isAuthenticated && !isGuestMode;
                const alreadyReviewed = reviewableItem?.already_reviewed;
                const isReviewFormOpen = reviewForm.productId === item.product_id;

                return (
                  <div key={index} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="flex gap-4">
                      <img
                        src={item.image || 'https://via.placeholder.com/80'}
                        alt={item.title}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <Link 
                          to={`/product/${item.product_id}`}
                          className="font-medium text-gray-900 hover:text-green-600 transition-colors"
                        >
                          {item.title}
                        </Link>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-500">{item.quantity} шт.</span>
                          <span className="font-semibold">{(item.price * item.quantity).toLocaleString()} ₴</span>
                        </div>
                        
                        {/* Review Button */}
                        {(order.status === 'delivered' || order.status === 'completed') && !isGuestMode && (
                          <div className="mt-3">
                            {alreadyReviewed ? (
                              <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                Відгук залишено
                              </span>
                            ) : canReview ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setReviewForm({ 
                                  productId: isReviewFormOpen ? null : item.product_id,
                                  rating: 5,
                                  text: ''
                                })}
                                className="text-green-600 border-green-600 hover:bg-green-50"
                                data-testid={`review-btn-${item.product_id}`}
                              >
                                <MessageSquare className="w-4 h-4 mr-1" />
                                {isReviewFormOpen ? 'Скасувати' : 'Залишити відгук'}
                              </Button>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Review Form */}
                    {isReviewFormOpen && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg" data-testid={`review-form-${item.product_id}`}>
                        <h4 className="font-medium text-gray-900 mb-3">Ваш відгук про "{item.title}"</h4>
                        
                        {/* Rating Stars */}
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Оцінка</label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                                className="focus:outline-none transition-transform hover:scale-110"
                              >
                                <Star
                                  className={`w-7 h-7 ${
                                    star <= reviewForm.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Comment */}
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Коментар</label>
                          <textarea
                            value={reviewForm.text}
                            onChange={(e) => setReviewForm(prev => ({ ...prev, text: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="Розкажіть про ваш досвід користування товаром..."
                          />
                        </div>

                        <Button
                          onClick={() => handleSubmitReview(item.product_id)}
                          disabled={submittingReview || !reviewForm.text.trim()}
                          className="bg-green-600 hover:bg-green-700"
                          data-testid={`submit-review-${item.product_id}`}
                        >
                          {submittingReview ? 'Відправка...' : 'Надіслати відгук'}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Товари</span>
                <span>{(order.total_amount - (order.delivery?.delivery_cost || 0)).toLocaleString()} ₴</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Доставка</span>
                <span>{order.delivery?.delivery_cost === 0 ? 'Безкоштовно' : `${order.delivery?.delivery_cost || 0} ₴`}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Разом</span>
                <span className="text-green-600">{order.total_amount?.toLocaleString()} ₴</span>
              </div>
            </div>
          </Card>

          {/* Customer & Delivery Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="p-6">
              <h3 className="font-bold text-gray-900 mb-3">Отримувач</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">{order.customer?.full_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{order.customer?.phone}</span>
                </div>
                {order.customer?.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>{order.customer.email}</span>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold text-gray-900 mb-3">Доставка</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <div>
                    <p>{order.delivery?.city_name}</p>
                    <p className="text-gray-500">{order.delivery?.warehouse_name}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Payment Info */}
          <Card className="p-6">
            <h3 className="font-bold text-gray-900 mb-3">Оплата</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CreditCard className="w-4 h-4" />
              <span>
                {order.payment_method === 'cash_on_delivery' 
                  ? 'Оплата при отриманні' 
                  : 'Оплата карткою онлайн'
                }
              </span>
              <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${
                order.payment_status === 'paid' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {order.payment_status === 'paid' ? 'Оплачено' : 'Очікує оплати'}
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsV2;
