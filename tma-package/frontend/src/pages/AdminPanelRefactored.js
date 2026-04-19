import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI, categoriesAPI } from '../utils/api';
import { Button } from '../components/ui/button';
import { 
  BarChart3, Package, ShoppingBag, ClipboardList, Users, Wallet,
  TrendingUp, Monitor, Briefcase, Gift, RotateCcw, Shield,
  Activity, AlertTriangle, Target, FlaskConical, Settings,
  Headphones, Sliders, Star, Menu, X, ChevronRight, LogOut
} from 'lucide-react';

// Lazy load all admin components for code splitting
const ProductManagement = lazy(() => import('../components/admin/ProductManagement'));
const CategoryManagement = lazy(() => import('../components/admin/CategoryManagement'));
const PayoutsDashboard = lazy(() => import('../components/admin/PayoutsDashboard'));
const OrdersAnalytics = lazy(() => import('../components/admin/OrdersAnalytics'));
const AdvancedAnalytics = lazy(() => import('../components/admin/AdvancedAnalytics'));
const SlidesManagement = lazy(() => import('../components/admin/SlidesManagement'));
const CRMDashboard = lazy(() => import('../components/admin/CRMDashboard'));
const PromotionsManagement = lazy(() => import('../components/admin/PromotionsManagement'));
const PopularCategoriesManagement = lazy(() => import('../components/admin/PopularCategoriesManagement'));
const CustomSectionsManagement = lazy(() => import('../components/admin/CustomSectionsManagement'));
const ReviewsManagement = lazy(() => import('../components/admin/ReviewsManagement'));
const ReturnsDashboard = lazy(() => import('../components/admin/ReturnsDashboard'));
const PolicyDashboard = lazy(() => import('../components/admin/PolicyDashboard'));
const PaymentHealthDashboard = lazy(() => import('../components/admin/PaymentHealthDashboard'));
const RiskCenter = lazy(() => import('../components/admin/RiskCenter'));
const RevenueControl = lazy(() => import('../components/admin/RevenueControl'));
const ABTests = lazy(() => import('../components/admin/ABTests'));
const SiteSettingsManagement = lazy(() => import('../components/admin/SiteSettingsManagement'));
const SupportDashboard = lazy(() => import('../components/admin/SupportDashboard'));
const AttributesLibrary = lazy(() => import('../components/admin/AttributesLibrary'));

