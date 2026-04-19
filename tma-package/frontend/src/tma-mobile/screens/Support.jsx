/**
 * Support Screen - Підтримка користувачів
 * Форма звернення з відправкою в Telegram
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Send, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api-client';
import telegram from '../lib/telegram-sdk';
import TopBar from '../components/TopBar';
import Page from '../components/Page';
import './Support.css';

export default function Support() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => {
    loadMyTickets();
  }, []);

  const loadMyTickets = async () => {
    try {
      const data = await api.get('/tma/support/my-tickets');
      setMyTickets(data.tickets || []);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!subject.trim() || !message.trim()) {
      toast.error('Заповніть тему та повідомлення');
      return;
    }

    setLoading(true);
    telegram.haptic('medium');

    try {
      const response = await api.post('/tma/support/ticket', {
        subject: subject.trim(),
        message: message.trim(),
        contact_info: contactInfo.trim() || null,
      });

      toast.success(response.message || 'Звернення надіслано!');
      
      // Clear form
      setSubject('');
      setMessage('');
      setContactInfo('');
      
      // Reload tickets
      loadMyTickets();
    } catch (error) {
      console.error('Failed to submit ticket:', error);
      toast.error('Помилка відправки. Спробуйте ще раз.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      new: { label: 'Нове', color: '#FFA500' },
      in_progress: { label: 'В обробці', color: '#0EA5A4' },
      resolved: { label: 'Вирішено', color: '#10B981' },
      closed: { label: 'Закрито', color: '#6B7280' },
    };
    
    const badge = badges[status] || badges.new;
    
    return (
      <span 
        className="support__ticket-status" 
        style={{ color: badge.color }}
      >
        {badge.label}
      </span>
    );
  };

  return (
    <Page>
      <div className="tma-page">
        <TopBar title="Підтримка" showBack onBack={() => navigate(-1)} />
        <div className="tma-page-content">
          <div className="support">
            {/* Header */}
            <div className="support__header">
              <div className="support__header-icon">
                <MessageCircle size={32} />
              </div>
              <h2 className="support__header-title">Зв'яжіться з нами</h2>
              <p className="support__header-desc">
                Опишіть вашу проблему, і ми відповімо найближчим часом
              </p>
            </div>

            {/* Contact Form */}
            <form className="support__form" onSubmit={handleSubmit}>
              <div className="support__field">
                <label className="support__label">Тема звернення</label>
                <input
                  type="text"
                  className="support__input"
                  placeholder="Наприклад: Питання про замовлення"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div className="support__field">
                <label className="support__label">Повідомлення</label>
                <textarea
                  className="support__textarea"
                  placeholder="Опишіть детально вашу ситуацію..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  maxLength={1000}
                  required
                />
                <div className="support__char-count">
                  {message.length} / 1000
                </div>
              </div>

              <div className="support__field">
                <label className="support__label">Контакт для зв'язку (необов'язково)</label>
                <input
                  type="text"
                  className="support__input"
                  placeholder="Email або телефон"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  maxLength={100}
                />
              </div>

              <button 
                type="submit" 
                className="support__submit-btn"
                disabled={loading}
              >
                {loading ? (
                  'Надсилається...'
                ) : (
                  <>
                    <Send size={18} />
                    <span>Надіслати звернення</span>
                  </>
                )}
              </button>
            </form>

            {/* My Tickets */}
            {!loadingTickets && myTickets.length > 0 && (
              <div className="support__section">
                <h3 className="support__section-title">Мої звернення</h3>
                
                <div className="support__tickets">
                  {myTickets.map((ticket) => (
                    <div key={ticket.id} className="support__ticket-card">
                      <div className="support__ticket-header">
                        <span className="support__ticket-subject">{ticket.subject}</span>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <p className="support__ticket-message">
                        {ticket.message.length > 100 
                          ? `${ticket.message.slice(0, 100)}...` 
                          : ticket.message
                        }
                      </p>
                      <div className="support__ticket-footer">
                        <div className="support__ticket-date">
                          <Clock size={14} />
                          <span>{new Date(ticket.created_at).toLocaleDateString('uk-UA')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="support__info-card">
              <h4 className="support__info-title">Інші способи зв'язку</h4>
              <div className="support__info-list">
                <div className="support__info-item">
                  <strong>Телефон:</strong> +380 (50) 247-41-61
                </div>
                <div className="support__info-item">
                  <strong>Телефон:</strong> +380 (63) 724-77-03
                </div>
                <div className="support__info-item">
                  <strong>Email:</strong> support@y-store.in.ua
                </div>
                <div className="support__info-item">
                  <strong>Адреса:</strong> проспект Миколи Бажана, 24/1, Київ, 02149
                </div>
                <div className="support__info-item">
                  <strong>Час роботи:</strong> Пн-Пт: 9:00-18:00, Сб: 10:00-17:00
                </div>
                <div className="support__info-item" style={{ fontStyle: 'italic', fontSize: '13px' }}>
                  Неділя - Вихідний
                </div>
                <div className="support__info-item" style={{ fontStyle: 'italic', fontSize: '13px', marginTop: '8px' }}>
                  Відповідаємо протягом 24 годин
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
