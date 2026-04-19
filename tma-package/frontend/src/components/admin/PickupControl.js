/**
 * O20.2: Контроль отримання посилок
 * Моніторинг та управління відправленнями на точках видачі
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, Clock, AlertTriangle, RefreshCw, 
  Send, BellOff, User, ChevronDown, Filter,
  TrendingUp, DollarSign
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

const PickupControl = () => {
  const [items, setItems] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterDays, setFilterDays] = useState(5);
  const [processing, setProcessing] = useState({});

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [riskRes, kpiRes] = await Promise.all([
        fetch(`${API_BASE}/api/v2/admin/pickup-control/risk?days=${filterDays}&limit=100`, {
          headers: getHeaders()
        }),
        fetch(`${API_BASE}/api/v2/admin/pickup-control/kpi`, {
          headers: getHeaders()
        })
      ]);

      if (riskRes.ok) {
        const data = await riskRes.json();
        setItems(data.items || []);
      }
      if (kpiRes.ok) {
        const data = await kpiRes.json();
        setKpi(data);
      }
    } catch (err) {
      console.error('Помилка завантаження:', err);
    } finally {
      setLoading(false);
    }
  }, [filterDays]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunEngine = async () => {
    try {
      setProcessing({ ...processing, engine: true });
      const res = await fetch(`${API_BASE}/api/v2/admin/pickup-control/run`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ limit: 300 })
      });
      const data = await res.json();
      alert(`Оброблено: ${data.processed}, надіслано: ${data.sent}, ризикових: ${data.high_risk_count}`);
      loadData();
    } catch (err) {
      alert('Помилка: ' + err.message);
    } finally {
      setProcessing({ ...processing, engine: false });
    }
  };

  const handleSendReminder = async (ttn, level = 'D5') => {
    try {
      setProcessing({ ...processing, [ttn]: true });
      await fetch(`${API_BASE}/api/v2/admin/pickup-control/send-reminder/${ttn}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ level })
      });
      alert(`Нагадування надіслано для ТТН ${ttn}`);
      loadData();
    } catch (err) {
      alert('Помилка: ' + err.message);
    } finally {
      setProcessing({ ...processing, [ttn]: false });
    }
  };

  const handleMute = async (ttn, days = 7) => {
    try {
      await fetch(`${API_BASE}/api/v2/admin/pickup-control/mute/${ttn}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ days })
      });
      alert(`ТТН ${ttn} заглушено на ${days} днів`);
      loadData();
    } catch (err) {
      alert('Помилка: ' + err.message);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 0
    }).format(val || 0);
  };

  const getRiskColor = (days) => {
    if (days >= 7) return 'text-red-600 bg-red-50';
    if (days >= 5) return 'text-orange-600 bg-orange-50';
    if (days >= 2) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="pickup-control">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-7 h-7 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">Контроль отримання</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleRunEngine}
            disabled={processing.engine}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            data-testid="run-engine-btn"
          >
            {processing.engine ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Запустити обробку
          </button>
        </div>
      </div>

      {/* KPI картки */}
      {kpi && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">2+ днів</p>
                <p className="text-2xl font-bold text-yellow-600">{kpi.at_point_2plus}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-200" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">5+ днів</p>
                <p className="text-2xl font-bold text-orange-600">{kpi.at_point_5plus}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-200" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">7+ днів (ризик)</p>
                <p className="text-2xl font-bold text-red-600">{kpi.at_point_7plus}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-200" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Сума під ризиком</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(kpi.amount_at_risk)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-200" />
            </div>
          </div>
        </div>
      )}

      {/* Фільтр */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">Показати від:</span>
          <select
            value={filterDays}
            onChange={(e) => setFilterDays(Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg"
            data-testid="filter-days"
          >
            <option value={2}>2+ днів</option>
            <option value={5}>5+ днів</option>
            <option value={7}>7+ днів</option>
          </select>
          <span className="text-sm text-gray-500">Знайдено: {items.length}</span>
        </div>
      </div>

      {/* Таблиця */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ТТН</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Замовлення</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Днів</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Дедлайн</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Сума</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Статус</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Дії</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Немає відправлень з таким ризиком
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const shipment = item.shipment || {};
                const days = shipment.daysAtPoint || 0;
                const reminders = (item.reminders?.pickup) || {};
                
                return (
                  <tr key={item.id} className="hover:bg-gray-50" data-testid={`row-${item.id}`}>
                    <td className="px-4 py-3">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {shipment.ttn || '-'}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.id?.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${getRiskColor(days)}`}>
                        {days} дн
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {shipment.deadlineFreeAt?.slice(0, 10) || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {formatCurrency(item.total_amount || item.totals?.grand)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <div className="text-gray-500">{shipment.lastStatusText?.slice(0, 30) || item.status}</div>
                        {reminders.sentLevels?.length > 0 && (
                          <div className="text-green-600 mt-1">
                            Надіслано: {reminders.sentLevels.join(', ')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSendReminder(shipment.ttn, days >= 7 ? 'D7' : 'D5')}
                          disabled={processing[shipment.ttn]}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Надіслати нагадування"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMute(shipment.ttn, 7)}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                          title="Заглушити на 7 днів"
                        >
                          <BellOff className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PickupControl;
