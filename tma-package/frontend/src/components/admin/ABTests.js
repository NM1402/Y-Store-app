import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { 
  FlaskConical, Play, RefreshCw, Award, TrendingUp, Users,
  CheckCircle, XCircle, Percent, DollarSign
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import api from '../../utils/api';
import { toast } from 'sonner';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const VariantCard = ({ variant, isWinner }) => {
  return (
    <Card className={`p-4 ${isWinner ? 'border-2 border-green-500 bg-green-50' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">{variant.variant}</span>
          <span className="text-sm text-gray-500">({variant.discount_pct}%)</span>
          {isWinner && <Award className="w-5 h-5 text-green-600" />}
        </div>
        <span className={`text-lg font-bold ${variant.paid_rate >= 0.7 ? 'text-green-600' : variant.paid_rate >= 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
          {(variant.paid_rate * 100).toFixed(1)}%
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-gray-500">Orders</p>
          <p className="font-semibold">{variant.orders_total}</p>
        </div>
        <div>
          <p className="text-gray-500">Paid</p>
          <p className="font-semibold text-green-600">{variant.paid_total}</p>
        </div>
        <div>
          <p className="text-gray-500">Discount Total</p>
          <p className="font-semibold">{variant.discount_total?.toLocaleString()} ₴</p>
        </div>
        <div>
          <p className="text-gray-500">Net Effect</p>
          <p className={`font-semibold ${variant.net_effect_uah >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {variant.net_effect_uah?.toLocaleString()} ₴
          </p>
        </div>
        <div>
          <p className="text-gray-500">Returns</p>
          <p className="font-semibold text-yellow-600">{(variant.return_rate * 100).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-gray-500">Avg Grand</p>
          <p className="font-semibold">{variant.avg_grand?.toLocaleString()} ₴</p>
        </div>
      </div>
    </Card>
  );
};

const ABTests = () => {
  const [experiments, setExperiments] = useState([]);
  const [selectedExp, setSelectedExp] = useState('prepaid_discount_v1');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(14);

  const fetchExperiments = async () => {
    try {
      const res = await api.get('/api/v2/admin/ab/experiments');
      setExperiments(res.data.items || []);
    } catch (error) {
      console.error('Failed to fetch experiments:', error);
    }
  };

  const fetchReport = async () => {
    if (!selectedExp) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/v2/admin/ab/report?exp_id=${selectedExp}&range_days=${range}`);
      setReport(res.data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
      toast.error('Помилка завантаження звіту');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiments();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [selectedExp, range]);

  const seedExperiment = async () => {
    try {
      await api.post('/api/v2/admin/ab/seed/prepaid-discount');
      toast.success('Експеримент створено!');
      fetchExperiments();
      setSelectedExp('prepaid_discount_v1');
    } catch (error) {
      toast.error('Помилка створення');
    }
  };

  const chartData = report?.rows?.map(r => ({
    variant: `${r.variant} (${r.discount_pct}%)`,
    paid_rate: (r.paid_rate * 100).toFixed(1),
    orders: r.orders_total,
    net_effect: r.net_effect_uah,
  })) || [];

  const pieData = report?.rows?.map((r, i) => ({
    name: `${r.variant} (${r.discount_pct}%)`,
    value: r.orders_total,
    color: COLORS[i % COLORS.length],
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-indigo-600" />
            A/B Tests
          </h2>
          <p className="text-gray-500 mt-1">Тестування знижок по когортах (A/B/C/D)</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedExp}
            onChange={(e) => setSelectedExp(e.target.value)}
            className="border rounded px-3 py-2"
          >
            {experiments.length === 0 && <option value="">Немає експериментів</option>}
            {experiments.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <select
            value={range}
            onChange={(e) => setRange(parseInt(e.target.value))}
            className="border rounded px-3 py-2"
          >
            <option value={7}>7 днів</option>
            <option value={14}>14 днів</option>
            <option value={30}>30 днів</option>
          </select>
          <Button variant="outline" onClick={fetchReport}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={seedExperiment} className="bg-indigo-600 hover:bg-indigo-700">
            <Play className="w-4 h-4 mr-1" />
            Seed Default
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : !report?.rows?.length ? (
        <Card className="p-8 text-center">
          <FlaskConical className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">Немає даних для цього експерименту.</p>
          <p className="text-sm text-gray-400">Переконайтесь що замовлення мають поле ab.exp_id</p>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-indigo-600" />
                <span className="text-sm text-indigo-700">Всього Orders</span>
              </div>
              <p className="text-2xl font-bold text-indigo-900">{report.total_orders}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700">Paid</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{report.total_paid}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-700">Winner (Paid Rate)</span>
              </div>
              <p className="text-2xl font-bold text-yellow-900">{report.winner?.by_paid_rate || '-'}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-700">Winner (Net)</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">{report.winner?.by_net_effect || '-'}</p>
            </Card>
          </div>

          {/* Variant Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {report.rows.map((v) => (
              <VariantCard 
                key={v.variant} 
                variant={v} 
                isWinner={report.winner?.by_paid_rate === v.variant || report.winner?.by_net_effect === v.variant}
              />
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Paid Rate Comparison */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Paid Rate по варіантах</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="variant" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="paid_rate" fill="#6366f1" name="Paid Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Orders Distribution */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Розподіл замовлень</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Net Effect Comparison */}
            <Card className="p-6 lg:col-span-2">
              <h3 className="font-semibold mb-4">Net Effect (Revenue - Returns Cost)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="variant" />
                    <YAxis />
                    <Tooltip formatter={(v) => `${v?.toLocaleString()} ₴`} />
                    <Legend />
                    <Bar dataKey="net_effect" fill="#10b981" name="Net Effect ₴" />
                    <Bar dataKey="orders" fill="#6366f1" name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Experiment Info */}
          <Card className="p-4 bg-gray-50">
            <h4 className="font-medium mb-2">Experiment Config</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">ID:</span>
                <span className="ml-2 font-mono">{report.exp?.id}</span>
              </div>
              <div>
                <span className="text-gray-500">Name:</span>
                <span className="ml-2">{report.exp?.name}</span>
              </div>
              <div>
                <span className="text-gray-500">Range:</span>
                <span className="ml-2">{report.exp?.range_days} days</span>
              </div>
              <div>
                <span className="text-gray-500">Variants:</span>
                <span className="ml-2">{report.exp?.variants_config?.length || 0}</span>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default ABTests;
