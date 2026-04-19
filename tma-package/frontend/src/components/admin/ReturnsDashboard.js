import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  BarChart, Bar
} from 'recharts';
import { RefreshCw, Check, Package, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
import { returnsAPI } from '../../utils/api';

function Card({ title, value, sub, icon: Icon, color = "blue" }) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    red: "from-red-500 to-red-600",
    green: "from-green-500 to-green-600",
    yellow: "from-yellow-500 to-yellow-600",
  };
  
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500 font-medium">{title}</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">{value}</div>
          {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl bg-gradient-to-r ${colorClasses[color]} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}

function pct(x) {
  const n = Number(x || 0);
  return `${(n * 100).toFixed(1)}%`;
}

export default function ReturnsDashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [list, setList] = useState({ items: [], total: 0, skip: 0, limit: 20 });
  const [days, setDays] = useState(30);

  const trendData = useMemo(() => {
    if (!trend?.labels?.length) return [];
    return trend.labels.map((d, i) => ({
      day: d.slice(5), // MM-DD
      returns: trend.returns[i] || 0,
      losses: Math.round(trend.losses[i] || 0),
    }));
  }, [trend]);

  const topReasons = summary?.top_reasons_30d || [];
  const topCities = summary?.top_cities_30d || [];

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, trendRes, listRes] = await Promise.all([
        returnsAPI.getSummary(),
        returnsAPI.getTrend(days),
        returnsAPI.getList(0, 20)
      ]);
      setSummary(summaryRes.data);
      setTrend(trendRes.data);
      setList(listRes.data);
    } catch (error) {
      console.error('Failed to fetch returns data:', error);
      toast.error('Помилка завантаження даних');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const resolveOrder = async (orderId) => {
    try {
      await returnsAPI.resolve(orderId);
      toast.success('Повернення позначено як вирішене');
      // Refresh list
      const listRes = await returnsAPI.getList(list.skip, list.limit);
      setList(listRes.data);
    } catch (error) {
      toast.error('Помилка: ' + (error.response?.data?.error || error.message));
    }
  };

  const pager = async (dir) => {
    const nextSkip = Math.max(0, (list.skip || 0) + dir * (list.limit || 20));
    try {
      const listRes = await returnsAPI.getList(nextSkip, list.limit);
      setList(listRes.data);
    } catch (error) {
      toast.error('Помилка завантаження');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Завантаження...</span>
      </div>
    );
  }

  const rb = summary || {};
  
  return (
    <div className="space-y-6" data-testid="returns-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Повернення</h2>
          <p className="text-sm text-gray-500">Операційний контроль повернень / відмов / не забрали</p>
        </div>

        <div className="flex items-center gap-2">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                days === d 
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg" 
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => setDays(d)}
            >
              {d} днів
            </button>
          ))}
          <button
            onClick={fetchAll}
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          title="Повернення сьогодні" 
          value={rb.today ?? 0} 
          icon={Package}
          color="red"
        />
        <Card 
          title="Повернення (30д)" 
          value={rb["30d"] ?? 0} 
          sub={`7д: ${rb["7d"] ?? 0}`}
          icon={TrendingUp}
          color="yellow"
        />
        <Card 
          title="Return rate (30д)" 
          value={pct(rb.return_rate_30d)} 
          sub={`COD refusal: ${pct(rb.cod_refusal_rate_30d)}`}
          icon={AlertTriangle}
          color="blue"
        />
        <Card 
          title="Втрати на доставці (30д)" 
          value={`${Math.round(rb.shipping_losses_30d ?? 0)} ₴`}
          icon={DollarSign}
          color="red"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border bg-white p-6 shadow-lg">
          <h3 className="font-semibold mb-4 text-gray-900">Тренд повернень</h3>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" stroke="#888" fontSize={12} />
                <YAxis allowDecimals={false} stroke="#888" fontSize={12} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="returns" 
                  name="Повернення" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-lg">
          <h3 className="font-semibold mb-4 text-gray-900">Втрати доставки (грн)</h3>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="losses" 
                  name="Втрати (грн)" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border bg-white p-6 shadow-lg">
          <h3 className="font-semibold mb-4 text-gray-900">Топ причин (30д)</h3>
          {topReasons.length > 0 ? (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={topReasons.map(x => ({ name: x.reason, count: x.count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#888" fontSize={11} />
                  <YAxis allowDecimals={false} stroke="#888" fontSize={12} />
                  <Tooltip contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="count" name="К-сть" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">Немає даних</div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-lg">
          <h3 className="font-semibold mb-4 text-gray-900">Топ міст (30д)</h3>
          {topCities.length > 0 ? (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={topCities.map(x => ({ name: x.city || "—", count: x.count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#888" fontSize={11} />
                  <YAxis allowDecimals={false} stroke="#888" fontSize={12} />
                  <Tooltip contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="count" name="К-сть" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">Немає даних</div>
          )}
        </div>
      </div>

      {/* Returns Table */}
      <div className="rounded-2xl border bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Список повернень</h3>
          <span className="text-sm text-gray-500">Всього: {list.total ?? 0}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-gray-600 border-b">
              <tr>
                <th className="text-left py-3 pr-4 font-semibold">Order</th>
                <th className="text-left py-3 pr-4 font-semibold">ТТН</th>
                <th className="text-left py-3 pr-4 font-semibold">Stage</th>
                <th className="text-left py-3 pr-4 font-semibold">Reason</th>
                <th className="text-left py-3 pr-4 font-semibold">Місто</th>
                <th className="text-right py-3 pr-4 font-semibold">Сума</th>
                <th className="text-left py-3 pr-4 font-semibold">Updated</th>
                <th className="text-right py-3 font-semibold">Дії</th>
              </tr>
            </thead>
            <tbody>
              {list.items?.map((o) => {
                const sh = o.shipment || {};
                const ret = o.returns || {};
                const city = o?.delivery?.recipient?.city || o?.shipping?.city || "—";
                const amount = o?.totals?.grand || o?.total_amount || 0;
                const stageColor = {
                  RETURNING: "bg-yellow-100 text-yellow-800",
                  RETURNED: "bg-red-100 text-red-800",
                  RESOLVED: "bg-green-100 text-green-800"
                }[ret.stage] || "bg-gray-100 text-gray-800";
                
                return (
                  <tr key={o.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs">{o.id?.slice(0, 8) || "—"}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{sh.ttn || "—"}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${stageColor}`}>
                        {ret.stage || "—"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs">{ret.reason || "—"}</td>
                    <td className="py-3 pr-4">{city}</td>
                    <td className="py-3 pr-4 text-right font-medium">{Math.round(amount)} ₴</td>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-500">
                      {ret.updated_at?.slice(0, 10) || "—"}
                    </td>
                    <td className="py-3 text-right">
                      {ret.stage !== "RESOLVED" && (
                        <button
                          className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors text-sm font-medium flex items-center gap-1 ml-auto"
                          onClick={() => resolveOrder(o.id)}
                        >
                          <Check className="w-4 h-4" />
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(!list.items || list.items.length === 0) && (
                <tr>
                  <td className="py-8 text-center text-gray-500" colSpan={8}>
                    Немає записів про повернення
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-end gap-2 mt-4">
          <button 
            className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() => pager(-1)} 
            disabled={(list.skip || 0) === 0}
          >
            ← Назад
          </button>
          <button 
            className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() => pager(1)} 
            disabled={(list.skip + list.limit) >= list.total}
          >
            Вперед →
          </button>
        </div>
      </div>
    </div>
  );
}