// 7 модулей с sub-tabs (22 таба → 7 модулей)
const ADMIN_MODULES = [
  {
    key: 'dashboard',
    title: 'Дашборд',
    icon: BarChart3,
    color: 'from-blue-600 to-purple-600',
    roles: ['admin', 'manager', 'support'],
    subtabs: [
      { key: 'advanced', title: 'Розширена', icon: TrendingUp, component: AdvancedAnalytics },
    ]
  },
  {
    key: 'catalog',
    title: 'Каталог',
    icon: Package,
    color: 'from-green-600 to-emerald-600',
    roles: ['admin', 'manager'],
    subtabs: [
      { key: 'categories', title: 'Категорії', icon: Package, component: CategoryManagement },
      { key: 'products', title: 'Товари', icon: ShoppingBag, component: ProductManagement },
      { key: 'popular', title: 'Популярні', icon: Star, component: PopularCategoriesManagement },
      { key: 'attributes', title: 'Фільтри', icon: Sliders, component: AttributesLibrary },
    ]
  },
  {
    key: 'orders',
    title: 'Замовлення',
    icon: ClipboardList,
    color: 'from-orange-600 to-red-600',
    roles: ['admin', 'manager'],
    subtabs: [
      { key: 'list', title: 'Замовлення', icon: ClipboardList, component: OrdersAnalytics },
      { key: 'returns', title: 'Повернення', icon: RotateCcw, component: ReturnsDashboard },
      { key: 'policy', title: 'Політики', icon: Shield, component: PolicyDashboard },
      { key: 'payouts', title: 'Виплати', icon: Wallet, component: PayoutsDashboard },
    ]
  },
  {
    key: 'crm',
    title: 'CRM',
    icon: Users,
    color: 'from-indigo-600 to-blue-600',
    roles: ['admin', 'manager', 'support'],
    subtabs: [
      { key: 'customers', title: 'Клієнти', icon: Users, component: null }, // inline users table
      { key: 'crm', title: 'CRM', icon: Briefcase, component: CRMDashboard },
      { key: 'support', title: 'Підтримка', icon: Headphones, component: SupportDashboard },
      { key: 'reviews', title: 'Відгуки', icon: Star, component: ReviewsManagement },
    ]
  },
  {
    key: 'marketing',
    title: 'Маркетинг',
    icon: Gift,
    color: 'from-pink-600 to-rose-600',
    roles: ['admin', 'manager'],
    subtabs: [
      { key: 'slides', title: 'Слайдер', icon: Monitor, component: SlidesManagement },
      { key: 'promotions', title: 'Акції', icon: Gift, component: PromotionsManagement },
      { key: 'sections', title: 'Секції', icon: TrendingUp, component: CustomSectionsManagement },
    ]
  },
  {
    key: 'finance',
    title: 'Фінанси',
    icon: Activity,
    color: 'from-emerald-600 to-teal-600',
    roles: ['admin'],
    advanced: true,
    subtabs: [
      { key: 'payment-health', title: 'Платежі', icon: Activity, component: PaymentHealthDashboard },
      { key: 'risk', title: 'Ризики', icon: AlertTriangle, component: RiskCenter },
      { key: 'revenue', title: 'Дохід', icon: Target, component: RevenueControl },
      { key: 'ab-tests', title: 'A/B Тести', icon: FlaskConical, component: ABTests },
    ]
  },
  {
    key: 'settings',
    title: 'Налаштування',
    icon: Settings,
    color: 'from-slate-600 to-gray-600',
    roles: ['admin'],
    subtabs: [
      { key: 'site', title: 'Сайт', icon: Settings, component: SiteSettingsManagement },
    ]
  },
];

// Loading spinner
const LoadingState = ({ message = 'Завантаження...' }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
    <p className="text-gray-500">{message}</p>
  </div>
);

