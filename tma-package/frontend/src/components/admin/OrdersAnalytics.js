import React, { useState, useEffect } from 'react';
import { Package, User, DollarSign, Calendar, Filter, Download } from 'lucide-react';
import axios from 'axios';
import { Button } from '../ui/button';

const OrdersAnalytics = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, today, week, month
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchOrders();
    fetchCategories();
  }, [filter, categoryFilter]);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/categories`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      // Fetch all orders
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/orders`,
        config
      );

      let filteredOrders = response.data;

      // Apply time filter
      if (filter !== 'all') {
        const now = new Date();
        const filterDate = new Date();
        
        if (filter === 'today') {
          filterDate.setHours(0, 0, 0, 0);
        } else if (filter === 'week') {
          filterDate.setDate(now.getDate() - 7);
        } else if (filter === 'month') {
          filterDate.setMonth(now.getMonth() - 1);
        }

        filteredOrders = filteredOrders.filter(order => 
          new Date(order.created_at) >= filterDate
        );
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order =>
          order.items.some(item => item.category_name === categoryFilter)
        );
      }

      setOrders(filteredOrders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Дата', 'Покупатель', 'Email', 'Товары', 'Количество', 'Цена', 'Сумма'];
    const rows = orders.flatMap(order =>
      order.items.map(item => [
        new Date(order.created_at).toLocaleDateString('ru-RU'),
        order.customer_name || 'N/A',
        order.customer_email || 'N/A',
        item.product_name,
        item.quantity,
        `$${item.price.toFixed(2)}`,
        `$${(item.price * item.quantity).toFixed(2)}`
      ])
    );

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Calculate statistics
  const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
  const totalOrders = orders.length;
  const totalItems = orders.reduce((sum, order) => 
    sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
  );
  const uniqueCustomers = new Set(orders.map(order => order.user_id)).size;

  // Category statistics
  const categoryStats = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      const category = item.category_name || 'Без категории';
      if (!categoryStats[category]) {
        categoryStats[category] = {
          count: 0,
          quantity: 0,
          revenue: 0
        };
      }
      categoryStats[category].count += 1;
      categoryStats[category].quantity += item.quantity;
      categoryStats[category].revenue += item.price * item.quantity;
    });
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Детальна статистика замовлень</h2>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Експорт CSV
          </Button>
        </div>

        <div className="flex gap-4 flex-wrap">
          {/* Time Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Весь час</option>
              <option value="today">Сьогодні</option>
              <option value="week">Останній тиждень</option>
              <option value="month">Останній місяць</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Усі категорії</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Виручка</p>
              <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Замовлень</p>
              <p className="text-2xl font-bold">{totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Товарів продано</p>
              <p className="text-2xl font-bold">{totalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Покупців</p>
              <p className="text-2xl font-bold">{uniqueCustomers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Statistics */}
      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold">Статистика за категоріями</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Категорія</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Замовлень</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Кількість</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Виручка</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(categoryStats)
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([category, stats]) => (
                  <tr key={category} className="hover:bg-gray-50">
                    <td className="py-4 px-6 font-medium">{category}</td>
                    <td className="py-4 px-6 text-right">{stats.count}</td>
                    <td className="py-4 px-6 text-right">{stats.quantity}</td>
                    <td className="py-4 px-6 text-right font-bold text-green-600">
                      ${stats.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold">Детальна інформація про замовлення</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Дата</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Покупець</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Товари</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Кількість</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Сума</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {new Date(order.created_at).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <div className="font-medium text-gray-900">{order.customer_name || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{order.customer_email}</div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="text-sm">
                          <span className="font-medium">{item.product_name}</span>
                          <span className="text-gray-500"> x{item.quantity}</span>
                          <span className="text-gray-400"> (${item.price})</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right font-medium">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </td>
                  <td className="py-4 px-6 text-right font-bold text-green-600">
                    ${order.total_amount.toFixed(2)}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      order.status === 'completed' ? 'bg-green-100 text-green-700' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrdersAnalytics;
