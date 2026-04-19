import React from 'react';
import { Truck, CreditCard, Package, CheckCircle, Clock } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';

const DeliveryPayment = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <ScrollReveal animation="fadeInUp">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                <Truck className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Доставка і оплата
            </h1>
            <p className="text-xl text-gray-600">
              Швидка доставка по всій Україні та зручні способи оплати
            </p>
          </div>
        </ScrollReveal>

        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 md:p-12 space-y-10">
          {/* Delivery Section */}
          <ScrollReveal animation="fadeInUp">
            <section className="border-l-4 border-blue-600 pl-6">
              <h2 className="text-4xl font-extrabold text-gray-900 mb-8 flex items-center gap-3">
                <span className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center text-white">
                  <Truck className="w-6 h-6" />
                </span>
                Доставка
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Nova Poshta */}
                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border-2 border-red-200 hover:shadow-xl transition-all">
                  <h3 className="text-2xl font-bold text-red-900 mb-4 flex items-center gap-2">
                    <Package className="w-6 h-6" />
                    Нова Пошта
                  </h3>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                      <span>Доставка у відділення або поштомат</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                      <span>Кур'єрська доставка за адресою</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                      <span className="font-semibold">Термін: 1-3 дні по Україні</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CreditCard className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                      <span className="font-semibold">Вартість: згідно тарифів Нової Пошти</span>
                    </li>
                  </ul>
                </div>

                {/* Ukrposhta */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200 hover:shadow-xl transition-all">
                  <h3 className="text-2xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <Package className="w-6 h-6" />
                    Укрпошта
                  </h3>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                      <span>Доставка у відділення</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                      <span className="font-semibold">Термін: 3-7 днів</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CreditCard className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                      <span className="font-semibold">Вартість: згідно тарифів Укрпошти</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Free Delivery Banner */}
              <div className="mt-6 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white text-center">
                <p className="text-2xl font-extrabold">🎉 Безкоштовна доставка при замовленні від 2000 грн!</p>
              </div>
            </section>
          </ScrollReveal>

          {/* Payment Section */}
          <ScrollReveal animation="fadeInUp" delay={100}>
            <section className="border-l-4 border-purple-600 pl-6">
              <h2 className="text-4xl font-extrabold text-gray-900 mb-8 flex items-center gap-3">
                <span className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white">
                  <CreditCard className="w-6 h-6" />
                </span>
                Оплата
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Cash on Delivery */}
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border-2 border-yellow-200 hover:shadow-xl transition-all">
                  <h3 className="text-2xl font-bold text-yellow-900 mb-4">💵 Готівкою при отриманні</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Оплата готівкою при отриманні товару у відділенні Нової Пошти або Укрпошти.
                  </p>
                  <div className="bg-yellow-100 rounded-xl p-4">
                    <p className="text-yellow-900 font-semibold">⚠️ Комісія служби доставки: 20 грн + 2% від суми</p>
                  </div>
                </div>

                {/* Card Payment */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200 hover:shadow-xl transition-all">
                  <h3 className="text-2xl font-bold text-blue-900 mb-4">💳 Оплата карткою онлайн</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Безпечна оплата банківською карткою через платіжну систему.
                  </p>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span>Visa / MasterCard</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span>Безпечна транзакція</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span>Без комісії</span>
                    </li>
                  </ul>
                </div>

                {/* LiqPay */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200 hover:shadow-xl transition-all">
                  <h3 className="text-2xl font-bold text-purple-900 mb-4">📱 LiqPay</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Швидка оплата через LiqPay (картка, Apple Pay, Google Pay).
                  </p>
                </div>
              </div>
            </section>
          </ScrollReveal>

          {/* Important Info */}
          <ScrollReveal animation="scaleIn">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white">
              <h3 className="text-3xl font-extrabold mb-6 text-center">📋 Важлива інформація</h3>
              <ul className="space-y-4 text-lg">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 mt-1 flex-shrink-0" />
                  <span>Відправка замовлень здійснюється протягом 1-2 робочих днів після підтвердження</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 mt-1 flex-shrink-0" />
                  <span>При отриманні обов'язково перевірте товар у присутності кур'єра</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 mt-1 flex-shrink-0" />
                  <span>Зберігайте упаковку та документи для можливого обміну чи повернення</span>
                </li>
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
};

export default DeliveryPayment;
