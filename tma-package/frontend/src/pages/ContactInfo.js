import React from 'react';
import { Phone, Mail, Clock, MapPin, MessageCircle } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';

const ContactInfo = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <ScrollReveal animation="fadeInUp">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                <Phone className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Контактна інформація
            </h1>
            <p className="text-xl text-gray-600">
              Ми завжди на зв'язку! Зв'яжіться з нами зручним способом
            </p>
          </div>
        </ScrollReveal>

        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 md:p-12 space-y-10">
          {/* Contact Cards Grid */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Phone Numbers */}
            <ScrollReveal animation="slideInLeft">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl p-8 hover:shadow-xl transition-all border-2 border-blue-200">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center">
                    <Phone className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-extrabold text-gray-900">Телефони</h2>
                </div>
                <div className="space-y-4">
                  <a href="tel:+380502474161" className="block text-2xl font-bold text-blue-600 hover:text-blue-800 transition-colors">
                    📱 050-247-41-61
                  </a>
                  <a href="tel:+380637247703" className="block text-2xl font-bold text-blue-600 hover:text-blue-800 transition-colors">
                    📱 063-724-77-03
                  </a>
                  <p className="text-gray-600 mt-4">Графік роботи: Пн-Нд 9:00-19:00</p>
                </div>
              </div>
            </ScrollReveal>

            {/* Email */}
            <ScrollReveal animation="slideInRight">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-8 hover:shadow-xl transition-all border-2 border-purple-200">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center">
                    <Mail className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-extrabold text-gray-900">Email</h2>
                </div>
                <a href="mailto:support@y-store.in.ua" className="block text-2xl font-bold text-purple-600 hover:text-purple-800 transition-colors mb-4">
                  ✉️ support@y-store.in.ua
                </a>
                <p className="text-gray-600">Відповідаємо протягом 24 годин</p>
              </div>
            </ScrollReveal>

            {/* Address */}
            <ScrollReveal animation="slideInLeft" delay={100}>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 hover:shadow-xl transition-all border-2 border-green-200">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-extrabold text-gray-900">Адреса</h2>
                </div>
                <div className="space-y-2 text-gray-700 text-lg leading-relaxed">
                  <p className="font-semibold">📍 проспект Миколи Бажана, 24/1</p>
                  <p>Київ, Україна, 02149</p>
                  <a 
                    href="https://www.google.com/maps/dir//проспект+Миколи+Бажана,+24/1,+Київ,+02149" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg transition-all hover:scale-105"
                  >
                    Маршрут на карті →
                  </a>
                </div>
              </div>
            </ScrollReveal>

            {/* Working Hours */}
            <ScrollReveal animation="slideInRight" delay={100}>
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-3xl p-8 hover:shadow-xl transition-all border-2 border-orange-200">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl flex items-center justify-center">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-extrabold text-gray-900">Графік роботи</h2>
                </div>
                <div className="space-y-3 text-gray-700 text-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Понеділок - П'ятниця:</span>
                    <span className="font-bold text-orange-600">9:00 - 19:00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Субота:</span>
                    <span className="font-bold text-orange-600">10:00 - 18:00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Неділя:</span>
                    <span className="font-bold text-orange-600">10:00 - 18:00</span>
                  </div>
                  <div className="mt-4 p-4 bg-green-100 rounded-xl">
                    <p className="text-green-800 font-bold text-center">🌐 Замовлення online 24/7</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Social Media */}
          <ScrollReveal animation="scaleIn">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white">
              <h2 className="text-3xl font-extrabold mb-6 text-center">Соціальні мережі</h2>
              <div className="flex justify-center gap-6">
                <a 
                  href="https://t.me/yourtelegram" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center hover:scale-110 hover:bg-white/30 transition-all"
                >
                  <MessageCircle className="w-8 h-8" />
                </a>
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center hover:scale-110 hover:bg-white/30 transition-all"
                >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a 
                  href="viber://chat?number=%2B380502474161" 
                  className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center hover:scale-110 hover:bg-white/30 transition-all"
                >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.35.5C6.697.5 2.09 5.107 2.09 10.76c0 1.904.522 3.684 1.427 5.214L2 20.5l4.74-1.474c1.452.803 3.13 1.264 4.91 1.264 5.653 0 10.26-4.607 10.26-10.26C21.91 5.107 17.303.5 12.35.5z"/>
                  </svg>
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
};

export default ContactInfo;
