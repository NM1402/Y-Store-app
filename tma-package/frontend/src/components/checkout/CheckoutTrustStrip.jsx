import React from 'react';
import { Shield, Truck, RefreshCw, CreditCard, Phone } from 'lucide-react';

const CheckoutTrustStrip = () => {
  const trustItems = [
    { icon: Shield, text: 'Безпечна оплата', color: 'text-green-600' },
    { icon: Truck, text: 'Швидка доставка', color: 'text-blue-600' },
    { icon: RefreshCw, text: 'Повернення 14 днів', color: 'text-purple-600' },
    { icon: CreditCard, text: 'Оплата при отриманні', color: 'text-orange-600' },
  ];

  return (
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-y border-gray-200 py-4">
      <div className="container-main px-4">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {trustItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <item.icon className={`w-5 h-5 ${item.color}`} />
              <span className="text-sm font-medium text-gray-700">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CheckoutTrustStrip;
