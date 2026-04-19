import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { ShoppingBag, X, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';

const MiniCart = ({ onClose, language = 'uk' }) => {
  const { cartItems, cartTotal, removeFromCart } = useCart();

  const T = {
    uk: {
      title: 'Кошик',
      empty: 'Кошик порожній',
      total: 'Разом',
      checkout: 'Оформити замовлення',
      viewCart: 'Переглянути кошик',
      remove: 'Видалити'
    },
    ru: {
      title: 'Корзина',
      empty: 'Корзина пуста',
      total: 'Итого',
      checkout: 'Оформить заказ',
      viewCart: 'Посмотреть корзину',
      remove: 'Удалить'
    }
  };

  const txt = T[language] || T.uk;

  return (
    <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="font-bold text-lg">{txt.title}</h3>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Items */}
      {cartItems.length === 0 ? (
        <div className="p-8 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{txt.empty}</p>
        </div>
      ) : (
        <>
          <div className="max-h-72 overflow-y-auto">
            {cartItems.slice(0, 5).map((item) => (
              <div 
                key={item.product_id} 
                className="flex items-center gap-3 p-4 border-b border-gray-100 last:border-0"
              >
                <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                  {item.image && (
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{item.title}</p>
                  <p className="text-gray-500 text-sm">{item.quantity} шт.</p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="font-bold">{(item.price * item.quantity).toLocaleString()} ₴</p>
                  <button 
                    onClick={() => removeFromCart(item.product_id)}
                    className="text-red-500 text-xs hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-600">{txt.total}</span>
              <span className="text-xl font-black">{cartTotal.toLocaleString()} ₴</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Link to="/cart" onClick={onClose}>
                <Button variant="outline" className="w-full">
                  {txt.viewCart}
                </Button>
              </Link>
              <Link to="/checkout" onClick={onClose}>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  {txt.checkout}
                </Button>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MiniCart;
