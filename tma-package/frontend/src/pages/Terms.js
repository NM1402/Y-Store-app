import React from 'react';
import { FileText, CheckCircle, ShieldCheck, Package, CreditCard, RotateCcw } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';

const Terms = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <ScrollReveal animation="fadeInUp">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                <FileText className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Угода користувача
            </h1>
            <p className="text-xl text-gray-600">
              Публічний договір (оферта) на замовлення, купівлю-продаж і доставку товарів
            </p>
          </div>
        </ScrollReveal>

        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 md:p-12 space-y-10">
          {/* Introduction */}
          <ScrollReveal animation="fadeInUp">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border-2 border-blue-200">
              <p className="text-gray-700 leading-relaxed text-lg">
                Цей договір є офіційною та публічною пропозицією Продавця укласти договір купівлі-продажу Товару, представленого на сайті <strong className="text-blue-600">Y-store</strong>. Даний договір є публічним, тобто відповідно до статті 633 Цивільного кодексу України, його умови є однаковими для всіх покупців незалежно від їх статусу (фізична особа, юридична особа, фізична особа-підприємець) без надання переваги одному покупцю перед іншим.
              </p>
              <p className="text-gray-700 leading-relaxed text-lg mt-4">
                Договір вважається укладеним з моменту натискання кнопки <strong>«Підтвердити Замовлення»</strong> на сторінці оформлення замовлення і отримання Покупцем від Продавця підтвердження замовлення в електронному вигляді.
              </p>
            </div>
          </ScrollReveal>

          {/* Icons Menu */}
          <ScrollReveal animation="scaleIn">
            <div className="grid md:grid-cols-4 gap-6 my-12">
              <div className="text-center p-6 bg-blue-50 rounded-2xl hover:shadow-lg transition-all">
                <Package className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                <p className="font-semibold text-gray-800">Замовлення</p>
              </div>
              <div className="text-center p-6 bg-purple-50 rounded-2xl hover:shadow-lg transition-all">
                <CreditCard className="w-12 h-12 mx-auto mb-3 text-purple-600" />
                <p className="font-semibold text-gray-800">Оплата</p>
              </div>
              <div className="text-center p-6 bg-green-50 rounded-2xl hover:shadow-lg transition-all">
                <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-green-600" />
                <p className="font-semibold text-gray-800">Гарантії</p>
              </div>
              <div className="text-center p-6 bg-orange-50 rounded-2xl hover:shadow-lg transition-all">
                <RotateCcw className="w-12 h-12 mx-auto mb-3 text-orange-600" />
                <p className="font-semibold text-gray-800">Повернення</p>
              </div>
            </div>
          </ScrollReveal>

          {/* 1. Визначення термінів */}
          <ScrollReveal animation="fadeInUp">
            <section className="border-l-4 border-blue-600 pl-6">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center gap-3">
                <span className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">1</span>
                Визначення термінів
              </h2>
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-2xl p-6 hover:shadow-lg transition-all">
                  <h3 className="font-bold text-lg text-blue-900 mb-2">1.1. Публічна оферта</h3>
                  <p className="text-gray-700 leading-relaxed">Публічна пропозиція Продавця, адресована невизначеному колу осіб, укласти з Продавцем договір купівлі-продажу товару дистанційним способом на умовах, що містяться в цій Оферті.</p>
                </div>
                <div className="bg-purple-50 rounded-2xl p-6 hover:shadow-lg transition-all">
                  <h3 className="font-bold text-lg text-purple-900 mb-2">1.2. Товар або Послуга</h3>
                  <p className="text-gray-700 leading-relaxed">Об'єкт угоди сторін, який був обраний покупцем на сайті Інтернет-магазину та поміщений у кошик, або вже придбаний Покупцем у Продавця дистанційним способом.</p>
                </div>
                <div className="bg-green-50 rounded-2xl p-6 hover:shadow-lg transition-all">
                  <h3 className="font-bold text-lg text-green-900 mb-2">1.3. Інтернет-магазин</h3>
                  <p className="text-gray-700 leading-relaxed">Сайт Продавця <strong>Y-store</strong> створений для укладення договорів роздрібної та оптової купівлі-продажу на підставі ознайомлення Покупця із запропонованим Продавцем описом Товару за допомогою мережі Інтернет.</p>
                </div>
                <div className="bg-orange-50 rounded-2xl p-6 hover:shadow-lg transition-all">
                  <h3 className="font-bold text-lg text-orange-900 mb-2">1.4. Покупець</h3>
                  <p className="text-gray-700 leading-relaxed">Дієздатна фізична особа, яка досягла 18 років, отримує інформацію від Продавця, розміщує замовлення щодо купівлі товару для цілей, що не пов'язані зі здійсненням підприємницької діяльності, або юридична особа чи фізична особа-підприємець.</p>
                </div>
                <div className="bg-red-50 rounded-2xl p-6 hover:shadow-lg transition-all">
                  <h3 className="font-bold text-lg text-red-900 mb-2">1.5. Продавець</h3>
                  <p className="text-gray-700 leading-relaxed">Фізична особа-підприємець <strong>Тищенко Олександр Миколайович</strong> (ідентифікаційний код 3473114859), місцезнаходження: Полтавська область, Лебенський район, с. Маяківка, вул. Моложіжна, буд. 1</p>
                </div>
              </div>
            </section>
          </ScrollReveal>

          {/* Remaining sections with compact design */}
          <ScrollReveal animation="fadeInUp">
            <section className="space-y-8">
              {/* Section 2 */}
              <div className="border-l-4 border-purple-600 pl-6">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-4 flex items-center gap-3">
                  <span className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-lg">2</span>
                  Предмет договору
                </h2>
                <p className="text-gray-700 leading-relaxed mb-3"><strong className="text-purple-600">2.1.</strong> Продавець зобов'язується передати у власність Покупцю Товар, а Покупець зобов'язується оплатити і прийняти Товар на умовах цього Договору.</p>
                <p className="text-gray-700 leading-relaxed"><strong className="text-purple-600">2.2.</strong> Датою укладення Договору-оферти вважається дата заповнення Покупцем форми замовлення на сайті Інтернет-магазину, за умови отримання Покупцем від Продавця підтвердження замовлення в електронному вигляді.</p>
              </div>

              {/* Section 3 */}
              <div className="border-l-4 border-green-600 pl-6">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-4 flex items-center gap-3">
                  <span className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg">3</span>
                  Оформлення Замовлення
                </h2>
                <div className="space-y-3 text-gray-700 leading-relaxed">
                  <p><strong className="text-green-600">3.1.</strong> Покупець самостійно оформлює замовлення через форму «Кошика», або електронною поштою чи за телефоном.</p>
                  <p><strong className="text-green-600">3.2.</strong> Продавець має право відмовитися від передання замовлення, якщо відомості викликають підозру щодо їх дійсності.</p>
                  <p><strong className="text-green-600">3.3.</strong> При оформленні замовлення Покупець зобов'язується надати: прізвище, ім'я, адресу доставки, контактний телефон.</p>
                </div>
              </div>

              {/* Section 4 */}
              <div className="border-l-4 border-orange-600 pl-6">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-4 flex items-center gap-3">
                  <span className="w-10 h-10 bg-gradient-to-r from-orange-600 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-lg">4</span>
                  Ціна і Доставка Товару
                </h2>
                <div className="space-y-3 text-gray-700 leading-relaxed">
                  <p><strong className="text-orange-600">4.1.</strong> Ціни на Товари визначаються Продавцем самостійно та вказані на сайті в гривнях з урахуванням ПДВ.</p>
                  <p><strong className="text-orange-600">4.3.</strong> Вартість доставки Товару Покупець сплачує безпосередньо службі доставки.</p>
                  <p><strong className="text-orange-600">4.8.</strong> При отриманні товару Покупець повинен перевірити відповідність Товару якісним і кількісним характеристикам.</p>
                </div>
              </div>

              {/* Section 5 */}
              <div className="border-l-4 border-blue-600 pl-6">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-4 flex items-center gap-3">
                  <span className="w-10 h-10 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-lg">5</span>
                  Права та обов'язки Сторін
                </h2>
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-xl p-5">
                    <h3 className="font-bold text-blue-900 mb-2">Продавець зобов'язаний:</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Передати Покупцеві товар у відповідності до умов Договору</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Не розголошувати приватну інформацію про Покупця</span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-5">
                    <h3 className="font-bold text-purple-900 mb-2">Покупець зобов'язується:</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Ознайомитися зі змістом та умовами Договору перед укладенням</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Надати всі необхідні дані для доставки Товару</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Section 6 */}
              <div className="border-l-4 border-red-600 pl-6">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-4 flex items-center gap-3">
                  <span className="w-10 h-10 bg-gradient-to-r from-red-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-lg">6</span>
                  Повернення Товару
                </h2>
                <div className="space-y-3 text-gray-700 leading-relaxed">
                  <p><strong className="text-red-600">6.1.</strong> Покупець має право на повернення непродовольчого товару належної якості протягом <strong>14 днів</strong>, якщо збережено товарний вигляд, споживчі властивості, упаковку, пломби та розрахунковий документ.</p>
                  <p><strong className="text-red-600">6.2.</strong> Повернення вартості товару здійснюється протягом <strong>30 календарних днів</strong> з моменту отримання Товару Продавцем.</p>
                  <p><strong className="text-red-600">6.5.</strong> У разі виявлення недоліків у Товарі протягом гарантійного строку, Покупець має право пред'явити вимоги згідно Закону України «Про захист прав споживачів».</p>
                </div>
              </div>

              {/* Section 7 */}
              <div className="border-l-4 border-yellow-600 pl-6">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-4 flex items-center gap-3">
                  <span className="w-10 h-10 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg">7</span>
                  Відповідальність
                </h2>
                <div className="space-y-3 text-gray-700 leading-relaxed">
                  <p><strong className="text-yellow-600">7.1.</strong> Продавець не несе відповідальності за шкоду, заподіяну внаслідок неналежного використання Товару.</p>
                  <p><strong className="text-yellow-600">7.2.</strong> Продавець не несе відповідальності за неналежне виконання зобов'язань у випадку надання Покупцем недостовірної інформації.</p>
                  <p><strong className="text-yellow-600">7.4.</strong> Сторони звільняються від відповідальності у випадку форс-мажорних обставин (війна, стихійні лиха тощо).</p>
                </div>
              </div>

              {/* Section 8 */}
              <div className="border-l-4 border-indigo-600 pl-6">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-4 flex items-center gap-3">
                  <span className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">8</span>
                  Конфіденційність і захист персональних даних
                </h2>
                <div className="bg-indigo-50 rounded-xl p-6">
                  <p className="text-gray-700 leading-relaxed mb-3">
                    <strong className="text-indigo-600">8.1.</strong> Оформлюючи замовлення, Покупець надає добровільну згоду на обробку та використання своїх персональних даних відповідно до Закону України «Про захист персональних даних».
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    <strong className="text-indigo-600">8.2.</strong> Продавець зобов'язується не розголошувати отриману інформацію, крім випадків, передбачених законодавством України.
                  </p>
                </div>
              </div>
            </section>
          </ScrollReveal>

          {/* Contact Information */}
          <ScrollReveal animation="scaleIn">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white mt-12">
              <h2 className="text-3xl font-extrabold mb-6 text-center">Адреса та реквізити Продавця</h2>
              <div className="grid md:grid-cols-2 gap-6 text-lg">
                <div>
                  <p className="font-semibold mb-2">📍 Адреса:</p>
                  <p>Полтавська область, Лебенський район,</p>
                  <p>с. Маяківка, вул. Моложіжна, буд. 1</p>
                </div>
                <div>
                  <p className="font-semibold mb-2">💳 Реквізити:</p>
                  <p>ФОП Тищенко Олександр Миколайович</p>
                  <p>ЄДРПОУ: 3473114859</p>
                  <p>☎️ тел. (063) 724-77-03</p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Footer Note */}
          <ScrollReveal animation="fadeInUp">
            <div className="text-center text-gray-500 text-sm mt-8 p-6 bg-gray-50 rounded-xl">
              <p>Цей договір укладено на території України і діє відповідно до чинного законодавства України.</p>
              <p className="mt-2">Останнє оновлення: Грудень 2025</p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
};

export default Terms;
