import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { User, Mail, Lock, AlertCircle } from 'lucide-react';

const Register = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const errs = {};

    if (!form.name || form.name.trim().length < 2) {
      errs.name = "Ім'я повинно містити мінімум 2 символи";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      errs.email = "Некоректна email адреса";
    }

    if (form.password.length < 8) {
      errs.password = "Пароль мінімум 8 символів";
    }

    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Clear error on change
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    const result = await register({
      full_name: form.name,
      email: form.email,
      password: form.password,
      role: 'customer' // Always customer
    });
    
    if (result.success) {
      toast.success('Акаунт успішно створено!');
      navigate('/');
    } else {
      toast.error(result.error || 'Помилка реєстрації');
    }
    
    setLoading(false);
  };

  return (
    <div data-testid="register-page" className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">👋</span>
          </div>
          <h1 data-testid="register-title" className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Створити акаунт
          </h1>
          <p className="mt-2 text-gray-500">Приєднуйтесь до Y-Store</p>
        </div>

        {/* Form */}
        <form data-testid="register-form" onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <div className="space-y-5">
            {/* Name */}
            <div>
              <Label htmlFor="name" className="text-gray-700 font-semibold">Ім'я</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  data-testid="fullname-input"
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Ваше ім'я"
                  className={`pl-10 ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-gray-700 font-semibold">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  data-testid="email-input"
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className={`pl-10 ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" className="text-gray-700 font-semibold">Пароль</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  data-testid="password-input"
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Мінімум 8 символів"
                  className={`pl-10 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.password}
                </p>
              )}
            </div>
          </div>

          {/* Submit */}
          <Button 
            data-testid="submit-button" 
            type="submit" 
            className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 rounded-xl"
            disabled={loading}
          >
            {loading ? 'Створення...' : 'Створити акаунт'}
          </Button>

          {/* Login Link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Вже маєте акаунт?{' '}
            <Link data-testid="login-link" to="/login" className="text-blue-600 hover:underline font-semibold">
              Увійти
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
