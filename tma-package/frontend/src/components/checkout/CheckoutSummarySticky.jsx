import React from 'react';
import { CheckCircle, Shield, Clock, Package, Percent, ImageOff } from 'lucide-react';
import { Button } from '../ui/button';

const CheckoutSummarySticky = ({ 
  cartItems = [], 
  subtotal = 0, 
  deliveryCost = 0, 
  total = 0, 
  isSubmitting = false,
  onSubmit,
  freeDeliveryThreshold = 2000
}) => {
  const needsMoreForFreeDelivery = subtotal < freeDeliveryThreshold;
  const amountForFreeDelivery = freeDeliveryThreshold - subtotal;

  // Fallback image component
  const ProductImage = ({ src, alt }) => {
    const [error, setError] = React.useState(false);
    
    if (!src || error) {
      return (
        <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center border border-gray-200">
          <ImageOff className="w-6 h-6 text-gray-400" />
        </div>
      );
    }
    
    return (
      <img
        src={src}
        alt={alt || 'Товар'}
        onError={() => setError(true)}
        className="w-16 h-16 object-cover rounded-lg flex-shrink-0 border border-gray-200"
      />
    );
  };

  return (
    <div className="sticky top-24">
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4">
          <h2 className="text-lg font-bold">Ваше замовлення</h2>
          <p className="text-green-100 text-sm">{cartItems.length} товар(ів)</p>
        </div>

        {/* Items */}
        <div className="p-6 max-h-64 overflow-y-auto">
          <div className="space-y-4">
            {cartItems.map((item, index) => (
              <div key={item.product_id || index} className="flex gap-4">
                <ProductImage src={item.image} alt={item.title} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 line-clamp-2">{item.title || 'Товар'}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-gray-500">{item.quantity} шт.</span>
                    <span className="font-semibold text-gray-900">
                      {(item.price * item.quantity).toLocaleString()} ₴
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200"></div>

        {/* Free Delivery Progress */}
        {needsMoreForFreeDelivery && subtotal > 0 && (
          <div className="px-6 py-4 bg-green-50 border-b border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                До безкоштовної доставки залишилось {amountForFreeDelivery.toLocaleString()} ₴
              </span>
            </div>
            <div className="h-2 bg-green-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-600 rounded-full transition-all duration-500"
                style={{ width: `${(subtotal / freeDeliveryThreshold) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="px-6 py-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Товари</span>
            <span className="font-medium">{subtotal.toLocaleString()} ₴</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Доставка</span>
            <span className={deliveryCost === 0 ? 'text-green-600 font-semibold' : 'font-medium'}>
              {deliveryCost === 0 ? 'Безкоштовно' : `${deliveryCost.toLocaleString()} ₴`}
            </span>
          </div>
          <div className="flex justify-between text-xl font-bold pt-3 border-t border-gray-200">
            <span>Разом</span>
            <span className="text-green-600">{total.toLocaleString()} ₴</span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="px-6 pb-6">
          <Button
            type="submit"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all"
            data-testid="submit-order-button"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Оформлення...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Підтвердити замовлення
              </span>
            )}
          </Button>
        </div>

        {/* Trust Block */}
        <div className="px-6 pb-6 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Shield className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>Безпечна оплата</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span>Відправка 1-2 робочих дні</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Package className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <span>Гарантія 14 днів на повернення</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSummarySticky;