// Users table (inline component)
const UsersTable = ({ users }) => (
  <div className="bg-white rounded-2xl p-6 border border-gray-200">
    <h2 className="text-2xl font-bold mb-6">Список користувачів</h2>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4">Email</th>
            <th className="text-left py-3 px-4">Ім'я</th>
            <th className="text-left py-3 px-4">Роль</th>
            <th className="text-left py-3 px-4">Дата реєстрації</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b hover:bg-gray-50">
              <td className="py-3 px-4">{user.email}</td>
              <td className="py-3 px-4">{user.full_name}</td>
              <td className="py-3 px-4">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  user.role === 'admin' ? 'bg-red-100 text-red-600' :
                  user.role === 'seller' ? 'bg-blue-100 text-blue-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {user.role}
                </span>
              </td>
              <td className="py-3 px-4 text-gray-600">
                {new Date(user.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const AdminPanel = () => {
  const { user, isAdmin, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [users, setUsers] = useState([]);
  
  // Get current module and tab from URL
  const currentModuleKey = searchParams.get('module') || 'dashboard';
  const currentTabKey = searchParams.get('tab');
  
  // Get current module
  const currentModule = ADMIN_MODULES.find(m => m.key === currentModuleKey) || ADMIN_MODULES[0];
  
  // Get current subtab
  const currentSubtab = currentModule?.subtabs?.find(t => t.key === currentTabKey) || currentModule?.subtabs?.[0];

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await adminAPI.getUsers();
        setUsers(res.data || []);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const navigateToModule = (moduleKey, tabKey = null) => {
    const module = ADMIN_MODULES.find(m => m.key === moduleKey);
    const tab = tabKey || module?.subtabs?.[0]?.key;
    setSearchParams({ module: moduleKey, tab });
    setMobileMenuOpen(false);
  };

  const navigateToTab = (tabKey) => {
    setSearchParams({ module: currentModuleKey, tab: tabKey });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingState message="Перевірка доступу..." />
      </div>
    );
  }

  if (!isAdmin) return null;

  // Filter modules by user role
  const availableModules = ADMIN_MODULES.filter(m => m.roles.includes(user?.role || 'admin'));

  return (
    <div data-testid="admin-panel" className="fixed inset-0 bg-gray-50 overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between">
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <h1 className="font-bold text-lg">Адмін Панель</h1>
        <div className="w-10" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 bottom-0 z-40
        bg-white border-r border-gray-200
        transition-all duration-300
        ${sidebarOpen ? 'w-64' : 'w-20'}
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          {sidebarOpen && (
            <h1 className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Y-Store Admin
            </h1>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:block p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight className={`w-5 h-5 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Modules Navigation */}
        <nav className="p-3 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {availableModules.map((module) => {
            const Icon = module.icon;
            const isActive = currentModuleKey === module.key;
            
            return (
              <button
                key={module.key}
                onClick={() => navigateToModule(module.key)}
                data-testid={`module-${module.key}`}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                  transition-all duration-200
                  ${isActive 
                    ? `bg-gradient-to-r ${module.color} text-white shadow-lg` 
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                  ${!sidebarOpen ? 'justify-center' : ''}
                `}
                title={!sidebarOpen ? module.title : undefined}
              >
                <Icon className={`w-5 h-5 ${!sidebarOpen ? 'mx-auto' : ''}`} />
                {sidebarOpen && <span className="font-medium">{module.title}</span>}
                {module.advanced && sidebarOpen && (
                  <span className="ml-auto text-xs px-1.5 py-0.5 bg-white/20 rounded">PRO</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t bg-white">
          {sidebarOpen ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                  {user?.full_name?.[0] || 'A'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user?.full_name || 'Admin'}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button onClick={logout} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500" title="Вийти">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={logout} className="w-full p-2 hover:bg-gray-100 rounded-lg text-gray-500 flex justify-center" title="Вийти">
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={`
        fixed top-0 right-0 bottom-0 overflow-y-auto
        transition-all duration-300
        pt-0 lg:pt-0
        ${sidebarOpen ? 'lg:left-64' : 'lg:left-20'}
        left-0
      `}>
        {/* Module Header + SubTabs */}
        {currentModule && (
          <div className="bg-white border-b sticky top-0 z-30">
            <div className="px-6 py-4">
              <h1 className="text-2xl font-bold text-gray-900">{currentModule.title}</h1>
            </div>
            
            {/* SubTabs */}
            {currentModule.subtabs && currentModule.subtabs.length > 1 && (
              <div className="px-6 pb-0 overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                  {currentModule.subtabs.map((subtab) => {
                    const TabIcon = subtab.icon;
                    const isActive = currentSubtab?.key === subtab.key;
                    
                    return (
                      <button
                        key={subtab.key}
                        onClick={() => navigateToTab(subtab.key)}
                        data-testid={`subtab-${subtab.key}`}
                        className={`
                          flex items-center gap-2 px-4 py-3 text-sm font-medium
                          border-b-2 transition-colors
                          ${isActive 
                            ? 'border-blue-600 text-blue-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }
                        `}
                      >
                        <TabIcon className="w-4 h-4" />
                        {subtab.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content Area */}
        <div className="p-6">
          <Suspense fallback={<LoadingState message="Завантаження модуля..." />}>
            {/* CRM Customers tab - inline users table */}
            {currentModuleKey === 'crm' && currentSubtab?.key === 'customers' ? (
              <UsersTable users={users} />
            ) : currentSubtab?.component ? (
              <currentSubtab.component />
            ) : (
              <LoadingState message="Компонент не знайдено" />
            )}
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
