/**
 * O20.2: Pickup Control Admin Page
 * Manage at-risk shipments, send reminders, mute/unmute TTNs
 * All texts in Ukrainian
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Package, Send, BellOff, Bell, RefreshCw, AlertTriangle, Clock, DollarSign, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PickupControlPage = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    days2plus: 0,
    days5plus: 0,
    days7plus: 0,
    amount_at_risk_7plus: 0
  });
  const [riskItems, setRiskItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState(7);
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/v2/admin/pickup-control/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  }, [token]);

  const fetchRiskList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/v2/admin/pickup-control/risk?days=${filter}&skip=${page * pageSize}&limit=${pageSize}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setRiskItems(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching risk list:', err);
      toast.error('Помилка завантаження');
    } finally {
      setLoading(false);
    }
  }, [token, filter, page]);

  useEffect(() => {
    fetchSummary();
    fetchRiskList();
  }, [fetchSummary, fetchRiskList]);

  const handleSendReminder = async (ttn, level) => {
    try {
      const res = await fetch(`${API_URL}/api/v2/admin/pickup-control/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ttn, level })
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`📩 Нагадування ${level} відправлено`);
        fetchRiskList();
      } else {
        toast.error(`Не вдалося: ${data.reason}`);
      }
    } catch (err) {
      toast.error('Помилка відправки');
    }
  };

  const handleMute = async (ttn, hours) => {
    try {
      const res = await fetch(`${API_URL}/api/v2/admin/pickup-control/mute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ttn, hours })
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`🔕 Заглушено до ${data.muted_until}`);
        fetchRiskList();
      } else {
        toast.error('Помилка');
      }
    } catch (err) {
      toast.error('Помилка');
    }
  };

  const handleUnmute = async (ttn) => {
    try {
      const res = await fetch(`${API_URL}/api/v2/admin/pickup-control/unmute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ttn })
      });
      const data = await res.json();
      if (data.ok) {
        toast.success('🔈 Mute знято');
        fetchRiskList();
      }
    } catch (err) {
      toast.error('Помилка');
    }
  };

  const pickLevel = (daysAtPoint, pickupType = 'BRANCH') => {
    if (pickupType === 'LOCKER') {
      if (daysAtPoint >= 5) return 'L5';
      if (daysAtPoint >= 3) return 'L3';
      return 'L1';
    }
    if (daysAtPoint >= 7) return 'D7';
    if (daysAtPoint >= 5) return 'D5';
    return 'D2';
  };

  const getRiskColor = (days) => {
    if (days >= 7) return 'bg-red-100 text-red-700 border-red-200';
    if (days >= 5) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (days >= 2) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);

  return (
    <div className="min-h-screen bg-gray-50 p-6" data-testid="pickup-control-page">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📦 Контроль отримання</h1>
            <p className="text-gray-600 mt-1">Управління ризиковими відправленнями</p>
          </div>
          <Button
            onClick={() => { fetchSummary(); fetchRiskList(); }}
            variant="outline"
            data-testid="refresh-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Оновити
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div
            className={`bg-white rounded-xl p-5 border-2 cursor-pointer transition-all ${filter === 2 ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-gray-200 hover:border-yellow-300'}`}
            onClick={() => { setFilter(2); setPage(0); }}
            data-testid="filter-2plus"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-600">2+ днів</p>
                <p className="text-2xl font-bold">{summary.days2plus}</p>
              </div>
            </div>
          </div>

          <div
            className={`bg-white rounded-xl p-5 border-2 cursor-pointer transition-all ${filter === 5 ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200 hover:border-orange-300'}`}
            onClick={() => { setFilter(5); setPage(0); }}
            data-testid="filter-5plus"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-600">5+ днів</p>
                <p className="text-2xl font-bold">{summary.days5plus}</p>
              </div>
            </div>
          </div>

          <div
            className={`bg-white rounded-xl p-5 border-2 cursor-pointer transition-all ${filter === 7 ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-200 hover:border-red-300'}`}
            onClick={() => { setFilter(7); setPage(0); }}
            data-testid="filter-7plus"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-600">7+ днів</p>
                <p className="text-2xl font-bold">{summary.days7plus}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border-2 border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Під ризиком (7+)</p>
                <p className="text-2xl font-bold">{summary.amount_at_risk_7plus?.toLocaleString()} грн</p>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Table */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold">
              Ризикові відправлення ({filter}+ днів) — {total} шт
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Завантаження...</div>
          ) : riskItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              ✅ Немає відправлень з таким ризиком
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="risk-table">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">ТТН</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Днів</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Дедлайн</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Сума</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Статус НП</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Надіслано</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Mute до</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {riskItems.map((order, idx) => {
                    const sh = order.shipment || {};
                    const ttn = sh.ttn || '-';
                    const days = sh.daysAtPoint || 0;
                    const deadline = sh.deadlineFreeAt || '-';
                    const statusText = sh.lastStatusText || '-';
                    const amount = (order.totals?.grand || order.total_amount || 0);
                    const pickupType = sh.pickupPointType || 'BRANCH';
                    const reminders = (order.reminders?.pickup) || {};
                    const sentLevels = reminders.sentLevels || [];
                    const cooldown = reminders.cooldownUntil;
                    const isMuted = cooldown && new Date(cooldown) > new Date();

                    return (
                      <tr key={idx} className="hover:bg-gray-50" data-testid={`row-${ttn}`}>
                        <td className="py-3 px-4">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">{ttn}</code>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-sm font-medium ${getRiskColor(days)}`}>
                            {days}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{deadline}</td>
                        <td className="py-3 px-4 text-right font-medium">{amount.toLocaleString()} грн</td>
                        <td className="py-3 px-4 text-sm text-gray-600 max-w-[200px] truncate">{statusText}</td>
                        <td className="py-3 px-4 text-sm">
                          {sentLevels.length > 0 ? (
                            <span className="text-green-600">{sentLevels.join(', ')}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {isMuted ? (
                            <span className="text-orange-600">{new Date(cooldown).toLocaleDateString('uk')}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleSendReminder(ttn, pickLevel(days, pickupType))}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Надіслати нагадування"
                              data-testid={`send-${ttn}`}
                            >
                              <Send className="w-4 h-4" />
                            </button>
                            {isMuted ? (
                              <button
                                onClick={() => handleUnmute(ttn)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Увімкнути нагадування"
                                data-testid={`unmute-${ttn}`}
                              >
                                <Bell className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMute(ttn, 168)}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                title="Заглушити на 7 днів"
                                data-testid={`mute-${ttn}`}
                              >
                                <BellOff className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > pageSize && (
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Показано {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} з {total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  ← Назад
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= maxPage}
                  onClick={() => setPage(p => p + 1)}
                >
                  Далі →
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PickupControlPage;
