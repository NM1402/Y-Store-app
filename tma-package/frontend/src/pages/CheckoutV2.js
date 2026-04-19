import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  ShoppingBag, 
  User, 
  Truck, 
  CreditCard, 
  ChevronDown, 
  ChevronUp,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  Shield,
  Clock,
  Package
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import NovaPoshtaDelivery from '../components/NovaPoshtaDelivery';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const FREE_DELIVERY_THRESHOLD = 2000;

const CheckoutV2 = () => {
  const { user, isAuthenticated } = useAuth();
  const { cart, cartTotal, clearCart, fetchCart } = useCart();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // Get cart items from cart object
  const cartItems = cart?.items || [];

  // Form state
  const [customerData, setCustomerData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    email: user?.email || ''
  });

  const [deliveryData, setDeliveryData] = useState({
    method: 'nova_poshta',
    city_ref: '',
    city_name: '',
    warehouse_ref: '',
    warehouse_name: '',
    delivery_cost: 0
  });

  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthSection, setShowAuthSection] = useState(false);

  // Phone mask formatting
  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.length <= 2) return `+${digits}`;
    if (digits.length <= 5) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 8) return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    if (digits.length <= 10) return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setCustomerData(prev => ({ ...prev, phone: formatted }));
  };

  // Calculate totals
  const subtotal = cartTotal;
  const deliveryCost = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : deliveryData.delivery_cost;
  const total = subtotal + deliveryCost;

  // Handle Nova Poshta selection
  const handleNovaPoshtaChange = (data) => {
    setDeliveryData(prev => ({
      ...prev,
      city_ref: data.city_ref || '',
      city_name: data.city_name || '',
      warehouse_ref: data.warehouse_ref || '',
      warehouse_name: data.warehouse_name || '',
      delivery_cost: data.delivery_cost || 0
    }));
  };

  // Google login handler
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/auth-callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  // Submit order
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!customerData.phone) {
      toast.error('Вкажіть номер телефону');
      return;
    }
    if (!customerData.full_name) {
      toast.error("Вкажіть ім'я");
      return;
    }
    if (deliveryData.method === 'nova_poshta' && !deliveryData.warehouse_ref) {
      toast.error('Оберіть відділення Нової Пошти');
      return;
    }
    if (cartItems.length === 0) {
      toast.error('Кошик порожній');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderPayload = {
        customer: {
          full_name: customerData.full_name,
          phone: customerData.phone.replace(/\s/g, ''),
          email: customerData.email || undefined
        },
        delivery: {
          method: deliveryData.method,
          city_ref: deliveryData.city_ref,
          city_name: deliveryData.city_name,
          warehouse_ref: deliveryData.warehouse_ref,
          warehouse_name: deliveryData.warehouse_name,
          delivery_cost: deliveryCost
        },
        items: cartItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price
        })),
        payment_method: paymentMethod,
        comment: comment || undefined
      };

      const response = await axios.post(
        `${API_URL}/api/v2/orders/create`,
        orderPayload,
        { withCredentials: true }
      );

      // Clear cart
      if (isAuthenticated) {
        await clearCart();
      }

      // Redirect to success
      navigate('/checkout/success', {
        state: {
          orderNumber: response.data.order_number,
          orderId: response.data.order_id,
          total: response.data.total_amount
        }
      });

      toast.success('Замовлення успішно оформлено!');

    } catch (error) {
      console.error('Order error:', error);
      toast.error(error.response?.data?.detail || 'Помилка оформлення замовлення');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load cart if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  // Update customer data from user
  useEffect(() => {
    if (user) {
      setCustomerData(prev => ({
        full_name: user.full_name || prev.full_name,
        phone: user.phone || prev.phone,
        email: user.email || prev.email
      }));
    }
  }, [user]);

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-12">
        <div className="container-main px-4 text-center">
          <ShoppingBag className="w-24 h-24 text-gray-300 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Кошик порожній</h1>
          <p className="text-gray-600 mb-8">Додайте товари до кошика для оформлення замовлення</p>
          <Button onClick={() => navigate('/products')} className="bg-blue-600 hover:bg-blue-700">
            Перейти до каталогу
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-8">
      <div className="container-main px-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8">
          Оформлення замовлення
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Forms */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Auth Section (Optional) */}
              {!isAuthenticated && (
                <Card className="p-6 bg-white/80 backdrop-blur">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setShowAuthSection(!showAuthSection)}
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold">Увійти в акаунт (необов'язково)</span>
                    </div>
                    {showAuthSection ? <ChevronUp /> : <ChevronDown />}
                  </div>
                  
                  {showAuthSection && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-600 mb-4">
                        Увійдіть, щоб зберегти замовлення в історії та отримати бонуси
                      </p>
                      <Button 
                        type="button"
                        onClick={handleGoogleLogin}
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Увійти через Google
                      </Button>
                    </div>
                  )}
                </Card>
              )}

              {/* Customer Info */}
              <Card className="p-6 bg-white/80 backdrop-blur">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold">Контактні дані</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Ім'я та прізвище *</Label>
                    <Input
                      id="full_name"
                      value={customerData.full_name}
                      onChange={(e) => setCustomerData(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Іван Іванов"
                      required
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Телефон *</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="phone"
                        value={customerData.phone}
                        onChange={handlePhoneChange}
                        placeholder="+38 0XX XXX XX XX"
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="email">Email (для підтвердження)</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={customerData.email}
                        onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="your@email.com"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Delivery */}
              <Card className="p-6 bg-white/80 backdrop-blur">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold">Доставка</h2>
                </div>

                <NovaPoshtaDelivery
                  onSelect={handleNovaPoshtaChange}
                  cartTotal={subtotal}
                  freeDeliveryThreshold={FREE_DELIVERY_THRESHOLD}
                />

                {/* Free delivery upsell */}
                {subtotal < FREE_DELIVERY_THRESHOLD && subtotal > 0 && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-800">
                          Безкоштовна доставка від {FREE_DELIVERY_THRESHOLD} ₴
                        </p>
                        <p className="text-sm text-green-600">
                          Додайте ще {FREE_DELIVERY_THRESHOLD - subtotal} ₴ для безкоштовної доставки
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Payment */}
              <Card className="p-6 bg-white/80 backdrop-blur">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-bold">Оплата</h2>
                </div>

                <div className="space-y-3">
                  <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'cash_on_delivery' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="payment"
                      value="cash_on_delivery"
                      checked={paymentMethod === 'cash_on_delivery'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-5 h-5 text-blue-600"
                    />
                    <div>
                      <p className="font-semibold">Оплата при отриманні</p>
                      <p className="text-sm text-gray-500">Готівкою або карткою у відділенні</p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="payment"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-5 h-5 text-blue-600"
                    />
                    <div>
                      <p className="font-semibold">Оплата карткою онлайн</p>
                      <p className="text-sm text-gray-500">Visa, Mastercard</p>
                    </div>
                  </label>
                </div>
              </Card>

              {/* Comment */}
              <Card className="p-6 bg-white/80 backdrop-blur">
                <Label htmlFor="comment">Коментар до замовлення</Label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Додаткові побажання..."
                  rows={3}
                  className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                />
              </Card>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <Card className="p-6 bg-white/80 backdrop-blur">
                  <h2 className="text-xl font-bold mb-6">Ваше замовлення</h2>

                  {/* Items */}
                  <div className="space-y-4 mb-6">
                    {cartItems.map((item) => (
                      <div key={item.product_id} className="flex gap-3">
                        <img
                          src={item.image || 'https://via.placeholder.com/60'}
                          alt={item.title}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm line-clamp-2">{item.title}</p>
                          <p className="text-sm text-gray-500">{item.quantity} шт.</p>
                          <p className="font-semibold">{(item.price * item.quantity).toLocaleString()} ₴</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Товари ({cartItems.length})</span>
                      <span>{subtotal.toLocaleString()} ₴</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Доставка</span>
                      <span className={deliveryCost === 0 ? 'text-green-600 font-semibold' : ''}>
                        {deliveryCost === 0 ? 'Безкоштовно' : `${deliveryCost} ₴`}
                      </span>
                    </div>
                    <div className="flex justify-between text-xl font-bold pt-2 border-t">
                      <span>Разом</span>
                      <span className="text-blue-600">{total.toLocaleString()} ₴</span>
                    </div>
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 rounded-xl text-lg font-bold shadow-xl hover:shadow-2xl transition-all"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Оформлення...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Підтвердити замовлення
                      </span>
                    )}
                  </Button>

                  {/* Trust Block */}
                  <div className="mt-6 pt-6 border-t space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Shield className="w-5 h-5 text-green-500" />
                      <span>Безпечна оплата</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Clock className="w-5 h-5 text-blue-500" />
                      <span>Відправка 1-2 робочих дні</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Package className="w-5 h-5 text-purple-500" />
                      <span>Гарантія 14 днів на повернення</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckoutV2;
