/**
 * SupportModal - Customer Support Ticket Form
 * Opens modal for submitting support tickets
 */
import React, { useState, useEffect } from 'react';
import { X, Send, AlertCircle, CheckCircle, HelpCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const CATEGORIES = [
  { id: "order", name_uk: "Питання по замовленню", name_ru: "Вопрос по заказу", icon: "📦" },
  { id: "payment", name_uk: "Оплата та повернення", name_ru: "Оплата и возврат", icon: "💳" },
  { id: "delivery", name_uk: "Доставка", name_ru: "Доставка", icon: "🚚" },
  { id: "product", name_uk: "Питання по товару", name_ru: "Вопрос о товаре", icon: "🏷️" },
  { id: "technical", name_uk: "Технічні проблеми", name_ru: "Технические проблемы", icon: "⚙️" },
  { id: "other", name_uk: "Інше", name_ru: "Другое", icon: "💬" },
];

export default function SupportModal({ isOpen, onClose }) {
  const { user, token } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const L = language;

  const [step, setStep] = useState('category'); // category, form, success
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [contactTelegram, setContactTelegram] = useState('');
  const [contactViber, setContactViber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep('category');
      setCategory('');
      setSubject('');
      setMessage('');
      setError('');
    }
  }, [isOpen]);

  const t = (uk, ru) => L === 'uk' ? uk : ru;

  const texts = {
    title: t("Підтримка", "Поддержка"),
    selectCategory: t("Оберіть тему звернення", "Выберите тему обращения"),
    subject: t("Тема", "Тема"),
    subjectPlaceholder: t("Коротко опишіть питання", "Кратко опишите вопрос"),
    message: t("Повідомлення", "Сообщение"),
    messagePlaceholder: t("Детально опишіть вашу проблему або питання...", "Подробно опишите вашу проблему или вопрос..."),
    contactInfo: t("Контактна інформація (необов'язково)", "Контактная информация (необязательно)"),
    telegram: t("Telegram (для швидкого зв'язку)", "Telegram (для быстрой связи)"),
    viber: t("Viber", "Viber"),
    send: t("Відправити", "Отправить"),
    back: t("Назад", "Назад"),
    successTitle: t("Дякуємо за звернення!", "Спасибо за обращение!"),
    successText: t("Ваш запит прийнято. Ми зв'яжемося з вами найближчим часом.", "Ваш запрос принят. Мы свяжемся с вами в ближайшее время."),
    close: t("Закрити", "Закрыть"),
    loginRequired: t("Для відправки повідомлення необхідно увійти в акаунт", "Для отправки сообщения необходимо войти в аккаунт"),
    login: t("Увійти", "Войти"),
  };

  const handleCategorySelect = (catId) => {
    setCategory(catId);
    setStep('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError(t("Заповніть всі обов'язкові поля", "Заполните все обязательные поля"));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          message: message.trim(),
          contact_telegram: contactTelegram.trim() || null,
          contact_viber: contactViber.trim() || null
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Error creating ticket');
      }

      setStep('success');
    } catch (err) {
      setError(err.message || t("Помилка при відправці", "Ошибка при отправке"));
    } finally {
      setLoading(false);
    }
  };

  const handleLoginClick = () => {
    onClose();
    navigate('/login');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl"
        data-testid="support-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{texts.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            data-testid="support-modal-close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {/* Not logged in */}
          {!user && (
            <div className="text-center py-8">
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-6">{texts.loginRequired}</p>
              <button
                onClick={handleLoginClick}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                data-testid="support-login-btn"
              >
                {texts.login}
              </button>
            </div>
          )}

          {/* Category Selection */}
          {user && step === 'category' && (
            <div>
              <p className="text-gray-600 mb-4">{texts.selectCategory}</p>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id)}
                    className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                    data-testid={`support-category-${cat.id}`}
                  >
                    <span className="text-2xl mb-2 block">{cat.icon}</span>
                    <span className="font-medium text-gray-800 group-hover:text-blue-600">
                      {L === 'uk' ? cat.name_uk : cat.name_ru}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          {user && step === 'form' && (
            <form onSubmit={handleSubmit}>
              {/* Selected category */}
              <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-xl">
                <span className="text-xl">
                  {CATEGORIES.find(c => c.id === category)?.icon}
                </span>
                <span className="font-medium text-blue-700">
                  {L === 'uk' 
                    ? CATEGORIES.find(c => c.id === category)?.name_uk 
                    : CATEGORIES.find(c => c.id === category)?.name_ru}
                </span>
                <button
                  type="button"
                  onClick={() => setStep('category')}
                  className="ml-auto text-sm text-blue-600 hover:underline"
                >
                  {texts.back}
                </button>
              </div>

              {/* Subject */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {texts.subject} *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={texts.subjectPlaceholder}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  data-testid="support-subject-input"
                  required
                  minLength={5}
                  maxLength={200}
                />
              </div>

              {/* Message */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {texts.message} *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={texts.messagePlaceholder}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                  data-testid="support-message-input"
                  required
                  minLength={10}
                  maxLength={2000}
                />
              </div>

              {/* Contact Info */}
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-3">{texts.contactInfo}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      value={contactTelegram}
                      onChange={(e) => setContactTelegram(e.target.value)}
                      placeholder={texts.telegram}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      data-testid="support-telegram-input"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={contactViber}
                      onChange={(e) => setContactViber(e.target.value)}
                      placeholder={texts.viber}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      data-testid="support-viber-input"
                    />
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="support-submit-btn"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {texts.send}
                  </>
                )}
              </button>
            </form>
          )}

          {/* Success */}
          {user && step === 'success' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{texts.successTitle}</h3>
              <p className="text-gray-600 mb-6">{texts.successText}</p>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                data-testid="support-success-close"
              >
                {texts.close}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
