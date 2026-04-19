import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { 
  TrendingUp, DollarSign, RefreshCw, Settings, Play, Check, X, 
  AlertTriangle, ChevronDown, ChevronUp, Zap, Shield, RotateCcw,
  Clock, Target, Activity
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import api from '../../utils/api';
import { toast } from 'sonner';

const StatusBadge = ({ status }) => {
  const colors = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    APPROVED: 'bg-blue-100 text-blue-800 border-blue-200',
    APPLIED: 'bg-green-100 text-green-800 border-green-200',
    VALIDATED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    REJECTED: 'bg-gray-100 text-gray-800 border-gray-200',
    ROLLED_BACK: 'bg-red-100 text-red-800 border-red-200',
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${colors[status] || colors.PENDING}`}>
      {status}
    </span>
  );
};

const SuggestionCard = ({ suggestion, onApprove, onReject, onApply }) => {
  const [expanded, setExpanded] = useState(false);
  const expected = suggestion.expected || {};
  
  return (
    <Card className={`p-4 border-l-4 ${
      suggestion.status === 'PENDING' ? 'border-l-yellow-500' :
      suggestion.status === 'APPLIED' ? 'border-l-green-500' :
      suggestion.status === 'ROLLED_BACK' ? 'border-l-red-500' :
      'border-l-gray-300'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-yellow-600" />
            <span className="font-semibold">{suggestion.reason}</span>
            <StatusBadge status={suggestion.status} />
          </div>
          
          <p className="text-sm text-gray-600 mb-2">
            {expected.trigger || expected.action || JSON.stringify(suggestion.proposed)}
          </p>
          
          {/* Impact Preview */}
          {expected.expected_net_delta_uah !== undefined && (
            <div className="flex gap-4 text-sm mb-2">
              <span className={expected.expected_net_delta_uah >= 0 ? 'text-green-600' : 'text-red-600'}>
                Net: {expected.expected_net_delta_uah >= 0 ? '+' : ''}{expected.expected_net_delta_uah?.toLocaleString()} ₴
              </span>
              {expected.discount_cost_uah && (
                <span className="text-gray-500">Cost: {expected.discount_cost_uah?.toLocaleString()} ₴</span>
              )}
              {expected.expected_extra_paid_orders && (
                <span className="text-blue-600">+{expected.expected_extra_paid_orders} orders</span>
              )}
            </div>
          )}
          
          <p className="text-xs text-gray-400">
            {new Date(suggestion.ts).toLocaleString()}
          </p>
        </div>
        
        <div className="flex flex-col gap-2">
          {suggestion.status === 'PENDING' && (
            <>
              <Button size="sm" onClick={() => onApply(suggestion.id)} className="bg-green-600 hover:bg-green-700">
                <Play className="w-3 h-3 mr-1" /> Apply
              </Button>
              <Button size="sm" variant="outline" onClick={() => onReject(suggestion.id)}>
                <X className="w-3 h-3 mr-1" /> Reject
              </Button>
            </>
          )}
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Proposed Changes</h4>
              <pre className="bg-gray-50 p-2 rounded text-xs">
                {JSON.stringify(suggestion.proposed, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">Baseline</h4>
              <pre className="bg-gray-50 p-2 rounded text-xs">
                {JSON.stringify(suggestion.baseline, null, 2)}
              </pre>
            </div>
          </div>
          
          {suggestion.rollback_reason && (
            <div className="mt-3 p-3 bg-red-50 rounded">
              <h4 className="font-medium text-red-800 mb-1">Rollback Reason</h4>
              <p className="text-sm text-red-600">{suggestion.rollback_reason}</p>
              {suggestion.rollback_details && (
                <pre className="text-xs mt-2 text-red-500">
                  {JSON.stringify(suggestion.rollback_details, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

const RevenueControl = () => {
  const [settings, setSettings] = useState(null);
  const [config, setConfig] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, configRes, suggestionsRes, snapshotsRes] = await Promise.all([
        api.get('/api/v2/admin/revenue/settings'),
        api.get('/api/v2/admin/revenue/config'),
        api.get('/api/v2/admin/revenue/suggestions?limit=20'),
        api.get('/api/v2/admin/revenue/snapshots?limit=10'),
      ]);
      setSettings(settingsRes.data);
      setConfig(configRes.data);
      setSuggestions(suggestionsRes.data.items || []);
      setSnapshots(snapshotsRes.data.items || []);
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
      toast.error('Помилка завантаження даних');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const runOptimize = async () => {
    setRunning(true);
    try {
      const res = await api.post('/api/v2/admin/revenue/optimize/run', { range_days: 7 });
      toast.success(res.data.suggestion ? 'Нова рекомендація створена!' : res.data.skipped || 'Немає рекомендацій');
      fetchData();
    } catch (error) {
      toast.error('Помилка оптимізації');
    } finally {
      setRunning(false);
    }
  };

  const handleApply = async (sid) => {
    try {
      await api.post(`/api/v2/admin/revenue/suggestions/${sid}/apply`);
      toast.success('Зміни застосовано!');
      fetchData();
    } catch (error) {
      toast.error('Помилка застосування');
    }
  };

  const handleReject = async (sid) => {
    try {
      await api.post(`/api/v2/admin/revenue/suggestions/${sid}/reject`);
      toast.success('Відхилено');
      fetchData();
    } catch (error) {
      toast.error('Помилка');
    }
  };

  const handleConfigChange = async (key, value) => {
    try {
      await api.patch('/api/v2/admin/revenue/config', { [key]: parseFloat(value) });
      toast.success('Конфіг оновлено');
      fetchData();
    } catch (error) {
      toast.error('Помилка оновлення');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const latestSnapshot = snapshots[0] || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-7 h-7 text-purple-600" />
            Revenue Optimization Engine
          </h2>
          <p className="text-gray-500 mt-1">Semi-Auto режим: рекомендації → підтвердження → моніторинг → авто-rollback</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Оновити
          </Button>
          <Button onClick={runOptimize} disabled={running} className="bg-purple-600 hover:bg-purple-700">
            {running ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            Run Optimize
          </Button>
        </div>
      </div>

      {/* Current Config */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-800">Знижка %</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.5"
              value={config?.prepaid_discount_value || 1}
              onChange={(e) => handleConfigChange('prepaid_discount_value', e.target.value)}
              className="w-20 text-lg font-bold"
            />
            <span className="text-blue-600">%</span>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800">Мін. депозит</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="50"
              value={config?.deposit_min_uah || 100}
              onChange={(e) => handleConfigChange('deposit_min_uah', e.target.value)}
              className="w-24 text-lg font-bold"
            />
            <span className="text-green-600">₴</span>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="font-medium text-yellow-800">Risk Threshold</span>
          </div>
          <p className="text-2xl font-bold text-yellow-700">{config?.risk_threshold_high || 70}</p>
          <p className="text-sm text-yellow-600">HIGH score</p>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-purple-800">Mode</span>
          </div>
          <p className="text-lg font-bold text-purple-700">{settings?.mode || 'SEMI_AUTO'}</p>
          <p className="text-sm text-purple-600">Cooldown: {settings?.cooldown_hours || 24}h</p>
        </Card>
      </div>

      {/* Latest Snapshot */}
      {latestSnapshot.ts && (
        <Card className="p-6 bg-gray-50">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Останній Snapshot ({new Date(latestSnapshot.ts).toLocaleString()})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{latestSnapshot.orders_total || 0}</p>
              <p className="text-sm text-gray-500">Orders</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{((latestSnapshot.prepaid_conversion || 0) * 100).toFixed(1)}%</p>
              <p className="text-sm text-gray-500">Prepaid Conv</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{((latestSnapshot.decline_rate || 0) * 100).toFixed(1)}%</p>
              <p className="text-sm text-gray-500">Decline Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{((latestSnapshot.return_rate || 0) * 100).toFixed(1)}%</p>
              <p className="text-sm text-gray-500">Return Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{((latestSnapshot.net_margin_est || 0) * 100).toFixed(1)}%</p>
              <p className="text-sm text-gray-500">Net Margin Est</p>
            </div>
          </div>
        </Card>
      )}

      {/* Suggestions */}
      <div>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-600" />
          Рекомендації ROE
        </h3>
        
        {suggestions.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            Немає рекомендацій. Натисніть "Run Optimize" для аналізу.
          </Card>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                onApprove={() => {}}
                onReject={handleReject}
                onApply={handleApply}
              />
            ))}
          </div>
        )}
      </div>

      {/* Snapshot Trend */}
      {snapshots.length > 1 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Тренд метрик</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[...snapshots].reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="ts" tick={{ fontSize: 10 }} tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip labelFormatter={(v) => new Date(v).toLocaleString()} />
                <Legend />
                <Line type="monotone" dataKey="prepaid_conversion" stroke="#10b981" name="Prepaid Conv" dot={false} />
                <Line type="monotone" dataKey="decline_rate" stroke="#ef4444" name="Decline Rate" dot={false} />
                <Line type="monotone" dataKey="return_rate" stroke="#f59e0b" name="Return Rate" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
};

export default RevenueControl;
