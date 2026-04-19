import React from 'react';
import { Truck, Package, Home, Clock, CreditCard } from 'lucide-react';

const DeliveryOptions = () => {
  return (
    <div className="space-y-6">
      {/* Delivery Section */}
      <div>
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Truck className="w-5 h-5 text-green-600" />
          Доставка
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <Package className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900">Нова Пошта</p>
              <p className="text-sm text-gray-600">Доставка у відділення або поштомат</p>
              <p className="text-sm font-medium text-green-600 mt-1">Безкоштовно від 500 грн</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Truck className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900">Кур'єром по Києву</p>
              <p className="text-sm text-gray-600">1-2 дні, 80 грн</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Home className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900">Самовивіз</p>
              <p className="text-sm text-gray-600">проспект Миколи Бажана, 24/1, Київ, Україна, 02149</p>
              <p className="text-sm font-medium text-green-600 mt-1">Безкоштовно</p>
            </div>
          </div>
        </div>

        {/* Delivery Timer */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700">
            <Clock className="w-5 h-5" />
            <p className="text-sm font-medium">
              Замовте до 15:00, отримаєте завтра!
            </p>
          </div>
        </div>
      </div>

      {/* Payment Section */}
      <div>
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-blue-600" />
          Оплата
        </h3>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Готівкою при отриманні</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Карткою онлайн (RozetkaPay)</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Apple Pay / Google Pay</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Оплата частинами 0%</span>
          </div>
        </div>
      </div>

      {/* Guarantees */}
      <div className="p-4 bg-gray-50 rounded-lg space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
          <span className="text-gray-700">Гарантія 24 місяці</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
          <span className="text-gray-700">14 днів на повернення</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
          <span className="text-gray-700">Офіційний дистриб'ютор</span>
        </div>
      </div>
    </div>
  );
};

export default DeliveryOptions;
