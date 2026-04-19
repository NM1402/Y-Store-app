import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import { User, Package, MapPin, Settings, ShoppingBag, Star, MessageSquare } from 'lucide-react';
import axios from 'axios';

const UserProfile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [userProfile, setUserProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    region: '',
    np_department: '',
    delivery_notes: '',
    delivery_method: 'nova_poshta'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState('nova_poshta');
  const [npDepartments, setNpDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  
  // Reviews state
  const [reviewableProducts, setReviewableProducts] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewForm, setReviewForm] = useState({ product_id: '', rating: 5, comment: '' });
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Initialize user profile ONLY if not currently editing
    // This prevents overwriting user's changes during edit mode
    if (!isEditing) {
      const deliveryMethod = user.delivery_method || 'nova_poshta';
      setUserProfile({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        postal_code: user.postal_code || '',
        region: user.region || '',
        np_department: user.np_department || '',
        delivery_notes: user.delivery_notes || '',
        delivery_method: deliveryMethod
      });
      setSelectedDelivery(deliveryMethod);
    }

    if (activeTab === 'orders') {
      fetchOrders();
    }
    
    if (activeTab === 'reviews') {
      fetchReviewsData();
    }
  }, [user, loading, navigate, activeTab]);

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/orders`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Не удалось загрузить заказы');
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchReviewsData = async () => {
    try {
      setLoadingReviews(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [reviewableRes, myReviewsRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/user/reviewable-products`, { headers }),
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/user/my-reviews`, { headers })
      ]);
      
      setReviewableProducts(reviewableRes.data);
      setMyReviews(myReviewsRes.data);
    } catch (error) {
      console.error('Failed to fetch reviews data:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const openReviewModal = (product) => {
    setReviewForm({ product_id: product.product_id, rating: 5, comment: '', product_title: product.title });
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/reviews`,
        { product_id: reviewForm.product_id, rating: reviewForm.rating, comment: reviewForm.comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Відгук успішно додано!');
      setShowReviewModal(false);
      fetchReviewsData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Помилка при додаванні відгуку');
    }
  };

  const fetchNPDepartments = async (city) => {
    if (!city || city.length < 2) {
      setNpDepartments([]);
      return;
    }
    
    try {
      setLoadingDepartments(true);
      // Mock data - в продакшені тут буде API Нової Пошти
      const mockDepartments = [
        `Відділення №1 (${city}, вул. Центральна, 1)`,
        `Відділення №2 (${city}, просп. Миру, 15)`,
        `Відділення №5 (${city}, вул. Шевченка, 23)`,
        `Відділення №8 (${city}, бул. Слави, 45)`,
        `Відділення №12 (${city}, вул. Київська, 78)`,
        `Відділення №15 (${city}, просп. Перемоги, 120)`,
        `Відділення №20 (${city}, вул. Лесі Українки, 5)`,
      ];
      
      setNpDepartments(mockDepartments);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    // Check if anything actually changed
    const hasChanges = 
      userProfile.full_name !== (user.full_name || '') ||
      userProfile.email !== (user.email || '') ||
      userProfile.phone !== (user.phone || '') ||
      userProfile.address !== (user.address || '') ||
      userProfile.city !== (user.city || '') ||
      userProfile.postal_code !== (user.postal_code || '') ||
      userProfile.region !== (user.region || '') ||
      userProfile.np_department !== (user.np_department || '') ||
      userProfile.delivery_notes !== (user.delivery_notes || '') ||
      userProfile.delivery_method !== (user.delivery_method || 'nova_poshta');
    
    if (!hasChanges) {
      toast.info('Нет изменений для сохранения');
      setIsEditing(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/users/me`,
        userProfile,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local storage with response from server
      const updatedUser = response.data;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      toast.success('Профиль успешно обновлен!');
      setIsEditing(false);
      
      // Reload page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Ошибка обновления профиля');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'В обработке', color: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: 'Подтвержден', color: 'bg-blue-100 text-blue-800' },
      shipped: { label: 'Отправлен', color: 'bg-purple-100 text-purple-800' },
      delivered: { label: 'Доставлен', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Отменен', color: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-12">
      <div className="container-main">
        <div className="mb-12 animate-slideInLeft">
          <div className="flex items-center gap-6 mb-4">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Особистий кабінет
              </h1>
              <p className="text-gray-600 text-xl mt-2">
                Вітаємо, <strong>{user.full_name || user.email}</strong>! 👋
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-10 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-4 font-bold rounded-2xl transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl scale-105'
                : 'bg-white text-gray-600 hover:bg-gray-50 hover:scale-105 shadow-md'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            Мої замовлення
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-4 font-bold rounded-2xl transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl scale-105'
                : 'bg-white text-gray-600 hover:bg-gray-50 hover:scale-105 shadow-md'
            }`}
          >
            <User className="w-5 h-5" />
            Особисті дані
          </button>
          <button
            onClick={() => setActiveTab('addresses')}
            className={`px-6 py-4 font-bold rounded-2xl transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'addresses'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl scale-105'
                : 'bg-white text-gray-600 hover:bg-gray-50 hover:scale-105 shadow-md'
            }`}
          >
            <MapPin className="w-5 h-5" />
            Адреси доставки
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-4 font-bold rounded-2xl transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl scale-105'
                : 'bg-white text-gray-600 hover:bg-gray-50 hover:scale-105 shadow-md'
            }`}
          >
            <Settings className="w-5 h-5" />
            Налаштування
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-6 py-4 font-bold rounded-2xl transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'reviews'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl scale-105'
                : 'bg-white text-gray-600 hover:bg-gray-50 hover:scale-105 shadow-md'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            Мої відгуки
          </button>
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">История заказов</h2>
              <Button onClick={fetchOrders} variant="outline" disabled={loadingOrders}>
                {loadingOrders ? 'Загрузка...' : 'Обновить'}
              </Button>
            </div>

            {loadingOrders ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : orders.length === 0 ? (
              <Card className="p-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">У вас пока нет заказов</h3>
                <p className="text-gray-600 mb-6">Начните покупки и ваши заказы появятся здесь</p>
                <Button onClick={() => navigate('/products')}>
                  Перейти к покупкам
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">Заказ #{order.id.slice(0, 8)}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleDateString('ru-RU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>

                    <div className="border-t border-gray-200 pt-4 mb-4">
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0"></div>
                              <div>
                                <p className="font-medium">{item.title}</p>
                                <p className="text-sm text-gray-600">Количество: {item.quantity}</p>
                              </div>
                            </div>
                            <p className="font-semibold">${item.price * item.quantity}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t border-gray-200 pt-4">
                      <div>
                        <p className="text-sm text-gray-600">Способ доставки</p>
                        <p className="font-medium">{order.delivery_method === 'nova_poshta' ? 'Нова Пошта' : order.delivery_method === 'ukrposhta' ? 'Укрпошта' : 'Самовывоз'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 mb-1">Итого</p>
                        <p className="text-2xl font-bold text-blue-600">${order.total_amount}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">Адрес доставки:</p>
                      <p className="font-medium">
                        {order.delivery_address?.city}, {order.delivery_address?.address}
                        {order.delivery_address?.postal_code && `, ${order.delivery_address.postal_code}`}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold mb-6">Личные данные</h2>
            
            <Card className="p-6">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Полное имя</Label>
                  <Input
                    id="full_name"
                    value={userProfile.full_name}
                    onChange={(e) => setUserProfile({ ...userProfile, full_name: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1"
                    placeholder={isEditing ? "Введите полное имя" : ""}
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userProfile.email}
                    onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    value={userProfile.phone}
                    onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                    disabled={!isEditing}
                    placeholder="+380..."
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  {!isEditing ? (
                    <Button 
                      type="button" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsEditing(true);
                      }}
                    >
                      Редактировать профиль
                    </Button>
                  ) : (
                    <>
                      <Button type="submit">Сохранить изменения</Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsEditing(false);
                          const deliveryMethod = user.delivery_method || 'nova_poshta';
                          setUserProfile({
                            full_name: user.full_name || '',
                            email: user.email || '',
                            phone: user.phone || '',
                            address: user.address || '',
                            city: user.city || '',
                            postal_code: user.postal_code || '',
                            region: user.region || '',
                            np_department: user.np_department || '',
                            delivery_notes: user.delivery_notes || '',
                            delivery_method: deliveryMethod
                          });
                          setSelectedDelivery(deliveryMethod);
                        }}
                      >
                        Отменить
                      </Button>
                    </>
                  )}
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Addresses Tab */}
        {activeTab === 'addresses' && (
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold mb-6">Адреса доставки</h2>
            
            <Card className="p-6">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                {/* Delivery Method Selection */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Способ доставки</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                        selectedDelivery === 'nova_poshta' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-blue-300'
                      } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        if (isEditing) {
                          setSelectedDelivery('nova_poshta');
                          setUserProfile({ ...userProfile, delivery_method: 'nova_poshta' });
                        }
                      }}
                    >
                      <div className="flex items-center">
                        <input 
                          type="radio" 
                          name="delivery_method" 
                          value="nova_poshta"
                          checked={selectedDelivery === 'nova_poshta'}
                          onChange={(e) => {
                            setSelectedDelivery(e.target.value);
                            setUserProfile({ ...userProfile, delivery_method: e.target.value });
                          }}
                          className="mr-2"
                          disabled={!isEditing}
                        />
                        <div>
                          <span className="font-medium">Нова Пошта</span>
                          <p className="text-sm text-gray-600 mt-1">Доставка до отделения</p>
                        </div>
                      </div>
                    </div>
                    <div 
                      className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                        selectedDelivery === 'ukrposhta' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-blue-300'
                      } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        if (isEditing) {
                          setSelectedDelivery('ukrposhta');
                          setUserProfile({ ...userProfile, delivery_method: 'ukrposhta' });
                        }
                      }}
                    >
                      <div className="flex items-center">
                        <input 
                          type="radio" 
                          name="delivery_method" 
                          value="ukrposhta"
                          checked={selectedDelivery === 'ukrposhta'}
                          onChange={(e) => {
                            setSelectedDelivery(e.target.value);
                            setUserProfile({ ...userProfile, delivery_method: e.target.value });
                          }}
                          className="mr-2"
                          disabled={!isEditing}
                        />
                        <div>
                          <span className="font-medium">Укрпошта</span>
                          <p className="text-sm text-gray-600 mt-1">Почтовая доставка</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* City */}
                <div>
                  <Label htmlFor="city">Город *</Label>
                  <Input
                    id="city"
                    value={userProfile.city}
                    onChange={(e) => {
                      const city = e.target.value;
                      setUserProfile({ ...userProfile, city });
                      // Fetch departments for Nova Poshta when city changes
                      if (selectedDelivery === 'nova_poshta') {
                        fetchNPDepartments(city);
                      }
                    }}
                    disabled={!isEditing}
                    placeholder="Киев"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">Укажите город доставки</p>
                </div>

                {/* Nova Poshta Department - Show only for Nova Poshta */}
                {selectedDelivery === 'nova_poshta' && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <Label htmlFor="np_department" className="text-blue-900 font-semibold">
                      Отделение Новой Почты *
                    </Label>
                    {userProfile.city && npDepartments.length > 0 ? (
                      <select
                        id="np_department"
                        value={userProfile.np_department || ''}
                        onChange={(e) => setUserProfile({ ...userProfile, np_department: e.target.value })}
                        disabled={!isEditing}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Выберите отделение</option>
                        {npDepartments.map((dept, idx) => (
                          <option key={idx} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id="np_department"
                        value={userProfile.np_department || ''}
                        onChange={(e) => setUserProfile({ ...userProfile, np_department: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Сначала укажите город"
                        className="mt-2 bg-white"
                      />
                    )}
                    {loadingDepartments && (
                      <p className="text-sm text-blue-600 mt-2">Загрузка отделений...</p>
                    )}
                    <p className="text-sm text-blue-700 mt-2">
                      📦 Выберите отделение Новой Почты для самовывоза
                    </p>
                  </div>
                )}

                {/* Ukrposhta Info - Show only for Ukrposhta */}
                {selectedDelivery === 'ukrposhta' && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <Label className="text-green-900 font-semibold mb-2 block">
                      📮 Доставка Укрпоштой
                    </Label>
                    <p className="text-sm text-green-700">
                      Доставка будет осуществлена на указанный ниже адрес. 
                      Обязательно укажите полный адрес и почтовый индекс.
                    </p>
                  </div>
                )}

                {/* Street Address */}
                <div>
                  <Label htmlFor="address">Полный адрес (улица, дом, квартира)</Label>
                  <Input
                    id="address"
                    value={userProfile.address}
                    onChange={(e) => setUserProfile({ ...userProfile, address: e.target.value })}
                    disabled={!isEditing}
                    placeholder="ул. Крещатик, д. 1, кв. 10"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">Для курьерской доставки</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Region/Oblast */}
                  <div>
                    <Label htmlFor="region">Область/Регион</Label>
                    <Input
                      id="region"
                      value={userProfile.region || ''}
                      onChange={(e) => setUserProfile({ ...userProfile, region: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Киевская область"
                      className="mt-1"
                    />
                  </div>

                  {/* Postal Code */}
                  <div>
                    <Label htmlFor="postal_code">Почтовый индекс</Label>
                    <Input
                      id="postal_code"
                      value={userProfile.postal_code}
                      onChange={(e) => setUserProfile({ ...userProfile, postal_code: e.target.value })}
                      disabled={!isEditing}
                      placeholder="01001"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <Label htmlFor="delivery_notes">Дополнительные заметки</Label>
                  <textarea
                    id="delivery_notes"
                    value={userProfile.delivery_notes || ''}
                    onChange={(e) => setUserProfile({ ...userProfile, delivery_notes: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Например: код домофона, этаж, особые пожелания по доставке"
                    className="mt-1 w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  {!isEditing ? (
                    <Button 
                      type="button" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsEditing(true);
                      }}
                    >
                      Редактировать адрес
                    </Button>
                  ) : (
                    <>
                      <Button type="submit">Сохранить изменения</Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsEditing(false);
                        }}
                      >
                        Отменить
                      </Button>
                    </>
                  )}
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            <h2 className="text-2xl font-bold mb-6">Настройки аккаунта</h2>
            
            {/* Change Email */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 text-lg">Изменить Email</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const newEmail = formData.get('new_email');
                const password = formData.get('current_password_email');
                
                try {
                  const token = localStorage.getItem('token');
                  await axios.post(
                    `${process.env.REACT_APP_BACKEND_URL}/api/users/change-email`,
                    { new_email: newEmail, current_password: password },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  
                  // Update local storage
                  const updatedUser = { ...user, email: newEmail };
                  localStorage.setItem('user', JSON.stringify(updatedUser));
                  
                  toast.success('Email успешно изменен!');
                  e.target.reset();
                } catch (error) {
                  toast.error(error.response?.data?.detail || 'Ошибка изменения email');
                }
              }} className="space-y-4">
                <div>
                  <Label htmlFor="current_email">Текущий Email</Label>
                  <Input
                    id="current_email"
                    type="email"
                    value={user?.email}
                    disabled
                    className="mt-1 bg-gray-50"
                  />
                </div>
                
                <div>
                  <Label htmlFor="new_email">Новый Email *</Label>
                  <Input
                    id="new_email"
                    name="new_email"
                    type="email"
                    required
                    placeholder="newemail@example.com"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="current_password_email">Текущий пароль (для подтверждения) *</Label>
                  <Input
                    id="current_password_email"
                    name="current_password_email"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="mt-1"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Изменить Email
                </Button>
              </form>
            </Card>

            {/* Change Password */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 text-lg">Изменить пароль</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const currentPassword = formData.get('current_password');
                const newPassword = formData.get('new_password');
                const confirmPassword = formData.get('confirm_password');
                
                if (newPassword !== confirmPassword) {
                  toast.error('Новые пароли не совпадают');
                  return;
                }
                
                if (newPassword.length < 6) {
                  toast.error('Пароль должен быть минимум 6 символов');
                  return;
                }
                
                try {
                  const token = localStorage.getItem('token');
                  await axios.post(
                    `${process.env.REACT_APP_BACKEND_URL}/api/users/change-password`,
                    { 
                      current_password: currentPassword, 
                      new_password: newPassword 
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  
                  toast.success('Пароль успешно изменен!');
                  e.target.reset();
                } catch (error) {
                  toast.error(error.response?.data?.detail || 'Ошибка изменения пароля');
                }
              }} className="space-y-4">
                <div>
                  <Label htmlFor="current_password">Текущий пароль *</Label>
                  <Input
                    id="current_password"
                    name="current_password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="new_password">Новый пароль *</Label>
                  <Input
                    id="new_password"
                    name="new_password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">Минимум 6 символов</p>
                </div>

                <div>
                  <Label htmlFor="confirm_password">Подтвердите новый пароль *</Label>
                  <Input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="mt-1"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Изменить пароль
                </Button>
              </form>
            </Card>

            {/* Delete Account */}
            <Card className="p-6 border-red-200">
              <h3 className="font-semibold mb-2 text-red-600 text-lg">Удалить аккаунт</h3>
              <p className="text-sm text-gray-600 mb-4">
                Это действие необратимо. Все ваши данные, заказы и история покупок будут удалены навсегда.
              </p>
              <Button variant="destructive" onClick={() => {
                if (window.confirm('Вы уверены, что хотите удалить аккаунт? Это действие нельзя отменить!')) {
                  toast.error('Функция удаления аккаунта будет доступна скоро');
                }
              }}>
                Удалить аккаунт
              </Button>
            </Card>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-8">
            {/* Products awaiting review */}
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Star className="w-6 h-6 text-amber-500" />
                Товари для відгуку
              </h2>
              
              {loadingReviews ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : reviewableProducts.length === 0 ? (
                <Card className="p-8 text-center">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-600">Немає товарів для відгуку</p>
                  <p className="text-sm text-gray-400 mt-1">Зробіть замовлення, щоб залишити відгук</p>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {reviewableProducts.map((product) => (
                    <Card key={product.product_id} className="p-4 hover:shadow-lg transition-shadow">
                      <div className="flex gap-4">
                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {product.image ? (
                            <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Package className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm line-clamp-2">{product.title}</h3>
                          <p className="text-green-600 font-bold mt-1">{product.price} грн</p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => openReviewModal(product)}
                        className="w-full mt-4 bg-amber-500 hover:bg-amber-600"
                      >
                        <Star className="w-4 h-4 mr-2" />
                        Написати відгук
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* My reviews */}
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-blue-500" />
                Мої відгуки ({myReviews.length})
              </h2>
              
              {myReviews.length === 0 ? (
                <Card className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-600">Ви ще не залишили жодного відгуку</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {myReviews.map((review) => (
                    <Card key={review.id} className="p-5 hover:shadow-lg transition-shadow">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {review.product_image ? (
                            <img src={review.product_image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{review.product_title || 'Товар'}</h3>
                          <div className="flex items-center gap-1 mt-1">
                            {[1,2,3,4,5].map((star) => (
                              <Star 
                                key={star} 
                                className={`w-4 h-4 ${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} 
                              />
                            ))}
                            <span className="text-sm text-gray-500 ml-2">
                              {new Date(review.created_at).toLocaleDateString('uk-UA')}
                            </span>
                          </div>
                          {review.comment && (
                            <p className="text-gray-600 mt-2 text-sm">{review.comment}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Review Modal */}
        {showReviewModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg p-6">
              <h3 className="text-xl font-bold mb-4">Написати відгук</h3>
              <p className="text-gray-600 mb-4">{reviewForm.product_title}</p>
              
              {/* Star rating */}
              <div className="mb-4">
                <Label className="mb-2 block">Ваша оцінка</Label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({...reviewForm, rating: star})}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star 
                        className={`w-8 h-8 ${star <= reviewForm.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-200'}`} 
                      />
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Comment */}
              <div className="mb-6">
                <Label htmlFor="comment" className="mb-2 block">Ваш відгук (необов'язково)</Label>
                <textarea
                  id="comment"
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                  placeholder="Поділіться враженнями про товар..."
                  className="w-full border rounded-lg p-3 min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1"
                >
                  Скасувати
                </Button>
                <Button 
                  onClick={submitReview}
                  className="flex-1 bg-amber-500 hover:bg-amber-600"
                >
                  Відправити відгук
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
