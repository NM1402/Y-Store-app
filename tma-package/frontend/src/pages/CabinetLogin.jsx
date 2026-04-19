import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, ArrowRight, Lock, ShoppingBag, User } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CabinetLogin = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [devCode, setDevCode] = useState('');

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate('/account');
    return null;
  }

  // Phone formatting
  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.length <= 2) return `+${digits}`;
    if (digits.length <= 5) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 8) return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    if (digits.length <= 10) return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
  };

  const handlePhoneChange = (e) => {
    setPhone(formatPhone(e.target.value));
  };

  // Request OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    
    const cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Введіть коректний номер телефону');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/v2/cabinet/otp/request`, {
        phone: cleanPhone
      });

      // Extract dev code from message
      const match = response.data.message?.match(/код (\d{6})/);
      if (match) {
        setDevCode(match[1]);
      }

      toast.success('Код надіслано!');
      setStep('otp');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Помилка. Перевірте номер телефону');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (otpCode.length !== 6) {
      toast.error('Введіть 6-значний код');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/v2/cabinet/otp/verify`, {
        phone: phone.replace(/\s/g, ''),
        code: otpCode
      });

      // Save cabinet token
      localStorage.setItem('cabinet_token', response.data.token);
      localStorage.setItem('cabinet_phone', response.data.phone);

      toast.success('Успішна авторизація!');
      navigate('/cabinet');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Невірний код');
    } finally {
      setIsLoading(false);
    }
  };

  // Google login
  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/auth-callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12" data-testid="cabinet-login-page">
      <div className="container-main px-4">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Особистий кабінет</h1>
            <p className="text-gray-600">Перегляд та відстеження ваших замовлень</p>
          </div>

          {/* Main Card */}
          <Card className="p-6" data-testid="login-card">
            {step === 'phone' ? (
              <>
                {/* Phone Entry */}
                <form onSubmit={handleRequestOTP}>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Номер телефону
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        type="tel"
                        value={phone}
                        onChange={handlePhoneChange}
                        placeholder="+38 0XX XXX XX XX"
                        className="pl-11 h-12 text-lg"
                        data-testid="phone-input"
                        autoFocus
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Введіть номер, який вказували при замовленні
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-green-600 hover:bg-green-700"
                    data-testid="request-otp-button"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Відправка...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Отримати код
                        <ArrowRight className="w-5 h-5" />
                      </span>
                    )}
                  </Button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-sm text-gray-500">або</span>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>

                {/* Google Login */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  className="w-full h-12 flex items-center justify-center gap-2"
                  data-testid="google-login-button"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Увійти через Google
                </Button>
              </>
            ) : (
              <>
                {/* OTP Entry */}
                <form onSubmit={handleVerifyOTP}>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Код підтвердження
                      </label>
                      <button
                        type="button"
                        onClick={() => setStep('phone')}
                        className="text-sm text-green-600 hover:text-green-700"
                      >
                        Змінити номер
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="pl-11 h-12 text-lg text-center tracking-widest font-mono"
                        maxLength={6}
                        data-testid="otp-input"
                        autoFocus
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Введіть 6-значний код з SMS на {phone}
                    </p>
                    
                    {/* Dev code hint */}
                    {devCode && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>DEV:</strong> Код для тестування: <span className="font-mono font-bold">{devCode}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || otpCode.length !== 6}
                    className="w-full h-12 bg-green-600 hover:bg-green-700"
                    data-testid="verify-otp-button"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Перевірка...
                      </span>
                    ) : (
                      'Підтвердити'
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={handleRequestOTP}
                    disabled={isLoading}
                    className="w-full mt-3 text-sm text-green-600 hover:text-green-700"
                  >
                    Надіслати код ще раз
                  </button>
                </form>
              </>
            )}
          </Card>

          {/* Info */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <ShoppingBag className="w-4 h-4" />
              <span>Перегляд замовлень за номером телефону</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CabinetLogin;
