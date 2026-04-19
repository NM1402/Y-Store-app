/**
 * O14: Інциденти безпеки (Guard)
 * Перегляд та управління інцидентами шахрайства/KPI
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, Shield, Clock, CheckCircle, 
  XCircle, RefreshCw, Eye, Bell, BellOff 
} from 'lucide-react';
import analyticsService from '../../services/analyticsService';

const GuardIncidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadIncidents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getIncidents();
      setIncidents(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const handleMute = async (key, hours) => {
    try {
      await analyticsService.muteIncident(key, hours);
      loadIncidents();
    } catch (err) {
      alert('Помилка: ' + err.message);
    }
  };

  const handleResolve = async (key) => {
    try {
      await analyticsService.resolveIncident(key);
      loadIncidents();
    } catch (err) {
      alert('Помилка: ' + err.message);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'WARN': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getSeverityLabel = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'Критичний';
      case 'WARN': return 'Попередження';
      default: return 'Інфо';
    }
  };

  const getTypeIcon = (type) => {
    if (type.includes('FRAUD')) return <Shield className="w-5 h-5 text-red-500" />;
    if (type.includes('KPI')) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <Bell className="w-5 h-5 text-blue-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="guard-incidents">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">Інциденти безпеки</h1>
        </div>
        <button
          onClick={loadIncidents}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          data-testid="refresh-incidents"
        >
          <RefreshCw className="w-4 h-4" />
          Оновити
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {incidents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Все гаразд</h3>
          <p className="text-gray-500">Активних інцидентів немає</p>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((inc) => (
            <div 
              key={inc.key} 
              className={`bg-white rounded-xl shadow-sm p-6 border-l-4 ${
                inc.status === 'MUTED' ? 'border-l-gray-400 opacity-75' : 
                inc.severity === 'CRITICAL' ? 'border-l-red-500' : 'border-l-yellow-500'
              }`}
              data-testid={`incident-${inc.key}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {getTypeIcon(inc.type)}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{inc.title}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full border ${getSeverityColor(inc.severity)}`}>
                        {getSeverityLabel(inc.severity)}
                      </span>
                      {inc.status === 'MUTED' && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                          Заглушено
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{inc.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>Тип: {inc.type}</span>
                      <span>Сутність: {inc.entity}</span>
                      <span>Створено: {inc.created_at?.slice(0, 16)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMute(inc.key, 1)}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                    title="Заглушити на 1 годину"
                  >
                    <BellOff className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleResolve(inc.key)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                    title="Вирішено"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Дії */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleMute(inc.key, 1)}
                  className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Заглушити 1 год
                </button>
                <button
                  onClick={() => handleMute(inc.key, 24)}
                  className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Заглушити 24 год
                </button>
                <button
                  onClick={() => handleResolve(inc.key)}
                  className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                >
                  Вирішено
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GuardIncidents;
