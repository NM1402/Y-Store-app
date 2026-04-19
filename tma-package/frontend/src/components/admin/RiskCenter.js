import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { 
  Shield, AlertTriangle, Users, TrendingUp, RefreshCw,
  Search, ChevronRight, User, Phone, Mail, ShoppingBag,
  AlertCircle, CheckCircle, Clock, Edit2, X
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import api from '../../utils/api';
import { toast } from 'sonner';

const RISK_COLORS = {
  LOW: '#10b981',
  WATCH: '#f59e0b',
  RISK: '#ef4444'
};

const RiskBadge = ({ band, score }) => {
  const colors = {
    LOW: 'bg-green-100 text-green-800 border-green-200',
    WATCH: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    RISK: 'bg-red-100 text-red-800 border-red-200'
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${colors[band] || colors.LOW}`}>
      {band} ({score}/100)
    </span>
  );
};

const RiskScoreBar = ({ score }) => {
  const color = score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-yellow-500' : 'bg-green-500';
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className={`${color} h-2 rounded-full transition-all duration-500`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
};

const CustomerRiskCard = ({ customer, onRecalc, onSelect }) => {
  const risk = customer.risk || {};
  
  return (
    <Card 
      className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4"
      style={{ borderLeftColor: RISK_COLORS[risk.band] || RISK_COLORS.LOW }}
      onClick={() => onSelect(customer)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{customer.full_name || customer.email || 'Невідомий'}</span>
            <RiskBadge band={risk.band} score={risk.score || 0} />
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
            {customer.email && (
              <div className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                <span className="truncate">{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                <span>{customer.phone}</span>
              </div>
            )}
          </div>
          
          {risk.reasons && risk.reasons.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {risk.reasons.slice(0, 3).map((reason, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="text-2xl font-bold" style={{ color: RISK_COLORS[risk.band] }}>
            {risk.score || 0}
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => { e.stopPropagation(); onRecalc(customer.id); }}
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

const CustomerDetail = ({ customer, onClose, onRecalc, onOverride }) => {
  const [overrideScore, setOverrideScore] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverride, setShowOverride] = useState(false);
  
  const risk = customer.risk || {};
  const override = customer.risk_override;
  
  const handleOverride = async () => {
    if (!overrideScore) return;
    await onOverride(customer.id, parseInt(overrideScore), overrideReason);
    setShowOverride(false);
    setOverrideScore('');
    setOverrideReason('');
  };
  
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <User className="w-5 h-5" />
            {customer.full_name || customer.email}
          </h3>
          <p className="text-gray-500">{customer.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      {/* Risk Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">Risk Score</span>
          <RiskBadge band={risk.band} score={risk.score || 0} />
        </div>
        <RiskScoreBar score={risk.score || 0} />
        
        {override && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <span className="font-medium">Override active:</span> Score {override.score}
            {override.reason && <span> - {override.reason}</span>}
          </div>
        )}
      </div>
      
      {/* Risk Components */}
      {risk.components && (
        <div className="mb-6">
          <h4 className="font-medium mb-3">Компоненти ризику</h4>
          <div className="space-y-2">
            {Object.entries(risk.components).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{key}</span>
                <span className="font-medium">
                  n={val.n}, score={val.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Reasons */}
      {risk.reasons && risk.reasons.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium mb-2">Причини</h4>
          <div className="flex flex-wrap gap-2">
            {risk.reasons.map((reason, i) => (
              <span key={i} className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm">
                {reason}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onRecalc(customer.id)} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-1" />
          Перерахувати
        </Button>
        <Button onClick={() => setShowOverride(!showOverride)} variant="outline" size="sm">
          <Edit2 className="w-4 h-4 mr-1" />
          Override
        </Button>
      </div>
      
      {/* Override Form */}
      {showOverride && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-3">Встановити override</h4>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              placeholder="Score (0-100)"
              value={overrideScore}
              onChange={(e) => setOverrideScore(e.target.value)}
              min="0"
              max="100"
            />
            <Input
              placeholder="Причина"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
            />
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={handleOverride} size="sm">Застосувати</Button>
            <Button onClick={() => setShowOverride(false)} variant="ghost" size="sm">Скасувати</Button>
          </div>
        </div>
      )}
    </Card>
  );
};

const RiskCenter = () => {
  const [summary, setSummary] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, customersRes] = await Promise.all([
        api.get('/api/v2/admin/risk/summary'),
        api.get('/api/v2/admin/risk/customers?limit=100')
      ]);
      setSummary(summaryRes.data);
      setCustomers(customersRes.data.customers || []);
    } catch (error) {
      console.error('Failed to fetch risk data:', error);
      toast.error('Помилка завантаження даних');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecalc = async (userId) => {
    try {
      await api.post(`/api/v2/admin/risk/recalc/${userId}`);
      toast.success('Ризик перераховано');
      fetchData();
    } catch (error) {
      toast.error('Помилка перерахунку');
    }
  };

  const handleRecalcAll = async () => {
    try {
      const res = await api.post('/api/v2/admin/risk/recalc-all?limit=100');
      toast.success(`Оновлено ${res.data.updated} профілів`);
      fetchData();
    } catch (error) {
      toast.error('Помилка масового перерахунку');
    }
  };

  const handleOverride = async (userId, score, reason) => {
    try {
      await api.post(`/api/v2/admin/risk/override/${userId}`, { score, reason });
      toast.success('Override встановлено');
      fetchData();
    } catch (error) {
      toast.error('Помилка override');
    }
  };

  const filteredCustomers = customers.filter(c => {
    const band = c.risk?.band || 'LOW';
    if (filter !== 'all' && band !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (c.email || '').toLowerCase().includes(q) ||
        (c.full_name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q)
      );
    }
    return true;
  });

  const pieData = summary ? [
    { name: 'LOW', value: summary.distribution.LOW || 0, color: RISK_COLORS.LOW },
    { name: 'WATCH', value: summary.distribution.WATCH || 0, color: RISK_COLORS.WATCH },
    { name: 'RISK', value: summary.distribution.RISK || 0, color: RISK_COLORS.RISK },
  ].filter(d => d.value > 0) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-red-600" />
            Risk Center
          </h2>
          <p className="text-gray-500 mt-1">Аналіз ризиків клієнтів (0-100 score)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Оновити
          </Button>
          <Button onClick={handleRecalcAll} className="bg-red-600 hover:bg-red-700">
            Перерахувати всіх
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-gray-600" />
              <span className="font-medium">Всього</span>
            </div>
            <p className="text-2xl font-bold">{summary.total_users}</p>
            <p className="text-sm text-gray-500">{summary.scored_users} оцінено</p>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800">RISK</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{summary.distribution.RISK || 0}</p>
            <p className="text-sm text-red-600">високий ризик</p>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">WATCH</span>
            </div>
            <p className="text-2xl font-bold text-yellow-700">{summary.distribution.WATCH || 0}</p>
            <p className="text-sm text-yellow-600">під наглядом</p>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">LOW</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{summary.distribution.LOW || 0}</p>
            <p className="text-sm text-green-600">низький ризик</p>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution Chart */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Розподіл ризиків</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
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

        {/* Customer List */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Клієнти з оцінкою ризику</h3>
            <div className="flex gap-2">
              {['all', 'RISK', 'WATCH', 'LOW'].map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                  className={filter === f ? 'bg-blue-600' : ''}
                >
                  {f === 'all' ? 'Всі' : f}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Пошук за email, ім'ям, телефоном..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Немає клієнтів з оцінкою ризику</p>
            ) : (
              filteredCustomers.map((customer) => (
                <CustomerRiskCard
                  key={customer.id}
                  customer={customer}
                  onRecalc={handleRecalc}
                  onSelect={setSelectedCustomer}
                />
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Selected Customer Detail */}
      {selectedCustomer && (
        <CustomerDetail
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onRecalc={handleRecalc}
          onOverride={handleOverride}
        />
      )}

      {/* Recent High Risk */}
      {summary?.recent_high_risk?.length > 0 && (
        <Card className="p-6 border-red-200 bg-red-50">
          <h3 className="font-semibold text-red-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Останні високоризикові клієнти
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.recent_high_risk.map((c) => (
              <div key={c.id} className="p-3 bg-white rounded-lg border border-red-200">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{c.full_name || c.email}</span>
                  <span className="text-red-600 font-bold">{c.risk?.score}/100</span>
                </div>
                <p className="text-sm text-gray-500 truncate">{c.email}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default RiskCenter;
