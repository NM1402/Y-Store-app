/**
 * SupportDashboard - Admin Support Tickets Management
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MessageSquare, Clock, CheckCircle, XCircle, Send, RefreshCw, User, Mail, Phone, ExternalLink } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const STATUS_CONFIG = {
  new: { label: 'Новий', color: 'bg-blue-100 text-blue-700', icon: MessageSquare },
  in_progress: { label: 'В роботі', color: 'bg-amber-100 text-amber-700', icon: Clock },
  resolved: { label: 'Вирішено', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  closed: { label: 'Закрито', color: 'bg-gray-100 text-gray-600', icon: XCircle },
};

const CATEGORIES = {
  order: { name: "Питання по замовленню", icon: "📦" },
  payment: { name: "Оплата та повернення", icon: "💳" },
  delivery: { name: "Доставка", icon: "🚚" },
  product: { name: "Питання по товару", icon: "🏷️" },
  technical: { name: "Технічні проблеми", icon: "⚙️" },
  other: { name: "Інше", icon: "💬" },
};

export default function SupportDashboard() {
  const { token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ new: 0, in_progress: 0, resolved: 0, closed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState('all');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${API_URL}/api/support/admin/tickets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/support/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/support/admin/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchTickets();
        fetchStats();
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket(prev => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/support/admin/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: replyText.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(prev => ({
          ...prev,
          replies: [...(prev.replies || []), data.reply],
          status: 'in_progress'
        }));
        setReplyText('');
        fetchTickets();
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  };

  const filteredTickets = filter === 'all' 
    ? tickets 
    : tickets.filter(t => t.status === filter);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('uk-UA', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6" data-testid="support-dashboard">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <div 
            key={key}
            onClick={() => setFilter(key)}
            className={`p-4 rounded-2xl cursor-pointer transition-all hover:scale-105 ${
              filter === key ? 'ring-2 ring-blue-500 shadow-lg' : 'shadow'
            } ${config.color}`}
          >
            <config.icon className="w-6 h-6 mb-2" />
            <div className="text-2xl font-bold">{stats[key] || 0}</div>
            <div className="text-sm">{config.label}</div>
          </div>
        ))}
        <div 
          onClick={() => setFilter('all')}
          className={`p-4 rounded-2xl cursor-pointer transition-all hover:scale-105 bg-purple-100 text-purple-700 ${
            filter === 'all' ? 'ring-2 ring-purple-500 shadow-lg' : 'shadow'
          }`}
        >
          <MessageSquare className="w-6 h-6 mb-2" />
          <div className="text-2xl font-bold">{stats.total || 0}</div>
          <div className="text-sm">Всього</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets List */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-lg">Тикети підтримки</h3>
            <button
              onClick={() => { fetchTickets(); fetchStats(); }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <div className="max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Завантаження...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Немає тикетів</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredTickets.map((ticket) => {
                  const statusConf = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.new;
                  const categoryConf = CATEGORIES[ticket.category] || CATEGORIES.other;
                  
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedTicket?.id === ticket.id ? 'bg-blue-50' : ''
                      }`}
                      data-testid={`ticket-item-${ticket.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{categoryConf.icon}</span>
                          <span className="font-semibold text-gray-800 truncate max-w-[200px]">
                            {ticket.subject}
                          </span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConf.color}`}>
                          {statusConf.label}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mb-1">
                        {ticket.user_name} • {ticket.user_email}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDate(ticket.created_at)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Ticket Detail */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {selectedTicket ? (
            <>
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">{selectedTicket.subject}</h3>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border-0 cursor-pointer ${
                      STATUS_CONFIG[selectedTicket.status]?.color || 'bg-gray-100'
                    }`}
                    data-testid="ticket-status-select"
                  >
                    <option value="new">Новий</option>
                    <option value="in_progress">В роботі</option>
                    <option value="resolved">Вирішено</option>
                    <option value="closed">Закрито</option>
                  </select>
                </div>
                
                {/* User Info */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-3">
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span>{selectedTicket.user_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4" />
                    <span>{selectedTicket.user_email}</span>
                  </div>
                  {selectedTicket.contact_telegram && (
                    <a 
                      href={`https://t.me/${selectedTicket.contact_telegram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      TG: {selectedTicket.contact_telegram}
                    </a>
                  )}
                  {selectedTicket.contact_viber && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-4 h-4" />
                      Viber: {selectedTicket.contact_viber}
                    </div>
                  )}
                </div>

                <div className="mt-2 text-xs text-gray-400">
                  Категорія: {CATEGORIES[selectedTicket.category]?.icon} {CATEGORIES[selectedTicket.category]?.name}
                </div>
              </div>

              {/* Messages */}
              <div className="p-4 max-h-[300px] overflow-y-auto space-y-4">
                {/* Original message */}
                <div className="bg-gray-100 rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-2">
                    {formatDate(selectedTicket.created_at)} — Користувач
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap">{selectedTicket.message}</p>
                </div>

                {/* Replies */}
                {(selectedTicket.replies || []).map((reply, idx) => (
                  <div key={reply.id || idx} className="bg-blue-50 rounded-xl p-4 ml-4">
                    <div className="text-xs text-blue-600 mb-2">
                      {formatDate(reply.created_at)} — {reply.admin_name || 'Адмін'}
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap">{reply.message}</p>
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleReply} className="p-4 border-t border-gray-100">
                <div className="flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Напишіть відповідь..."
                    rows={3}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                    data-testid="ticket-reply-input"
                  />
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    type="submit"
                    disabled={!replyText.trim() || sending}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="ticket-reply-btn"
                  >
                    <Send className="w-4 h-4" />
                    {sending ? 'Надсилання...' : 'Відповісти'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Оберіть тикет зі списку</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
