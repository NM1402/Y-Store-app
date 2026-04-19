import React from 'react';
import { RotateCcw, CheckCircle, XCircle, AlertTriangle, Phone, Mail, MapPin } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';

const ExchangeReturn = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <ScrollReveal animation="fadeInUp">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                <RotateCcw className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Обмін та повернення
            </h1>
            <p className="text-xl text-gray-600">
              Ваші права захищені законом
            </p>
          </div>
        </ScrollReveal>

        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 md:p-12 space-y-10">
          {/* Legal Info */}
          <ScrollReveal animation="fadeInUp">
            <section className="border-l-4 border-blue-600 pl-6">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border-2 border-blue-200">
                <p className="text-gray-700 text-lg leading-relaxed">
                  Відповідно до Закону України "Про захист прав споживачів", Покупець має право повернути або обміняти товар належної якості протягом <strong>14 календарних днів</strong> з моменту отримання товару, не рахуючи дня покупки.
                </p>
              </div>
            </section>
          </ScrollReveal>

          {/* Important Notice */}
          <ScrollReveal animation="fadeInUp" delay={100}>
            <section className="border-l-4 border-orange-600 pl-6">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-orange-600" />
                Важливо
              </h2>
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-8 border-2 border-orange-200">
                <p className="text-gray-700 text-lg leading-relaxed">
                  Згідно з чинним законодавством України, <strong>не підлягають поверненню</strong> товари належної якості, що входять до переліку товарів, які не підлягають обміну (наприклад: засоби особистої гігієни, білизна, парфумерія тощо).
                </p>
              </div>
            </section>
          </ScrollReveal>

          {/* Steps */}
          <ScrollReveal animation="fadeInUp" delay={150}>
            <section className="border-l-4 border-green-600 pl-6">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-8">Як повернути товар?</h2>
              
              <div className="space-y-6">
                {/* Step 1 */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border-l-4 border-blue-600">
                  <h3 className="text-2xl font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <span className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
                    Зв'яжіться з нами
                  </h3>
                  <div className="flex flex-wrap gap-4 text-gray-700">
                    <a href="tel:+380502474161" className="flex items-center gap-2 text-blue-600 font-semibold hover:underline">
                      <Phone className="w-5 h-5" />
                      050-247-41-61
                    </a>
                    <a href="tel:+380637247703" className="flex items-center gap-2 text-blue-600 font-semibold hover:underline">
                      <Phone className="w-5 h-5" />
                      063-724-77-03
                    </a>
                    <a href="mailto:support@y-store.in.ua" className="flex items-center gap-2 text-blue-600 font-semibold hover:underline">
                      <Mail className="w-5 h-5" />
                      support@y-store.in.ua
                    </a>
                  </div>
                </div>

                {/* Step 2 - skipped as per original doc (Крок 2 missing) */}

                {/* Step 3 */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border-l-4 border-green-600">
                  <h3 className="text-2xl font-bold text-green-900 mb-3 flex items-center gap-2">
                    <span className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
                    Надішліть товар
                  </h3>
                  <p className="text-gray-700 text-lg mb-4">
                    Надішліть товар на нашу адресу через Нову Пошту (вартість доставки оплачує покупець)
                  </p>
                  <div className="bg-white rounded-xl p-4 border border-green-200">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-6 h-6 text-green-600 mt-1" />
                      <div className="text-gray-700">
                        <p className="font-semibold">м. Київ НП 23</p>
                        <p>просп. М. Бажана, 24/1</p>
                        <p>ФОП Тищенко Олександр Миколайович</p>
                        <p className="font-semibold text-green-700">380637247703</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border-l-4 border-purple-600">
                  <h3 className="text-2xl font-bold text-purple-900 mb-3 flex items-center gap-2">
                    <span className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">3</span>
                    Отримайте кошти
                  </h3>
                  <p className="text-gray-700 text-lg mb-4">
                    Повернення коштів здійснюється протягом <strong>7 робочих днів</strong> з моменту отримання та перевірки товару продавцем.
                  </p>
                  <p className="text-gray-700 text-lg">
                    Грошові кошти повертаються тим самим способом, яким була здійснена оплата, або іншим способом за погодженням сторін.
                  </p>
                </div>
              </div>
            </section>
          </ScrollReveal>

          {/* Return Conditions */}
          <ScrollReveal animation="fadeInUp" delay={200}>
            <section className="border-l-4 border-gray-400 pl-6">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-6">Умови повернення</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-green-50 rounded-2xl p-6 hover:shadow-lg transition-all">
                  <h4 className="font-bold text-green-900 mb-4 flex items-center gap-2 text-xl">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    Товар можна повернути, якщо:
                  </h4>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                      <span>Збережено товарний вигляд і упаковку</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                      <span>Наявні пломби, ярлики і бирки</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                      <span>Товар не використовувався</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                      <span>Є розрахунковий документ (чек)</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-red-50 rounded-2xl p-6 hover:shadow-lg transition-all">
                  <h4 className="font-bold text-red-900 mb-4 flex items-center gap-2 text-xl">
                    <XCircle className="w-6 h-6 text-red-600" />
                    Не підлягають поверненню:
                  </h4>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-2">
                      <XCircle className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                      <span>Засоби особистої гігієни</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                      <span>Білизна</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                      <span>Парфумерія</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                      <span>Товари з порушеною упаковкою</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          </ScrollReveal>

          {/* Contact Banner */}
          <ScrollReveal animation="scaleIn">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white text-center">
              <h3 className="text-3xl font-extrabold mb-4">Є питання?</h3>
              <p className="text-xl mb-6">Наша служба підтримки завжди готова допомогти!</p>
              <div className="flex flex-col md:flex-row gap-4 justify-center">
                <a href="tel:+380502474161" className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-transform">
                  050-247-41-61
                </a>
                <a href="tel:+380637247703" className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-transform">
                  063-724-77-03
                </a>
                <a href="mailto:support@y-store.in.ua" className="bg-white/20 backdrop-blur-lg px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-transform">
                  support@y-store.in.ua
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
};

export default ExchangeReturn;
