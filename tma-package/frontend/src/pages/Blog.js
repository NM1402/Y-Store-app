import React from 'react';
import { BookOpen, Calendar } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Blog = () => {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-4xl font-bold mb-8 text-center">
          {language === 'ru' ? 'Блог' : 'Блог'}
        </h1>

        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {language === 'ru' ? 'Скоро здесь появятся статьи' : 'Скоро тут з\'являться статті'}
          </h2>
          <p className="text-gray-600">
            {language === 'ru'
              ? 'Мы готовим для вас интересные материалы о товарах, советы по выбору и многое другое!'
              : 'Ми готуємо для вас цікаві матеріали про товари, поради щодо вибору та багато іншого!'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Blog;