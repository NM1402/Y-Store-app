import React, { useEffect, useState } from 'react';
import { DollarSign, CreditCard, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import { useLanguage } from '../../contexts/LanguageContext';

const PayoutsTab = () => {
  const { t } = useLanguage();
  const [balance, setBalance] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    account_number: '',
    account_name: '',
    bank_name: '',
    email: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [balanceRes, payoutsRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/seller/balance`, config),
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/seller/payouts`, config)
      ]);

      setBalance(balanceRes.data);
      setPayouts(payoutsRes.data);
    } catch (error) {
      console.error('Failed to fetch payouts data:', error);
      toast.error('Ошибка загрузки данных');
    }
  };

  const handleRequestPayout = async (e) => {
    e.preventDefault();
    
    if (parseFloat(formData.amount) > balance.available_balance) {
      toast.error('Недостаточно средств');
      return;
    }

    if (parseFloat(formData.amount) < 50) {
      toast.error('Минимальная сумма вывода: $50');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const paymentDetails = formData.payment_method === 'bank_transfer'
        ? {
            account_number: formData.account_number,
            account_name: formData.account_name,
            bank_name: formData.bank_name
          }
        : { email: formData.email };

      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/seller/payouts`,
        {
          amount: parseFloat(formData.amount),
          payment_method: formData.payment_method,
          payment_details: paymentDetails
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Заявка на вывод создана');
      setShowRequestForm(false);
      setFormData({
        amount: '',
        payment_method: 'bank_transfer',
        account_number: '',
        account_name: '',
        bank_name: '',
        email: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка создания заявки');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    };

    const labels = {
      pending: 'Ожидает',
      processing: 'В обработке',
      completed: 'Выполнено',
      rejected: 'Отклонено'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-blue-100 mb-2">Доступно для вывода</p>
            <p className="text-5xl font-bold">
              ${balance?.available_balance?.toLocaleString() || '0.00'}
            </p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <DollarSign className="w-8 h-8" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-blue-400/30">
          <div>
            <p className="text-blue-100 text-sm">Общий доход</p>
            <p className="text-xl font-bold">${balance?.total_revenue?.toLocaleString() || '0'}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Комиссия (10%)</p>
            <p className="text-xl font-bold">${balance?.commission?.toLocaleString() || '0'}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Выплачено</p>
            <p className="text-xl font-bold">${balance?.total_paid?.toLocaleString() || '0'}</p>
          </div>
        </div>

        <Button
          onClick={() => setShowRequestForm(!showRequestForm)}
          className="mt-6 bg-white text-blue-600 hover:bg-blue-50"
          disabled={!balance || balance.available_balance < 50}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Запросить вывод средств
        </Button>

        {balance && balance.available_balance < 50 && (
          <div className="mt-4 flex items-start gap-2 text-blue-100 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <p>Минимальная сумма для вывода: $50</p>
          </div>
        )}
      </div>

      {/* Request Form */}
      {showRequestForm && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-xl font-bold mb-4">Запрос на вывод средств</h3>
          <form onSubmit={handleRequestPayout} className="space-y-4">
            <div>
              <Label>Сумма</Label>
              <Input
                type="number"
                min="50"
                max={balance?.available_balance}
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                placeholder={t('enterAmount')}
              />
              <p className="text-sm text-gray-500 mt-1">
                Доступно: ${balance?.available_balance?.toFixed(2)}
              </p>
            </div>

            <div>
              <Label>Способ оплаты</Label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="bank_transfer">Банковский перевод</option>
                <option value="paypal">PayPal</option>
                <option value="stripe">Stripe</option>
              </select>
            </div>

            {formData.payment_method === 'bank_transfer' ? (
              <>
                <div>
                  <Label>Номер счета</Label>
                  <Input
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    required
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <Label>Имя владельца счета</Label>
                  <Input
                    value={formData.account_name}
                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                    required
                    placeholder="Иван Иванов"
                  />
                </div>
                <div>
                  <Label>Название банка</Label>
                  <Input
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    required
                    placeholder="ПриватБанк"
                  />
                </div>
              </>
            ) : (
              <div>
                <Label>Email {formData.payment_method === 'paypal' ? 'PayPal' : 'Stripe'}</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="email@example.com"
                />
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Отправка...' : 'Отправить заявку'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowRequestForm(false)}>
                Отмена
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Payouts History */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-xl font-bold mb-4">История выплат</h3>
        <div className="space-y-4">
          {payouts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Нет выплат</p>
          ) : (
            payouts.map((payout) => (
              <div key={payout.id} className="p-4 border border-gray-200 rounded-xl flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <p className="font-bold text-lg">${payout.amount.toFixed(2)}</p>
                    {getStatusBadge(payout.status)}
                  </div>
                  <p className="text-sm text-gray-600">
                    {payout.payment_method === 'bank_transfer' ? 'Банковский перевод' :
                     payout.payment_method === 'paypal' ? 'PayPal' : 'Stripe'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(payout.created_at).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PayoutsTab;
