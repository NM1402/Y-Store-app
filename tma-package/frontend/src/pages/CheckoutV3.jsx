import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  ShoppingBag, 
  User, 
  Truck, 
  CreditCard, 
  ChevronDown, 
  ChevronUp,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  ArrowLeft,
  Package,
  AlertCircle,
  UserPlus,
  LogIn
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import NovaPoshtaDelivery from '../components/NovaPoshtaDelivery';
import CheckoutTrustStrip from '../components/checkout/CheckoutTrustStrip';
import CheckoutSummarySticky from '../components/checkout/CheckoutSummarySticky';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const FREE_DELIVERY_THRESHOLD = 2000;

// Ukrainian phone operators prefixes
const UA_OPERATORS = {
  '039': 'Kyivstar',
  '050': 'Vodafone',
  '063': 'Lifecell',
  '066': 'Vodafone',
  '067': 'Kyivstar',
  '068': 'Kyivstar',
  '073': 'Lifecell',
  '091': 'Utel',
  '092': 'PEOPLEnet',
  '093': 'Lifecell',
  '094': 'Інтертелеком',
  '095': 'Vodafone',
  '096': 'Kyivstar',
  '097': 'Kyivstar',
  '098': 'Kyivstar',
  '099': 'Vodafone'
};

// Validation helpers
const validateName = (firstName, lastName) => {
  // Allow only letters, apostrophes, hyphens (for Ukrainian/Russian names)
  const nameRegex = /^[a-zA-Zа-яА-ЯіІїЇєЄґҐ'\-]+$/;
  
  // Validate first name
  if (!firstName || !firstName.trim()) {
    return { valid: false, field: 'first_name', error: "Вкажіть ім'я" };
  }
  if (firstName.trim().length < 2) {
    return { valid: false, field: 'first_name', error: "Ім'я занадто коротке" };
  }
  if (!nameRegex.test(firstName.trim())) {
    return { valid: false, field: 'first_name', error: "Ім'я може містити тільки літери" };
  }
  // Check for repeated characters (like "aaaa")
  if (/(.)\1{2,}/.test(firstName.trim().toLowerCase())) {
    return { valid: false, field: 'first_name', error: "Некоректне ім'я" };
  }
  
  // Validate last name
  if (!lastName || !lastName.trim()) {
    return { valid: false, field: 'last_name', error: "Вкажіть прізвище" };
  }
  if (lastName.trim().length < 2) {
    return { valid: false, field: 'last_name', error: "Прізвище занадто коротке" };
  }
  if (!nameRegex.test(lastName.trim())) {
    return { valid: false, field: 'last_name', error: "Прізвище може містити тільки літери" };
  }
  // Check for repeated characters
  if (/(.)\1{2,}/.test(lastName.trim().toLowerCase())) {
    return { valid: false, field: 'last_name', error: "Некоректне прізвище" };
  }
  
  return { valid: true };
};

const validateEmail = (email) => {
  if (!email) return { valid: true }; // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { valid: false, error: "Некоректний email" };
  return { valid: true };
};

const validatePhone = (phone) => {
  const digits = phone.replace(/\D/g, '');
  
  // Full phone should be 12 digits: 380XXXXXXXXX
  if (digits.length < 12) return { valid: false, error: "Введіть повний номер телефону" };
  
  // Check if starts with 380
  if (!digits.startsWith('380')) return { valid: false, error: "Номер має починатися з +380" };
  
  // Check operator prefix (digits 3-5, i.e. 0XX part)
  const prefix = '0' + digits.substring(3, 5);
  if (!UA_OPERATORS[prefix]) {
    return { valid: false, error: "Невідомий оператор. Перевірте номер" };
  }
  
  return { valid: true, operator: UA_OPERATORS[prefix] };
};

const CheckoutV3 = () => {
  const { user, isAuthenticated, login } = useAuth();
  const { cart, cartTotal, clearCart, fetchCart } = useCart();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const cartItems = cart?.items || [];

  // Form state
  const [customerData, setCustomerData] = useState({
    first_name: user?.full_name?.split(' ')[0] || '',
    last_name: user?.full_name?.split(' ').slice(1).join(' ') || '',
    phone: user?.phone || '',
    email: user?.email || ''
  });

  // Validation errors
  const [errors, setErrors] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: ''
  });

  // Customer type: 'new' or 'existing'
  const [customerType, setCustomerType] = useState(isAuthenticated ? 'existing' : null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  const [deliveryData, setDeliveryData] = useState({
    method: 'nova_poshta',
    city_ref: '',
    city_name: '',
    warehouse_ref: '',
    warehouse_name: '',
    delivery_cost: 0
  });

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [phoneOperator, setPhoneOperator] = useState('');

  // Phone mask formatting - user enters only 0XX XXX XX XX, we add +38
  const formatPhoneInput = (value) => {
    // Remove all non-digits
    let digits = value.replace(/\D/g, '');
    
    // If starts with 380, remove it (user might paste full number)
    if (digits.startsWith('380')) {
      digits = digits.slice(2);
    }
    // If starts with 38, remove it
    if (digits.startsWith('38')) {
      digits = digits.slice(2);
    }
    
    // Limit to 10 digits (0XX XXX XX XX)
    digits = digits.slice(0, 10);
    
    // Format: 0XX XXX XX XX
    if (digits.length === 0) return '';
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    if (digits.length <= 8) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
  };

  // Get full phone with +38 for validation and submission
  const getFullPhone = (formattedInput) => {
    const digits = formattedInput.replace(/\D/g, '');
    if (!digits) return '';
    return `+38${digits}`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneInput(e.target.value);
    setCustomerData(prev => ({ ...prev, phone: formatted }));
    
    // Validate with full phone number
    const fullPhone = getFullPhone(formatted);
    const validation = validatePhone(fullPhone);
    
    if (validation.valid && validation.operator) {
      setPhoneOperator(validation.operator);
      setErrors(prev => ({ ...prev, phone: '' }));
    } else {
      setPhoneOperator('');
      const digits = formatted.replace(/\D/g, '');
      if (digits.length >= 3) {
        setErrors(prev => ({ ...prev, phone: validation.error || '' }));
      }
    }
  };

  const handleNameChange = (field) => (e) => {
    const value = e.target.value;
    setCustomerData(prev => ({ ...prev, [field]: value }));
    
    // Real-time validation for this field
    if (value.length > 1) {
      const otherField = field === 'first_name' ? 'last_name' : 'first_name';
      const otherValue = customerData[otherField];
      const firstName = field === 'first_name' ? value : otherValue;
      const lastName = field === 'last_name' ? value : otherValue;
      
      const validation = validateName(firstName, lastName);
      if (!validation.valid && validation.field === field) {
        setErrors(prev => ({ ...prev, [field]: validation.error || '' }));
      } else {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    } else {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setCustomerData(prev => ({ ...prev, email: value }));
    
    if (value) {
      const validation = validateEmail(value);
      setErrors(prev => ({ ...prev, email: validation.error || '' }));
    } else {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  // Calculate totals
  const subtotal = cartTotal;
  const deliveryCost = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : deliveryData.delivery_cost;
  const total = subtotal + deliveryCost;

  // Handle Nova Poshta selection
  const handleNovaPoshtaChange = (data) => {
    console.log('Nova Poshta data:', data); // Debug
    setDeliveryData(prev => ({
      ...prev,
      city_ref: data.cityRef || '',
      city_name: data.city || '',
      warehouse_ref: data.warehouse?.ref || '',
      warehouse_name: data.warehouse?.address || data.warehouse?.description || '',
      delivery_cost: data.delivery_cost || 0
    }));
  };

  // Google login handler - save checkout state before redirect
  const handleGoogleLogin = () => {
    // Save current location to return after auth
    sessionStorage.setItem('checkout_return_url', '/checkout');
    const redirectUrl = window.location.origin + '/auth-callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  // Validate step with detailed errors
  const validateStep = (step) => {
    if (step === 1) {
      let isValid = true;
      const newErrors = { ...errors };
      
      // Validate name (both fields)
      const nameValidation = validateName(customerData.first_name, customerData.last_name);
      if (!nameValidation.valid) {
        if (nameValidation.field === 'first_name') {
          newErrors.first_name = nameValidation.error;
        } else {
          newErrors.last_name = nameValidation.error;
        }
        toast.error(nameValidation.error);
        isValid = false;
      }
      
      // Validate phone (use full phone with +38 prefix)
      const fullPhone = getFullPhone(customerData.phone);
      const phoneValidation = validatePhone(fullPhone);
      if (!phoneValidation.valid) {
        newErrors.phone = phoneValidation.error;
        if (isValid) toast.error(phoneValidation.error);
        isValid = false;
      }
      
      // Validate email (optional but must be valid if provided)
      const emailValidation = validateEmail(customerData.email);
      if (!emailValidation.valid) {
        newErrors.email = emailValidation.error;
        if (isValid) toast.error(emailValidation.error);
        isValid = false;
      }
      
      setErrors(newErrors);
      return isValid;
    }
    if (step === 2) {
      if (deliveryData.method === 'nova_poshta' && !deliveryData.warehouse_ref) {
        toast.error('Оберіть відділення Нової Пошти');
        return false;
      }
      return true;
    }
    return true;
  };

  // Submit order
  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    // Validate all steps
    if (!validateStep(1) || !validateStep(2)) return;
    
    if (cartItems.length === 0) {
      toast.error('Кошик порожній');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderPayload = {
        customer: {
          full_name: `${customerData.first_name} ${customerData.last_name}`.trim(),
          phone: getFullPhone(customerData.phone).replace(/\s/g, ''),
          email: customerData.email || undefined
        },
        delivery: {
          method: deliveryData.method,
          city_ref: deliveryData.city_ref,
          city_name: deliveryData.city_name,
          warehouse_ref: deliveryData.warehouse_ref,
          warehouse_name: deliveryData.warehouse_name,
          delivery_cost: deliveryCost
        },
        items: cartItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price
        })),
        payment_method: paymentMethod,
        comment: comment || undefined
      };

      const response = await axios.post(
        `${API_URL}/api/v2/orders/create`,
        orderPayload,
        { withCredentials: true }
      );

      // Clear cart
      if (isAuthenticated) {
        await clearCart();
      }
      
      // Also clear guest cart from localStorage
      localStorage.removeItem('guest_cart');

      // Handle online payment - redirect to WayForPay
      if (paymentMethod === 'card') {
        // Option 1: Direct payment_url (preferred)
        if (response.data.payment_url) {
          toast.success('Переходимо на оплату...');
          window.location.href = response.data.payment_url;
          return;
        }
        
        // Option 2: Form data for POST redirect
        if (response.data.form_data) {
          // Create and submit form for WayForPay (POST)
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = 'https://secure.wayforpay.com/pay';
          form.acceptCharset = 'UTF-8';
          form.target = '_self';
        
        const formData = response.data.form_data;
        
        // Add all form fields
        Object.entries(formData).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            // For arrays like productName[], productCount[], productPrice[]
            value.forEach((v) => {
              const input = document.createElement('input');
              input.type = 'hidden';
              input.name = key + '[]';
              input.value = String(v);
              form.appendChild(input);
            });
          } else {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = String(value);
            form.appendChild(input);
          }
        });
        
        // Append to body and submit
        document.body.appendChild(form);
        
        // Small delay to ensure form is in DOM
        setTimeout(() => {
          toast.success('Переходимо на оплату...');
          form.submit();
        }, 100);
        
        return;
        }
      }

      // Redirect to success for cash on delivery
      navigate('/checkout/success', {
        state: {
          orderNumber: response.data.order_number,
          orderId: response.data.order_id,
          total: response.data.total_amount
        }
      });

      toast.success('Замовлення успішно оформлено!');

    } catch (error) {
      console.error('Order error:', error);
      toast.error(error.response?.data?.detail || 'Помилка оформлення замовлення');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load cart if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  // Update customer data from user
  useEffect(() => {
    if (user) {
      setCustomerData(prev => ({
        full_name: user.full_name || prev.full_name,
        phone: user.phone || prev.phone,
        email: user.email || prev.email
      }));
    }
  }, [user]);

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12" data-testid="empty-cart-checkout">
        <div className="container-main px-4 text-center">
          <ShoppingBag className="w-24 h-24 text-gray-300 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Кошик порожній</h1>
          <p className="text-gray-600 mb-8">Додайте товари до кошика для оформлення замовлення</p>
          <Button onClick={() => navigate('/products')} className="bg-green-600 hover:bg-green-700">
            Перейти до каталогу
          </Button>
        </div>
      </div>
    );
  }

  // Steps configuration
  const steps = [
    { id: 1, title: 'Контакти', icon: User },
    { id: 2, title: 'Доставка', icon: Truck },
    { id: 3, title: 'Оплата', icon: CreditCard }
  ];

  return (
    <div className="min-h-screen bg-gray-50" data-testid="checkout-v3">
      {/* Trust Strip */}
      <CheckoutTrustStrip />

      <div className="container-main px-4 py-8">
        {/* Back Button & Title */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate('/cart')}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Оформлення замовлення
          </h1>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div 
                className={`flex items-center gap-2 cursor-pointer ${
                  currentStep >= step.id ? 'text-green-600' : 'text-gray-400'
                }`}
                onClick={() => validateStep(currentStep) && currentStep > step.id && setCurrentStep(step.id)}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep > step.id 
                    ? 'bg-green-600 text-white'
                    : currentStep === step.id 
                      ? 'bg-green-100 text-green-600 border-2 border-green-600'
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span className={`font-medium hidden sm:block ${
                  currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 md:w-24 h-1 mx-2 rounded ${
                  currentStep > step.id ? 'bg-green-600' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Forms */}
            <div className="lg:col-span-2 space-y-8">

              {/* Step 1: Customer Info with New/Existing Choice */}
              <Card className={`p-6 ${currentStep === 1 ? 'ring-2 ring-green-500' : ''}`} data-testid="step-contacts">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setCurrentStep(1)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      currentStep > 1 ? 'bg-green-600 text-white' : 'bg-green-100 text-green-600'
                    }`}>
                      {currentStep > 1 ? <CheckCircle className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">1. Контактні дані</h2>
                      {currentStep > 1 && customerData.full_name && (
                        <p className="text-sm text-gray-500">{customerData.full_name}, +38 {customerData.phone}</p>
                      )}
                    </div>
                  </div>
                  {currentStep !== 1 && <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>

                {currentStep === 1 && (
                  <div className="mt-6 space-y-6">
                    
                    {/* Customer Type Selection (for guests) */}
                    {!isAuthenticated && !customerType && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setCustomerType('new')}
                          className="p-5 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left group"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                              <UserPlus className="w-5 h-5 text-green-600" />
                            </div>
                            <span className="font-semibold text-gray-900">Новий клієнт</span>
                          </div>
                          <p className="text-sm text-gray-500">Оформлю замовлення як гість або зареєструюсь</p>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => { setCustomerType('existing'); setShowLoginForm(true); }}
                          className="p-5 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                              <LogIn className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="font-semibold text-gray-900">Вже маю акаунт</span>
                          </div>
                          <p className="text-sm text-gray-500">Увійду та використаю збережені дані</p>
                        </button>
                      </div>
                    )}

                    {/* Login Form for Existing Customers */}
                    {customerType === 'existing' && showLoginForm && !isAuthenticated && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
                        <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                          <LogIn className="w-5 h-5" />
                          Вхід в акаунт
                        </h3>
                        <div className="space-y-3">
                          <Input
                            type="email"
                            placeholder="Email"
                            value={loginData.email}
                            onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                            className="h-11"
                          />
                          <Input
                            type="password"
                            placeholder="Пароль"
                            value={loginData.password}
                            onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                            className="h-11"
                          />
                          <div className="flex gap-3">
                            <Button
                              type="button"
                              onClick={async () => {
                                const result = await login(loginData.email, loginData.password);
                                if (result.success) {
                                  toast.success('Ви увійшли в акаунт');
                                  setShowLoginForm(false);
                                } else {
                                  // Show proper error message
                                  if (result.error?.includes('not found') || result.error?.includes('не знайден')) {
                                    toast.error('Користувача з такою поштою не існує. Оформіть як новий клієнт.');
                                    setCustomerType(null); // Reset to choose again
                                  } else {
                                    toast.error(result.error || 'Невірний email або пароль');
                                  }
                                }
                              }}
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                            >
                              Увійти
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => { setCustomerType('new'); setShowLoginForm(false); }}
                            >
                              Скасувати
                            </Button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          className="w-full flex items-center justify-center gap-2 p-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Увійти через Google
                        </button>
                      </div>
                    )}

                    {/* Contact Form (shown for new customers or after login) */}
                    {(customerType === 'new' || isAuthenticated) && (
                      <>
                        {/* Name fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="first_name" className="flex items-center gap-2">
                              Ім'я <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="first_name"
                              value={customerData.first_name}
                              onChange={handleNameChange('first_name')}
                              placeholder="Іван"
                              required
                              className={`mt-1 h-12 rounded-xl ${errors.first_name ? 'border-red-500 focus:ring-red-500' : ''}`}
                              data-testid="input-firstname"
                            />
                            {errors.first_name && (
                              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {errors.first_name}
                              </p>
                            )}
                          </div>
                          
                          <div>
                            <Label htmlFor="last_name" className="flex items-center gap-2">
                              Прізвище <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="last_name"
                              value={customerData.last_name}
                              onChange={handleNameChange('last_name')}
                              placeholder="Петренко"
                              required
                              className={`mt-1 h-12 rounded-xl ${errors.last_name ? 'border-red-500 focus:ring-red-500' : ''}`}
                              data-testid="input-lastname"
                            />
                            {errors.last_name && (
                              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {errors.last_name}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="phone" className="flex items-center gap-2">
                              Телефон <span className="text-red-500">*</span>
                              {phoneOperator && (
                                <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                  {phoneOperator}
                                </span>
                              )}
                            </Label>
                            <div className="relative mt-1 flex border border-gray-900 rounded-xl overflow-hidden">
                              <span className="inline-flex items-center px-4 text-gray-500 bg-white border-r border-gray-900 text-sm">
                                +38
                              </span>
                              <input
                                id="phone"
                                value={customerData.phone}
                                onChange={handlePhoneChange}
                                placeholder="0XX XXX XX XX"
                                required
                                className={`flex-1 h-12 px-4 outline-none bg-white ${errors.phone ? 'ring-2 ring-red-500' : ''}`}
                                data-testid="input-phone"
                              />
                            </div>
                            {errors.phone && (
                              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {errors.phone}
                              </p>
                            )}
                          </div>
                          
                          <div>
                            <Label htmlFor="email">Email (для підтвердження)</Label>
                            <div className="relative mt-1">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <Input
                                id="email"
                                type="email"
                                value={customerData.email}
                                onChange={handleEmailChange}
                                placeholder="your@email.com"
                                className={`pl-11 h-12 rounded-xl ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                                data-testid="input-email"
                              />
                            </div>
                            {errors.email && (
                              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {errors.email}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Register checkbox for guests */}
                        {!isAuthenticated && customerData.email && (
                          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                            <input
                              type="checkbox"
                              id="register"
                              className="mt-1 w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                            />
                            <label htmlFor="register" className="text-sm">
                              <span className="font-medium text-green-900">Створити акаунт</span>
                              <p className="text-green-700 mt-0.5">
                                Зберігайте історію замовлень та отримуйте знижки
                              </p>
                            </label>
                          </div>
                        )}

                        <div className="pt-4">
                          <Button
                            type="button"
                            onClick={() => validateStep(1) && setCurrentStep(2)}
                            className="w-full h-12 bg-green-600 hover:bg-green-700 rounded-xl"
                            data-testid="next-step-1"
                          >
                            Далі — Доставка
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </Card>

              {/* Step 2: Delivery */}
              <Card className={`p-6 ${currentStep === 2 ? 'ring-2 ring-green-500' : ''}`} data-testid="step-delivery">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => currentStep >= 2 && setCurrentStep(2)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      currentStep > 2 ? 'bg-green-600 text-white' : currentStep >= 2 ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {currentStep > 2 ? <CheckCircle className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">2. Доставка</h2>
                      {currentStep > 2 && deliveryData.warehouse_name && (
                        <p className="text-sm text-gray-500">{deliveryData.city_name}, {deliveryData.warehouse_name}</p>
                      )}
                    </div>
                  </div>
                  {currentStep !== 2 && currentStep > 1 && <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>

                {currentStep === 2 && (
                  <div className="mt-6 space-y-4">
                    <NovaPoshtaDelivery
                      onAddressChange={handleNovaPoshtaChange}
                      cartTotal={subtotal}
                      freeDeliveryThreshold={FREE_DELIVERY_THRESHOLD}
                    />

                    {/* Free delivery upsell */}
                    {subtotal < FREE_DELIVERY_THRESHOLD && subtotal > 0 && (
                      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                        <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="font-semibold text-green-800">
                              Безкоштовна доставка від {FREE_DELIVERY_THRESHOLD.toLocaleString()} ₴
                            </p>
                            <p className="text-sm text-green-600">
                              Додайте ще {(FREE_DELIVERY_THRESHOLD - subtotal).toLocaleString()} ₴ для безкоштовної доставки
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep(1)}
                        className="flex-1 h-12"
                      >
                        Назад
                      </Button>
                      <Button
                        type="button"
                        onClick={() => validateStep(2) && setCurrentStep(3)}
                        className="flex-1 h-12 bg-green-600 hover:bg-green-700"
                        data-testid="next-step-2"
                      >
                        Далі — Оплата
                      </Button>
                    </div>
                  </div>
                )}
              </Card>

              {/* Step 3: Payment */}
              <Card className={`p-6 ${currentStep === 3 ? 'ring-2 ring-green-500' : ''}`} data-testid="step-payment">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => currentStep >= 3 && setCurrentStep(3)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      currentStep >= 3 ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
                    }`}>
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">3. Оплата</h2>
                  </div>
                  {currentStep !== 3 && currentStep > 2 && <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>

                {currentStep === 3 && (
                  <div className="mt-6 space-y-4">
                    <div className="space-y-3">
                      <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        paymentMethod === 'card' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="payment"
                          value="card"
                          checked={paymentMethod === 'card'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-5 h-5 text-green-600"
                          data-testid="payment-card"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">Оплата карткою онлайн</p>
                          <p className="text-sm text-gray-500">Visa, Mastercard — безпечно через платіжний шлюз</p>
                        </div>
                        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                          Рекомендовано
                        </div>
                      </label>

                      <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        paymentMethod === 'cash_on_delivery' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="payment"
                          value="cash_on_delivery"
                          checked={paymentMethod === 'cash_on_delivery'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-5 h-5 text-green-600"
                          data-testid="payment-cod"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">Оплата при отриманні</p>
                          <p className="text-sm text-gray-500">Готівкою або карткою у відділенні Нової Пошти</p>
                        </div>
                      </label>
                    </div>

                    {/* Comment */}
                    <div>
                      <Label htmlFor="comment">Коментар до замовлення (необов'язково)</Label>
                      <textarea
                        id="comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Додаткові побажання, уточнення..."
                        rows={3}
                        className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all resize-none"
                        data-testid="input-comment"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep(2)}
                        className="flex-1 h-12 rounded-xl"
                      >
                        Назад
                      </Button>
                      <Button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 h-12 bg-green-600 hover:bg-green-700 rounded-xl"
                        data-testid="submit-order"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Обробка...
                          </span>
                        ) : paymentMethod === 'card' ? (
                          'Оплатити онлайн'
                        ) : (
                          'Оформити замовлення'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <CheckoutSummarySticky
                cartItems={cartItems}
                subtotal={subtotal}
                deliveryCost={deliveryCost}
                total={total}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmit}
                freeDeliveryThreshold={FREE_DELIVERY_THRESHOLD}
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckoutV3;
