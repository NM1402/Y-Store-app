import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { 
  Activity, TrendingUp, TrendingDown, DollarSign, RefreshCw, 
  CheckCircle, XCircle, Clock, Percent, CreditCard, Zap,
  AlertTriangle, ShieldCheck
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import api from '../../utils/api';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6366f1', '#8b5cf6'];

const KPICard = ({ title, value, subtitle, icon: Icon, good, trend, color = 'blue' }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    yellow: 'from-yellow-500 to-yellow-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <Card className="p-4 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${good === true ? 'text-green-600' : good === false ? 'text-red-600' : 'text-gray-900'}`}>
            {value}
          </p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-gradient-to-br ${colorClasses[color]} text-white`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center mt-2 text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
          {trend >= 0 ? '+' : ''}{trend}% vs попередній період
        </div>
      )}
    </Card>
  );
};

const PaymentHealthDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(7);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/v2/admin/payments/health?range=${range}`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch payment health:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [range]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-12 text-gray-500">
        Немає даних для відображення
      </div>
    );
  }

  const pieData = [
    { name: 'Оплачено', value: data.paid, color: '#10b981' },
    { name: 'Відхилено', value: data.declined, color: '#ef4444' },
    { name: 'Прострочено', value: data.expired, color: '#f59e0b' },
    { name: 'Очікує', value: data.pending, color: '#6366f1' },
  ].filter(d => d.value > 0);

  const prepaidVsCod = [
    { name: 'Prepaid', paid: data.prepaid_paid, total: data.prepaid_orders },
    { name: 'Deposit', paid: data.deposit_converted, total: data.deposit_total },
    { name: 'COD', paid: data.paid - data.prepaid_paid - data.deposit_converted, total: data.total_payments - data.prepaid_orders - data.deposit_total },
  ].filter(d => d.total > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-7 h-7 text-blue-600" />
            Payment Health Dashboard
          </h2>
          <p className="text-gray-500 mt-1">Моніторинг платіжної системи в реальному часі</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <Button
              key={d}
              variant={range === d ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRange(d)}
              className={range === d ? 'bg-blue-600' : ''}
            >
              {d}д
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          title="Webhook Success"
          value={`${(data.webhook_success_rate * 100).toFixed(1)}%`}
          subtitle={`${data.webhook_valid}/${data.webhook_total}`}
          icon={ShieldCheck}
          good={data.webhook_success_rate >= 0.98}
          color="green"
        />
        <KPICard
          title="Recovery Rate"
          value={`${(data.recovery_rate * 100).toFixed(1)}%`}
          subtitle={`${data.retry_recovered} відновлено`}
          icon={RefreshCw}
          good={data.recovery_rate >= 0.08}
          color="blue"
        />
        <KPICard
          title="Deposit Conversion"
          value={`${(data.deposit_conversion_rate * 100).toFixed(1)}%`}
          subtitle={`${data.deposit_converted}/${data.deposit_total}`}
          icon={CreditCard}
          good={data.deposit_conversion_rate >= 0.6}
          color="purple"
        />
        <KPICard
          title="Prepaid Conversion"
          value={`${(data.prepaid_conversion_rate * 100).toFixed(1)}%`}
          subtitle={`${data.prepaid_paid}/${data.prepaid_orders}`}
          icon={Zap}
          good={data.prepaid_conversion_rate >= 0.7}
          color="green"
        />
        <KPICard
          title="Avg Payment Time"
          value={`${data.avg_payment_time_minutes.toFixed(0)} хв`}
          icon={Clock}
          good={data.avg_payment_time_minutes <= 20}
          color="yellow"
        />
        <KPICard
          title="Reconciliation"
          value={data.reconciliation_fixes}
          subtitle="виправлено"
          icon={CheckCircle}
          color="blue"
        />
      </div>

      {/* Prepaid Discount Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800">Знижки видано</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{data.discount_total_uah.toLocaleString()} ₴</p>
          <p className="text-sm text-green-600">{data.discount_orders_count} замовлень</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-800">Середня знижка</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{data.discount_avg_uah.toFixed(0)} ₴</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-purple-800">COD Loss Saved</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{data.estimated_cod_loss_saved.toLocaleString()} ₴</p>
          <p className="text-sm text-purple-600">оцінка економії</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-amber-800">ROI знижок</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">
            {data.discount_total_uah > 0 
              ? `+${((data.estimated_cod_loss_saved - data.discount_total_uah) / data.discount_total_uah * 100).toFixed(0)}%`
              : 'N/A'
            }
          </p>
          <p className="text-sm text-amber-600">чистий прибуток</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Status Pie */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Розподіл статусів</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span>{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Daily Trend */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Денна динаміка</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.daily_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="paid" stroke="#10b981" strokeWidth={2} name="Оплачено" dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} name="Всього" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} name="Виручка ₴" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Payment Mode Comparison */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold text-gray-800 mb-4">Порівняння режимів оплати</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prepaidVsCod}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="paid" fill="#10b981" name="Оплачено" />
                <Bar dataKey="total" fill="#e5e7eb" name="Всього" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card className="p-6 bg-gradient-to-r from-gray-50 to-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4">Загальна статистика за {range} днів</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-gray-900">{data.total_payments}</p>
            <p className="text-sm text-gray-500">Всього платежів</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-600">{data.paid}</p>
            <p className="text-sm text-gray-500">Оплачено</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-red-600">{data.declined}</p>
            <p className="text-sm text-gray-500">Відхилено</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-yellow-600">{data.expired}</p>
            <p className="text-sm text-gray-500">Прострочено</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-600">{data.pending}</p>
            <p className="text-sm text-gray-500">Очікує</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PaymentHealthDashboard;
