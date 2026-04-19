/**
 * Account - Unified User Cabinet
 * All sections (Orders, Profile, Addresses, Settings) in one page with tabs
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';
import { 
  User, Package, Heart, MapPin, Settings, LogOut, ChevronRight,
  ShoppingBag, Phone, Mail, Save, Loader2, Clock, Truck, CheckCircle,
  XCircle, RefreshCw, ArrowLeft, Edit2, Plus, Trash2, Bell, Globe
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Order status badge
const OrderStatusBadge = ({ status }) => {
  const config = {
    pending: { label: 'Очікує', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    processing: { label: 'В обробці', color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
    shipped: { label: 'Відправлено', color: 'bg-purple-100 text-purple-800', icon: Truck },
    delivered: { label: 'Доставлено', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    cancelled: { label: 'Скасовано', color: 'bg-red-100 text-red-800', icon: XCircle },
  }[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: Package };
  
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  );
};

const Account = () => {
  const { user, logout, isAuthenticated, token } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ orders: 0, wishlist: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Profile form
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    telegram: '',
    viber: ''
  });
  
  // Delivery address
  const [delivery, setDelivery] = useState({
    city: '',
    np_department: '',
    address: '',
    postal_code: ''
  });
  
  // Settings
  const [settings, setSettings] = useState({
    notifications_email: true,
    notifications_sms: false,
    language: 'uk'
  });

  const T = {
    uk: {
      title: 'Особистий кабінет',
      welcome: 'Вітаємо',
      orders: 'Мої замовлення',
      profile: 'Особисті дані',
      addresses: 'Адреси доставки',
      settings: 'Налаштування',
      logout: 'Вийти',
      orderCount: 'замовлень',
      inWishlist: 'в обраному',
      noOrders: 'У вас поки немає замовлень',
      startShopping: 'Почніть покупки',
      goToCatalog: 'Перейти до каталогу',
      orderNumber: 'Замовлення',
      orderDate: 'від',
      orderTotal: 'Сума',
      items: 'товар(ів)',
      save: 'Зберегти',
      saving: 'Збереження...',
      saved: 'Збережено!',
      fullName: "Повне ім'я",
      email: 'Email',
      phone: 'Телефон',
      telegram: 'Telegram (для зв\'язку)',
      viber: 'Viber',
      city: 'Місто',
      npDepartment: 'Відділення Нової Пошти',
      address: 'Адреса',
      postalCode: 'Поштовий індекс',
      notificationsEmail: 'Email сповіщення',
      notificationsSms: 'SMS сповіщення',
      languageSetting: 'Мова інтерфейсу',
      back: 'Назад до кабінету'
    },
    ru: {
      title: 'Личный кабинет',
      welcome: 'Добро пожаловать',
      orders: 'Мои заказы',
      profile: 'Личные данные',
      addresses: 'Адреса доставки',
      settings: 'Настройки',
      logout: 'Выйти',
      orderCount: 'заказов',
      inWishlist: 'в избранном',
      noOrders: 'У вас пока нет заказов',
      startShopping: 'Начните покупки',
      goToCatalog: 'Перейти в каталог',
      orderNumber: 'Заказ',
      orderDate: 'от',
      orderTotal: 'Сумма',
      items: 'товар(ов)',
      save: 'Сохранить',
      saving: 'Сохранение...',
      saved: 'Сохранено!',
      fullName: 'Полное имя',
      email: 'Email',
      phone: 'Телефон',
      telegram: 'Telegram (для связи)',
      viber: 'Viber',
      city: 'Город',
      npDepartment: 'Отделение Новой Почты',
      address: 'Адрес',
      postalCode: 'Почтовый индекс',
      notificationsEmail: 'Email уведомления',
      notificationsSms: 'SMS уведомления',
      languageSetting: 'Язык интерфейса',
      back: 'Назад в кабинет'
    }
  };
  const txt = T[language] || T.uk;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (user) {
      setProfile({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        telegram: user.telegram || '',
        viber: user.viber || ''
      });
      setDelivery({
        city: user.city || '',
        np_department: user.np_department || '',
        address: user.address || '',
        postal_code: user.postal_code || ''
      });
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, wishlistRes] = await Promise.all([
        axios.get(`${API_URL}/api/v2/cabinet/orders`, { withCredentials: true }).catch(() => ({ data: { orders: [], total: 0 }})),
        axios.get(`${API_URL}/api/v2/cabinet/wishlist`, { withCredentials: true }).catch(() => ({ data: { items: [] }}))
      ]);
      setOrders(ordersRes.data.orders || []);
      setStats({
        orders: ordersRes.data.total || ordersRes.data.orders?.length || 0,
        wishlist: wishlistRes.data.items?.length || 0
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await axios.patch(`${API_URL}/api/v2/users/me`, {
        ...profile,
        ...delivery
      }, { withCredentials: true });
      toast.success(txt.saved);
    } catch (error) {
      toast.error('Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!isAuthenticated) return null;

  const tabs = [
    { id: 'orders', label: txt.orders, icon: ShoppingBag },
    { id: 'profile', label: txt.profile, icon: User },
    { id: 'addresses', label: txt.addresses, icon: MapPin },
    { id: 'settings', label: txt.settings, icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-8" data-testid="account-page">
      <div className="container-main px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            {txt.title}
          </h1>
          <p className="text-gray-600 mt-1">{txt.welcome}, <span className="font-semibold">{user?.full_name || user?.email}</span> 👋</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="p-5 bg-white/80 backdrop-blur border-0 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-black text-gray-900">{stats.orders}</p>
                <p className="text-gray-500 text-sm">{txt.orderCount}</p>
              </div>
            </div>
          </Card>
          <Link to="/favorites">
            <Card className="p-5 bg-white/80 backdrop-blur border-0 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-pink-500" />
                </div>
                <div>
                  <p className="text-3xl font-black text-gray-900">{stats.wishlist}</p>
                  <p className="text-gray-500 text-sm">{txt.inWishlist}</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50 shadow'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div data-testid="orders-section">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">{txt.orders}</h2>
                <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg">
                  <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">{txt.noOrders}</p>
                  <Link to="/catalog">
                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                      {txt.goToCatalog}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Card 
                      key={order.id} 
                      className="p-4 hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
                      onClick={() => navigate(`/account/orders/${order.id}`)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {txt.orderNumber} #{order.order_number}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {txt.orderDate} {new Date(order.created_at).toLocaleDateString('uk-UA')}
                          </p>
                        </div>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="text-sm text-gray-500">
                          {order.items?.length || 0} {txt.items}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">
                            {order.total_amount?.toLocaleString()} ₴
                          </span>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div data-testid="profile-section">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{txt.profile}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>{txt.fullName}</Label>
                  <Input
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder={txt.fullName}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{txt.email}</Label>
                  <Input
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="email@example.com"
                    type="email"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{txt.phone}</Label>
                  <Input
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+380"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{txt.telegram}</Label>
                  <Input
                    value={profile.telegram}
                    onChange={(e) => setProfile({ ...profile, telegram: e.target.value })}
                    placeholder="@username"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{txt.viber}</Label>
                  <Input
                    value={profile.viber}
                    onChange={(e) => setProfile({ ...profile, viber: e.target.value })}
                    placeholder="+380"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="mt-6">
                <Button 
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {txt.saving}</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> {txt.save}</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Addresses Tab */}
          {activeTab === 'addresses' && (
            <div data-testid="addresses-section">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{txt.addresses}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>{txt.city}</Label>
                  <Input
                    value={delivery.city}
                    onChange={(e) => setDelivery({ ...delivery, city: e.target.value })}
                    placeholder="Київ"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{txt.npDepartment}</Label>
                  <Input
                    value={delivery.np_department}
                    onChange={(e) => setDelivery({ ...delivery, np_department: e.target.value })}
                    placeholder="Відділення №1"
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>{txt.address}</Label>
                  <Input
                    value={delivery.address}
                    onChange={(e) => setDelivery({ ...delivery, address: e.target.value })}
                    placeholder="вул. Хрещатик, 1"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{txt.postalCode}</Label>
                  <Input
                    value={delivery.postal_code}
                    onChange={(e) => setDelivery({ ...delivery, postal_code: e.target.value })}
                    placeholder="01001"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="mt-6">
                <Button 
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {txt.saving}</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> {txt.save}</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div data-testid="settings-section">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{txt.settings}</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">{txt.notificationsEmail}</p>
                      <p className="text-sm text-gray-500">Отримувати сповіщення на email</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications_email}
                      onChange={(e) => setSettings({ ...settings, notifications_email: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">{txt.notificationsSms}</p>
                      <p className="text-sm text-gray-500">Отримувати SMS сповіщення</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications_sms}
                      onChange={(e) => setSettings({ ...settings, notifications_sms: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">{txt.languageSetting}</p>
                      <p className="text-sm text-gray-500">Українська / Русский</p>
                    </div>
                  </div>
                  <select
                    value={settings.language}
                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg bg-white"
                  >
                    <option value="uk">Українська</option>
                    <option value="ru">Русский</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6">
                <Button 
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {txt.saving}</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> {txt.save}</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="mt-6">
          <Button 
            onClick={handleLogout}
            variant="outline"
            className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            {txt.logout}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Account;
