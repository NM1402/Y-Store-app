import React, { useEffect, useState } from 'react';
import { DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const PayoutsDashboard = () => {
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchPendingPayouts();
  }, []);

  const fetchPendingPayouts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/payouts/pending`,
        config
      );

      setPendingPayouts(response.data);
    } catch (error) {
      console.error('Failed to fetch pending payouts:', error);
      toast.error('Ошибка загрузки выплат');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayout = async (payoutId, status) => {
    try {
      setProcessing(payoutId);
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/payouts/${payoutId}/process?status=${status}`,
        {},
        config
      );

      toast.success(
        status === 'completed' 
          ? 'Выплата подтверждена!' 
          : 'Выплата отклонена'
      );

      // Refresh the list
      fetchPendingPayouts();
    } catch (error) {
      console.error('Failed to process payout:', error);
      toast.error('Ошибка обработки выплаты');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'Ожидает' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-800', icon: AlertCircle, label: 'В процессе' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Завершено' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Отклонено' }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  const getPaymentMethodLabel = (method) => {
    const methods = {
      bank_transfer: 'Банківський переказ',
      paypal: 'PayPal',
      stripe: 'Stripe',
      card: 'Банківська картка'
    };
    return methods[method] || method;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Ожидают обработки</p>
              <p className="text-3xl font-bold">{pendingPayouts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Общая сумма</p>
              <p className="text-3xl font-bold">
                ${pendingPayouts.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Средняя выплата</p>
              <p className="text-3xl font-bold">
                ${pendingPayouts.length > 0 
                  ? (pendingPayouts.reduce((sum, p) => sum + p.amount, 0) / pendingPayouts.length).toFixed(0)
                  : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Payouts Table */}
      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold">Заявки на выплаты</h2>
          <p className="text-gray-600 mt-1">Обработайте запросы продавцов на вывод средств</p>
        </div>

        {pendingPayouts.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Нет ожидающих выплат</h3>
            <p className="text-gray-500">Все запросы на выплаты обработаны</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Продавец</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Email</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Сумма</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Метод</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Реквизиты</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Дата</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-gray-700">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingPayouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{payout.seller_name || 'Unknown'}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-600">{payout.seller_email}</div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="font-bold text-green-600 text-lg">
                        ${payout.amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-medium text-gray-700">
                        {getPaymentMethodLabel(payout.payment_method)}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-600 max-w-xs">
                        {Object.entries(payout.payment_details || {}).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {value}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-600">
                        {new Date(payout.created_at).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleProcessPayout(payout.id, 'completed')}
                          disabled={processing === payout.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processing === payout.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Одобрить
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleProcessPayout(payout.id, 'rejected')}
                          disabled={processing === payout.id}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Отклонить
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Block */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-blue-900 mb-2">Информация о выплатах</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Комиссия платформы: 10% от каждой продажи</li>
              <li>• Минимальная сумма для вывода: $50</li>
              <li>• Срок обработки: 1-3 рабочих дня</li>
              <li>• Проверяйте реквизиты продавца перед подтверждением</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayoutsDashboard;
