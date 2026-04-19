import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, googleLogin } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        toast.success(t('loginSuccess'));
        
        // Redirect based on user role
        const user = JSON.parse(localStorage.getItem('user'));
        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          // Regular users go to account
          navigate('/account');
        }
      } else {
        // Переводим сообщение об ошибке
        let errorMsg = result.error;
        if (errorMsg.includes('Invalid credentials')) {
          errorMsg = t('loginFailed') + ': ' + (language === 'ua' ? 'Невірний email або пароль' : 'Неверный email или пароль');
        } else if (errorMsg.includes('User not found')) {
          errorMsg = language === 'ua' ? 'Користувача не знайдено' : 'Пользователь не найден';
        } else if (!errorMsg.includes('Помилка') && !errorMsg.includes('Ошибка')) {
          errorMsg = t('loginFailed');
        }
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMsg = language === 'ua' ? 'Помилка підключення до серверу' : 'Ошибка подключения к серверу';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="login-page" className="min-h-[80vh] flex items-center justify-center py-12 px-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-md w-full space-y-8 animate-fadeIn">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl transform rotate-3 hover:rotate-0 transition-transform">
              <span className="text-4xl">👋</span>
            </div>
          </div>
          <h2 data-testid="login-title" className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {t('welcomeBack')}
          </h2>
          <p className="mt-3 text-gray-600 text-lg">{t('signInToAccount')}</p>
        </div>

        <form data-testid="login-form" onSubmit={handleSubmit} className="mt-8 space-y-6 bg-white/80 backdrop-blur-lg p-10 rounded-3xl shadow-2xl border border-white/20">
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">{t('emailAddress')}</Label>
              <Input
                data-testid="email-input"
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                data-testid="password-input"
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
              />
            </div>
          </div>

          <Button 
            data-testid="submit-button" 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-xl text-lg font-bold shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95" 
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {t('signingIn')}
              </span>
            ) : (
              t('signIn')
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">або</span>
            </div>
          </div>

          {/* Google Login Button */}
          <Button 
            type="button"
            onClick={googleLogin}
            variant="outline"
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-lg font-semibold border-2 hover:bg-gray-50 transition-all"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {language === 'ua' ? 'Увійти через Google' : 'Войти через Google'}
          </Button>

          <p className="text-center text-base text-gray-600">
            {t('dontHaveAccount')}{' '}
            <Link data-testid="register-link" to="/register" className="text-blue-600 hover:text-purple-600 font-bold hover:underline transition-colors">
              {t('signUp')} →
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;