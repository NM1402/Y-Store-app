/**
 * Checkout Hook - State-driven checkout flow
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api-client';
import useCartStore from '../store/cart';
import telegram from '../lib/telegram-sdk';

export const useCheckout = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart } = useCartStore();
  const [step, setStep] = useState(1); // 1: contacts, 2: delivery, 3: payment, 4: review
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    city: '',
    warehouse: '',
    payment_method: 'cash_on_delivery',
  });

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    telegram.haptic('light');
    setStep(prev => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    telegram.haptic('light');
    setStep(prev => Math.max(prev - 1, 1));
  };

  const validateStep = (currentStep) => {
    switch (currentStep) {
      case 1: // Contacts
        return form.full_name && form.phone;
      case 2: // Delivery
        return form.city && form.warehouse;
      case 3: // Payment
        return form.payment_method;
      default:
        return true;
    }
  };

  const submitOrder = async () => {
    try {
      setLoading(true);
      telegram.showMainButtonProgress();

      const orderData = {
        ...form,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
      };

      await api.createOrder(orderData);
      clearCart();
      telegram.notificationOccurred('success');
      await telegram.showAlert('Замовлення оформлено! ✓');
      navigate('/tma/orders');
    } catch (error) {
      console.error('Order error:', error);
      telegram.notificationOccurred('error');
      telegram.showAlert('Помилка оформлення');
    } finally {
      setLoading(false);
      telegram.hideMainButtonProgress();
    }
  };

  return {
    step,
    form,
    loading,
    items,
    total: getTotal(),
    updateForm,
    nextStep,
    prevStep,
    validateStep,
    submitOrder,
  };
};
