import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/button';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full text-center animate-fadeIn">
        {/* 404 Animation */}
        <div className="relative mb-8">
          <h1 className="text-[180px] md:text-[250px] font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-none animate-pulse">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-8xl animate-bounce">🔍</div>
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800">
            Упс! Сторінку не знайдено
          </h2>
          <p className="text-xl text-gray-600 max-w-lg mx-auto">
            Схоже, ця сторінка відправилася в космос 🚀 або просто не існує. 
            Але не хвилюйтеся, ми знаємо, як вам допомогти!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 rounded-2xl text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2">
              <Home className="w-6 h-6" />
              На головну
            </Button>
          </Link>
          <Link to="/products">
            <Button 
              variant="outline" 
              className="border-2 border-gray-300 hover:border-blue-600 hover:bg-blue-50 px-8 py-6 rounded-2xl text-lg font-semibold transition-all duration-300 flex items-center gap-2"
            >
              <ShoppingBag className="w-6 h-6" />
              До каталогу
            </Button>
          </Link>
        </div>

        {/* Popular Categories */}
        <div className="mt-16 p-8 bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">
            Популярні категорії
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['Електроніка', 'Одяг', 'Дім і сад', 'Спорт'].map((category, index) => (
              <Link
                key={index}
                to="/products"
                className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-300 text-gray-700 font-semibold"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>

        {/* Fun Message */}
        <div className="mt-8 text-gray-500 text-sm">
          <p>Код помилки: 404 - Немає таких тут! 🤷‍♂️</p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
