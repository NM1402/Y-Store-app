import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { RefreshCw, Check, X, Shield, MapPin, User, AlertTriangle } from 'lucide-react';
import { policyAPI } from '../../utils/api';

export default function PolicyDashboard() {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [cities, setCities] = useState([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, historyRes, citiesRes] = await Promise.all([
        policyAPI.getPending(),
        policyAPI.getHistory(),
        policyAPI.getCities()
      ]);
      setPending(pendingRes.data.items || []);
      setHistory(historyRes.data.items || []);
      setCities(citiesRes.data.items || []);
    } catch (error) {
      console.error('Failed to fetch policy data:', error);
      toast.error('Помилка завантаження даних');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const approveAction = async (dedupeKey) => {
    try {
      await policyAPI.approve(dedupeKey);
      toast.success('Політику підтверджено та застосовано');
      fetchAll();
    } catch (error) {
      toast.error('Помилка: ' + (error.response?.data?.error || error.message));
    }
  };

  const rejectAction = async (dedupeKey) => {
    try {
      await policyAPI.reject(dedupeKey);
      toast.success('Політику відхилено');
      fetchAll();
    } catch (error) {
      toast.error('Помилка: ' + (error.response?.data?.error || error.message));
    }
  };

  const removeCityPolicy = async (city) => {
    try {
      await policyAPI.removeCity(city);
      toast.success(`Політику для ${city} знято`);
      fetchAll();
    } catch (error) {
      toast.error('Помилка: ' + (error.response?.data?.error || error.message));
    }
  };

  const runPolicyEngine = async () => {
    try {
      const res = await policyAPI.run();
      const data = res.data;
      toast.success(`Policy engine: ${data.proposed} запропоновано, ${data.approvals_enqueued} в черзі`);
      fetchAll();
    } catch (error) {
      toast.error('Помилка запуску policy engine');
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

  const getActionIcon = (action) => {
    if (action?.includes('BLOCK')) return <Shield className="w-4 h-4 text-red-500" />;
    if (action?.includes('CITY')) return <MapPin className="w-4 h-4 text-orange-500" />;
    return <User className="w-4 h-4 text-blue-500" />;
  };

  const getActionColor = (action) => {
    if (action?.includes('BLOCK')) return 'bg-red-50 border-red-200';
    if (action?.includes('PREPAID')) return 'bg-yellow-50 border-yellow-200';
    return 'bg-blue-50 border-blue-200';
  };

  return (
    <div className="space-y-6" data-testid="policy-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-600" />
            Policy Control Center
          </h2>
          <p className="text-sm text-gray-500">Автоматичне управління ризиками COD та повернень</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runPolicyEngine}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium shadow-lg hover:shadow-xl transition-all"
          >
            Запустити Policy Engine
          </button>
          <button
            onClick={fetchAll}
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 p-5">
          <div className="text-sm text-yellow-700 font-medium">Pending Approvals</div>
          <div className="text-3xl font-bold text-yellow-900 mt-1">{pending.length}</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-5">
          <div className="text-sm text-blue-700 font-medium">City Policies</div>
          <div className="text-3xl font-bold text-blue-900 mt-1">{cities.filter(c => c.require_prepaid).length}</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-5">
          <div className="text-sm text-green-700 font-medium">History (last 50)</div>
          <div className="text-3xl font-bold text-green-900 mt-1">{history.length}</div>
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="rounded-2xl border bg-white p-6 shadow-lg">
        <h3 className="font-semibold mb-4 text-gray-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          Pending Approvals
        </h3>
        
        {pending.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Немає очікуючих рішень
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((p) => {
              const d = p.decision || {};
              return (
                <div 
                  key={p.dedupe_key} 
                  className={`rounded-xl border p-4 ${getActionColor(d.action)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {getActionIcon(d.action)}
                      <div>
                        <div className="font-semibold text-gray-900">{d.action}</div>
                        <div className="text-sm text-gray-600">
                          {d.target_type}: <code className="bg-white px-1 rounded">{d.target_id}</code>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Причина: {d.reason} | Severity: {d.severity}
                        </div>
                        {d.meta && (
                          <div className="text-xs text-gray-400 mt-1">
                            {d.meta.cod_refusals_30d !== undefined && `COD відмов (30д): ${d.meta.cod_refusals_30d}`}
                            {d.meta.returns_60d !== undefined && ` | Повернень (60д): ${d.meta.returns_60d}`}
                            {d.meta.return_rate !== undefined && `Return rate: ${(d.meta.return_rate * 100).toFixed(1)}%`}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveAction(p.dedupe_key)}
                        className="px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => rejectAction(p.dedupe_key)}
                        className="px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* City Policies */}
      <div className="rounded-2xl border bg-white p-6 shadow-lg">
        <h3 className="font-semibold mb-4 text-gray-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-orange-500" />
          City Policies
        </h3>
        
        {cities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Немає активних політик по містах
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-gray-600 border-b">
                <tr>
                  <th className="text-left py-3 pr-4 font-semibold">Місто</th>
                  <th className="text-left py-3 pr-4 font-semibold">Require Prepaid</th>
                  <th className="text-left py-3 pr-4 font-semibold">Причина</th>
                  <th className="text-left py-3 pr-4 font-semibold">Return Rate</th>
                  <th className="text-right py-3 font-semibold">Дії</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((c) => (
                  <tr key={c.city} className="border-b hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium">{c.city}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        c.require_prepaid ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {c.require_prepaid ? 'Так' : 'Ні'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-gray-500">{c.reason || '—'}</td>
                    <td className="py-3 pr-4">
                      {c.meta?.return_rate ? `${(c.meta.return_rate * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-3 text-right">
                      {c.require_prepaid && (
                        <button
                          onClick={() => removeCityPolicy(c.city)}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm"
                        >
                          Зняти
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History */}
      <div className="rounded-2xl border bg-white p-6 shadow-lg">
        <h3 className="font-semibold mb-4 text-gray-900">Історія рішень</h3>
        
        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Немає історії
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {history.map((h, i) => {
              const d = h.decision || {};
              return (
                <div 
                  key={h.dedupe_key || i} 
                  className="flex items-center justify-between py-2 border-b border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      h.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {h.status}
                    </span>
                    <span className="text-sm text-gray-700">{d.action}</span>
                    <code className="text-xs bg-gray-100 px-1 rounded">{d.target_id}</code>
                  </div>
                  <div className="text-xs text-gray-400">
                    {h.approved_by || h.rejected_by}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
