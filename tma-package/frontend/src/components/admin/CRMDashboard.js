import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { 
  Users, TrendingUp, ShoppingBag, AlertCircle, 
  CheckCircle, Clock, UserCheck, UserX, Star,
  Phone, Mail, MessageSquare, Calendar, Plus
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const CRMDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [leads, setLeads] = useState([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    customer_id: '',
    assigned_to: '',
    due_date: '',
    priority: 'medium',
    type: 'follow_up'
  });
  
  const [noteForm, setNoteForm] = useState({
    customer_id: '',
    note: '',
    type: 'general'
  });
  
  const [leadForm, setLeadForm] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'website',
    interest: '',
    notes: ''
  });

  useEffect(() => {
    fetchDashboardData();
    fetchCustomers();
    fetchTasks();
    fetchLeads();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/crm/dashboard`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/crm/customers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/crm/tasks`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const fetchLeads = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/crm/leads`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLeads(response.data);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/crm/tasks`,
        { ...taskForm, assigned_to: user.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Завдання створено!');
      setShowTaskModal(false);
      setTaskForm({
        title: '',
        description: '',
        customer_id: '',
        assigned_to: '',
        due_date: '',
        priority: 'medium',
        type: 'follow_up'
      });
      fetchTasks();
    } catch (error) {
      toast.error('Помилка створення завдання');
    }
  };

  const handleAddNote = async (customer_id) => {
    if (!noteForm.note) {
      toast.error('Введіть текст нотатки');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/crm/notes`,
        { ...noteForm, customer_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Нотатку додано!');
      setNoteForm({ customer_id: '', note: '', type: 'general' });
      
      // Refresh customer profile if viewing one
      if (selectedCustomer?.id === customer_id) {
        const profile = await fetchCustomerProfile(customer_id);
        setSelectedCustomer(profile);
      }
    } catch (error) {
      toast.error('Помилка додавання нотатки');
    }
  };

  const fetchCustomerProfile = async (customer_id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/crm/customer/${customer_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch customer profile:', error);
      return null;
    }
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/crm/leads`,
        leadForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Лід створено!');
      setShowLeadModal(false);
      setLeadForm({
        name: '',
        email: '',
        phone: '',
        source: 'website',
        interest: '',
        notes: ''
      });
      fetchLeads();
    } catch (error) {
      toast.error('Помилка створення ліду');
    }
  };

  const getSegmentColor = (segment) => {
    const colors = {
      'VIP': 'bg-purple-100 text-purple-800',
      'Active': 'bg-green-100 text-green-800',
      'Regular': 'bg-blue-100 text-blue-800',
      'At Risk': 'bg-orange-100 text-orange-800',
      'Inactive': 'bg-red-100 text-red-800',
      'New': 'bg-gray-100 text-gray-800'
    };
    return colors[segment] || 'bg-gray-100 text-gray-800';
  };

  const getLeadStatusColor = (status) => {
    const colors = {
      'new': 'bg-blue-100 text-blue-800',
      'contacted': 'bg-yellow-100 text-yellow-800',
      'qualified': 'bg-green-100 text-green-800',
      'converted': 'bg-purple-100 text-purple-800',
      'lost': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">CRM Система</h2>
          <p className="text-gray-600 mt-1">Управління клієнтами та продажами</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowLeadModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Додати лід
          </Button>
          <Button onClick={() => setShowTaskModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Створити завдання
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4 overflow-x-auto">
          {[
            { id: 'overview', label: '📊 Огляд', icon: TrendingUp },
            { id: 'customers', label: '👥 Клієнти', icon: Users },
            { id: 'leads', label: '🎯 Ліди', icon: UserCheck },
            { id: 'tasks', label: '✅ Завдання', icon: CheckCircle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-4 font-semibold transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && dashboardData && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <Card className="p-4 md:p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-sm opacity-90">Всього клієнтів</p>
              <p className="text-4xl font-bold">{dashboardData.sales_funnel?.total_users || 0}</p>
              <p className="text-xs opacity-75 mt-2">
                +{dashboardData.new_customers_week} за тиждень
              </p>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
              <div className="flex items-center justify-between mb-4">
                <ShoppingBag className="w-8 h-8 opacity-80" />
                <CheckCircle className="w-5 h-5" />
              </div>
              <p className="text-sm opacity-90">Покупців</p>
              <p className="text-4xl font-bold">{dashboardData.sales_funnel?.users_with_orders || 0}</p>
              <p className="text-xs opacity-75 mt-2">
                Конверсія: {dashboardData.sales_funnel?.overall_conversion?.toFixed(1) || 0}%
              </p>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <div className="flex items-center justify-between mb-4">
                <Clock className="w-8 h-8 opacity-80" />
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-sm opacity-90">Завдань</p>
              <p className="text-4xl font-bold">{dashboardData.pending_tasks}</p>
              <p className="text-xs opacity-75 mt-2">
                {dashboardData.overdue_tasks} прострочених
              </p>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <div className="flex items-center justify-between mb-4">
                <Star className="w-8 h-8 opacity-80" />
                <UserCheck className="w-5 h-5" />
              </div>
              <p className="text-sm opacity-90">Повторні покупки</p>
              <p className="text-4xl font-bold">{dashboardData.sales_funnel?.repeat_customers || 0}</p>
              <p className="text-xs opacity-75 mt-2">
                {dashboardData.sales_funnel?.repeat_rate?.toFixed(1) || 0}% утримання
              </p>
            </Card>
          </div>

          {/* Customer Segments */}
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Сегменти клієнтів</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {dashboardData.customer_segments && Object.entries(dashboardData.customer_segments).map(([segment, count]) => (
                <div key={segment} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium">{segment}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${getSegmentColor(segment)}`}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Активність за 30 днів</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{dashboardData.customer_activity?.new_customers || 0}</p>
                <p className="text-sm text-gray-600 mt-1">Нові клієнти</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{dashboardData.customer_activity?.active_customers || 0}</p>
                <p className="text-sm text-gray-600 mt-1">Активні клієнти</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">{dashboardData.customer_activity?.returning_customers || 0}</p>
                <p className="text-sm text-gray-600 mt-1">Повернулись</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-semibold text-gray-700">Клієнт</th>
                    <th className="text-left py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-semibold text-gray-700">Сегмент</th>
                    <th className="text-right py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-semibold text-gray-700">Замовлень</th>
                    <th className="text-right py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-semibold text-gray-700">Витрачено</th>
                    <th className="text-right py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-semibold text-gray-700">Сер. чек</th>
                    <th className="text-left py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-semibold text-gray-700">Останнє</th>
                    <th className="text-center py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-semibold text-gray-700">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="py-3 md:py-4 px-4 md:px-6">
                        <div>
                          <div className="font-medium text-sm md:text-base">{customer.full_name || customer.email}</div>
                          <div className="text-xs md:text-sm text-gray-500 truncate max-w-[150px] md:max-w-none">{customer.email}</div>
                          {customer.phone && (
                            <div className="text-xs md:text-sm text-gray-500">{customer.phone}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSegmentColor(customer.segment)}`}>
                          {customer.segment}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-medium">
                        {customer.total_orders}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-green-600">
                        ${customer.total_spent?.toFixed(2) || '0.00'}
                      </td>
                      <td className="py-4 px-6 text-right text-blue-600">
                        ${customer.avg_order_value?.toFixed(2) || '0.00'}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {customer.last_order_date 
                          ? new Date(customer.last_order_date).toLocaleDateString('uk-UA')
                          : 'Немає'}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const profile = await fetchCustomerProfile(customer.id);
                            setSelectedCustomer(profile);
                            setShowCustomerModal(true);
                          }}
                        >
                          Детал і
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Leads Tab */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          {/* Leads Pipeline */}
          <div className="grid grid-cols-5 gap-4">
            {[
              { status: 'new', label: 'Нові', count: leads.filter(l => l.status === 'new').length, color: 'blue' },
              { status: 'contacted', label: 'Контактовані', count: leads.filter(l => l.status === 'contacted').length, color: 'yellow' },
              { status: 'qualified', label: 'Кваліфіковані', count: leads.filter(l => l.status === 'qualified').length, color: 'green' },
              { status: 'converted', label: 'Конвертовані', count: leads.filter(l => l.status === 'converted').length, color: 'purple' },
              { status: 'lost', label: 'Втрачені', count: leads.filter(l => l.status === 'lost').length, color: 'red' }
            ].map(stage => (
              <Card key={stage.status} className={`p-4 bg-${stage.color}-50 border-${stage.color}-200`}>
                <p className="text-sm text-gray-600 mb-1">{stage.label}</p>
                <p className="text-3xl font-bold text-${stage.color}-600">{stage.count}</p>
              </Card>
            ))}
          </div>

          {/* Leads Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Ім'я</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Контакти</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Джерело</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Статус</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Дата</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="py-4 px-6 font-medium">{lead.name}</td>
                      <td className="py-4 px-6">
                        <div className="text-sm">{lead.email}</div>
                        {lead.phone && <div className="text-sm text-gray-500">{lead.phone}</div>}
                      </td>
                      <td className="py-4 px-6 text-sm">{lead.source}</td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getLeadStatusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {new Date(lead.created_at).toLocaleDateString('uk-UA')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="grid gap-4">
            {tasks.map((task) => (
              <Card key={task.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg">{task.title}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        task.status === 'completed' ? 'bg-green-100 text-green-700' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    )}
                    {task.due_date && (
                      <p className="text-sm text-gray-500">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        До: {new Date(task.due_date).toLocaleString('uk-UA')}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 md:p-4">
          <Card className="w-full h-full md:h-auto md:max-w-4xl md:w-full md:max-h-[90vh] overflow-y-auto md:rounded-2xl">
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold">{selectedCustomer.full_name || selectedCustomer.email}</h3>
                  <p className="text-gray-600">{selectedCustomer.email}</p>
                  {selectedCustomer.phone && <p className="text-gray-600">{selectedCustomer.phone}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-4 py-2 rounded-full font-semibold ${getSegmentColor(selectedCustomer.segment)}`}>
                    {selectedCustomer.segment}
                  </span>
                  <Button variant="outline" onClick={() => setShowCustomerModal(false)}>
                    Закрити
                  </Button>
                </div>
              </div>

              {/* Customer Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                <div className="p-3 md:p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Замовлень</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedCustomer.total_orders}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Витрачено</p>
                  <p className="text-2xl font-bold text-green-600">${selectedCustomer.total_spent?.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Сер. чек</p>
                  <p className="text-2xl font-bold text-purple-600">${selectedCustomer.avg_order_value?.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-600">Днів з пок.</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {selectedCustomer.days_since_last_order !== null ? selectedCustomer.days_since_last_order : '-'}
                  </p>
                </div>
              </div>

              {/* Add Note Section */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-3">Додати нотатку</h4>
                <div className="flex gap-2">
                  <select
                    value={noteForm.type}
                    onChange={(e) => setNoteForm({ ...noteForm, type: e.target.value })}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="general">Загальна</option>
                    <option value="call">Дзвінок</option>
                    <option value="email">Email</option>
                    <option value="meeting">Зустріч</option>
                    <option value="complaint">Скарга</option>
                  </select>
                  <input
                    type="text"
                    value={noteForm.note}
                    onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })}
                    placeholder="Текст нотатки..."
                    className="flex-1 px-3 py-2 border rounded-md"
                  />
                  <Button onClick={() => handleAddNote(selectedCustomer.id)}>
                    Додати
                  </Button>
                </div>
              </div>

              {/* Notes History */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3">Історія нотаток ({selectedCustomer.notes?.length || 0})</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedCustomer.notes && selectedCustomer.notes.map((note) => (
                    <div key={note.id} className="p-3 bg-gray-50 rounded border-l-4 border-blue-500">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-500">{note.author_name}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(note.created_at).toLocaleString('uk-UA')}
                        </span>
                      </div>
                      <p className="text-sm">{note.note}</p>
                      <span className="text-xs text-gray-500">{note.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Orders */}
              <div>
                <h4 className="font-semibold mb-3">Останні замовлення ({selectedCustomer.total_orders})</h4>
                <div className="space-y-2">
                  {selectedCustomer.orders && selectedCustomer.orders.map((order) => (
                    <div key={order.id} className="p-3 bg-gray-50 rounded flex justify-between items-center">
                      <div>
                        <p className="font-medium">#{order.order_number || order.id.slice(0, 8)}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleDateString('uk-UA')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">${order.total_amount}</p>
                        <p className="text-xs text-gray-500">{order.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold mb-4">Створити завдання</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Назва *</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Зателефонувати клієнту"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Опис</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  rows="3"
                  placeholder="Деталі завдання..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Пріоритет</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="low">Низький</option>
                    <option value="medium">Середній</option>
                    <option value="high">Високий</option>
                    <option value="urgent">Термінов о</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Тип</label>
                  <select
                    value={taskForm.type}
                    onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="follow_up">Слідкування</option>
                    <option value="call">Дзвінок</option>
                    <option value="email">Email</option>
                    <option value="meeting">Зустріч</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Дата виконання</label>
                <input
                  type="datetime-local"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit">Створити</Button>
                <Button type="button" variant="outline" onClick={() => setShowTaskModal(false)}>
                  Скасувати
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Lead Creation Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold mb-4">Додати новий лід</h3>
            <form onSubmit={handleCreateLead} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ім'я *</label>
                <input
                  type="text"
                  value={leadForm.name}
                  onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Телефон</label>
                  <input
                    type="tel"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Джерело</label>
                <select
                  value={leadForm.source}
                  onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="website">Вебсайт</option>
                  <option value="referral">Рекомендація</option>
                  <option value="social">Соціальні мережі</option>
                  <option value="ads">Реклама</option>
                  <option value="other">Інше</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Інтерес</label>
                <input
                  type="text"
                  value={leadForm.interest}
                  onChange={(e) => setLeadForm({ ...leadForm, interest: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Наприклад: ноутбуки, смартфони"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Нотатки</label>
                <textarea
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  rows="3"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit">Створити лід</Button>
                <Button type="button" variant="outline" onClick={() => setShowLeadModal(false)}>
                  Скасувати
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CRMDashboard;
