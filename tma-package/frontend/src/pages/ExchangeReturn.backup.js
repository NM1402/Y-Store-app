import React from 'react';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const ExchangeReturn = () => {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-center">
          {language === 'ru' ? 'Обмен и возврат' : 'Обмін та повернення'}
        </h1>

        <div className="bg-white rounded-2xl shadow-sm p-8 mb-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <RefreshCw className="w-8 h-8 text-blue-600" />
            {language === 'ru' ? 'Условия возврата' : 'Умови повернення'}
          </h2>
          <p className="text-gray-700 mb-4">
            {language === 'ru'
              ? 'Вы можете вернуть товар надлежащего качества в течение 14 дней с момента получения согласно Закону Украины "О защите прав потребителей".'
              : 'Ви можете повернути товар належної якості протягом 14 днів з моменту отримання згідно Закону України "Про захист прав споживачів".'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8 mb-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            {language === 'ru' ? 'Можно вернуть:' : 'Можна повернути:'}
          </h3>
          <ul className="space-y-2 text-gray-700">
            <li>✓ {language === 'ru' ? 'Товар не был в использовании' : 'Товар не був у використанні'}</li>
            <li>✓ {language === 'ru' ? 'Сохранена упаковка и товарный вид' : 'Збережено упаковку та товарний вигляд'}</li>
            <li>✓ {language === 'ru' ? 'Есть чек или другое подтверждение покупки' : 'Є чек або інше підтвердження покупки'}</li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <XCircle className="w-6 h-6 text-red-600" />
            {language === 'ru' ? 'Не подлежат возврату:' : 'Не підлягають поверненню:'}
          </h3>
          <ul className="space-y-2 text-gray-700">
            <li>✗ {language === 'ru' ? 'Товары личной гигиены' : 'Товари особистої гігієни'}</li>
            <li>✗ {language === 'ru' ? 'Нижнее белье и носки' : 'Нижня білизна та шкарпетки'}</li>
            <li>✗ {language === 'ru' ? 'Товары со следами использования' : 'Товари зі слідами використання'}</li>
          </ul>
        </div>

        <div className="mt-8 p-6 bg-blue-50 rounded-2xl text-center">
          <p className="text-gray-700">
            {language === 'ru'
              ? 'По вопросам возврата звоните: '
              : 'З питань повернення телефонуйте: '}
            <a href="tel:+380502474161" className="font-bold text-blue-600 hover:underline">050-247-41-61</a>
            {' '}або{' '}
            <a href="tel:+380637247703" className="font-bold text-blue-600 hover:underline">063-724-77-03</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExchangeReturn;