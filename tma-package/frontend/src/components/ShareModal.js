import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Share Modal Component
 * Allows sharing product links to social media
 */
const ShareModal = ({ isOpen, onClose, product }) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !product) return null;

  const siteUrl = process.env.REACT_APP_SITE_URL || window.location.origin;
  const productUrl = `${siteUrl}/product/${product.id}`;
  const productTitle = product.title || '';
  const productImage = product.images?.[0] || '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      toast.success(t('language') === 'ru' ? 'Ссылка скопирована!' : 'Посилання скопійовано!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error(t('language') === 'ru' ? 'Не удалось скопировать' : 'Не вдалося скопіювати');
    }
  };

  const shareLinks = [
    {
      name: 'Telegram',
      icon: '📱',
      color: 'from-blue-400 to-blue-600',
      url: `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(productTitle)}`,
    },
    {
      name: 'WhatsApp',
      icon: '💬',
      color: 'from-green-400 to-green-600',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(productTitle + ' ' + productUrl)}`,
    },
    {
      name: 'Facebook',
      icon: '📘',
      color: 'from-blue-600 to-blue-800',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`,
    },
    {
      name: 'Twitter',
      icon: '🐦',
      color: 'from-sky-400 to-sky-600',
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(productTitle)}`,
    },
    {
      name: 'Viber',
      icon: '💜',
      color: 'from-purple-500 to-purple-700',
      url: `viber://forward?text=${encodeURIComponent(productTitle + ' ' + productUrl)}`,
    },
    {
      name: 'LinkedIn',
      icon: '💼',
      color: 'from-blue-700 to-blue-900',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(productUrl)}`,
    },
  ];

  const handleShare = (url) => {
    window.open(url, '_blank', 'width=600,height=600');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t('language') === 'ru' ? 'Поделиться товаром' : 'Поділитися товаром'}
            </h2>
            <p className="text-blue-100 text-sm">
              {t('language') === 'ru' ? 'Выберите способ' : 'Оберіть спосіб'}
            </p>
          </div>

          {/* Product Preview */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <img
                src={productImage || '/placeholder-product.png'}
                alt={productTitle}
                className="w-20 h-20 object-cover rounded-xl"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
                  {productTitle}
                </h3>
                <p className="text-sm text-gray-500 truncate">
                  {productUrl}
                </p>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              {shareLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => handleShare(link.url)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 transition-all hover:scale-105 active:scale-95"
                >
                  <div className={`w-14 h-14 bg-gradient-to-br ${link.color} rounded-full flex items-center justify-center text-2xl shadow-lg`}>
                    {link.icon}
                  </div>
                  <span className="text-xs font-medium text-gray-700">
                    {link.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Copy Link */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">
                {t('language') === 'ru' ? 'Или скопируйте ссылку:' : 'Або скопіюйте посилання:'}
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={productUrl}
                  readOnly
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm bg-gray-50 focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                  }`}
                >
                  {copied ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShareModal;
