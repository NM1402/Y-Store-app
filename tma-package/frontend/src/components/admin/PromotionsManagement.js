import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Eye, EyeOff, Gift, X, Save, Upload, Calendar, Percent } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const PromotionsManagement = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    image_url: '',
    discount_text: '',
    link_url: '/products',
    countdown_enabled: false,
    countdown_end_date: '',
    active: true
  });

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/admin/promotions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPromotions(response.data);
    } catch (error) {
      console.error('Failed to fetch promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Оберіть файл зображення');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Максимум 5 МБ');
      return;
    }
    
    try {
      setUploadingImage(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API_URL}/api/upload/image`, formData, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      
      setForm({ ...form, image_url: `${API_URL}${response.data.url}` });
      toast.success('Зображення завантажено');
    } catch (error) {
      toast.error('Помилка завантаження');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!form.title) {
      toast.error('Введіть назву акції');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const data = { ...form };
      if (data.countdown_enabled && data.countdown_end_date) {
        data.countdown_end_date = new Date(data.countdown_end_date).toISOString();
      }
      
      if (editingPromotion) {
        await axios.put(`${API_URL}/api/admin/promotions/${editingPromotion.id}`, data, config);
        toast.success('Акцію оновлено');
      } else {
        await axios.post(`${API_URL}/api/admin/promotions`, data, config);
        toast.success('Акцію створено');
      }
      
      resetForm();
      fetchPromotions();
    } catch (error) {
      toast.error('Помилка збереження');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Видалити акцію?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/admin/promotions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Акцію видалено');
      fetchPromotions();
    } catch (error) {
      toast.error('Помилка видалення');
    }
  };

  const toggleActive = async (promotion) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/admin/promotions/${promotion.id}`, 
        { ...promotion, active: !promotion.active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPromotions();
    } catch (error) {
      toast.error('Помилка');
    }
  };

  const startEdit = (promotion) => {
    setEditingPromotion(promotion);
    setForm({
      title: promotion.title || '',
      description: promotion.description || '',
      image_url: promotion.image_url || '',
      discount_text: promotion.discount_text || '',
      link_url: promotion.link_url || '/products',
      countdown_enabled: promotion.countdown_enabled || false,
      countdown_end_date: promotion.countdown_end_date ? promotion.countdown_end_date.slice(0, 16) : '',
      active: promotion.active !== false
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingPromotion(null);
    setShowForm(false);
    setForm({
      title: '',
      description: '',
      image_url: '',
      discount_text: '',
      link_url: '/products',
      countdown_enabled: false,
      countdown_end_date: '',
      active: true
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Gift className="w-5 h-5 text-white" />
            </div>
            Акції та пропозиції
          </h2>
          <p className="text-gray-500 mt-1">Керуйте акційними пропозиціями магазину</p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
        >
          <Plus size={18} className="mr-2" />
          Нова акція
        </Button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {editingPromotion ? 'Редагувати акцію' : 'Нова акція'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label className="text-gray-700 font-medium">Назва акції *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Чорна п'ятниця"
                  className="mt-1.5 bg-gray-50 border-gray-200"
                />
              </div>

              <div>
                <Label className="text-gray-700 font-medium">Опис</Label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Опис акційної пропозиції"
                  rows={3}
                  className="mt-1.5 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <Label className="text-gray-700 font-medium">Текст знижки</Label>
                <Input
                  value={form.discount_text}
                  onChange={(e) => setForm({ ...form, discount_text: e.target.value })}
                  placeholder="-50%"
                  className="mt-1.5 bg-gray-50 border-gray-200"
                />
              </div>

              <div>
                <Label className="text-gray-700 font-medium">Зображення</Label>
                <div className="mt-1.5 space-y-2">
                  {form.image_url && (
                    <img src={form.image_url} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                  )}
                  <div className="flex gap-2">
                    <label className="flex-1">
                      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <Upload size={18} className="text-gray-500" />
                        <span className="text-gray-600">{uploadingImage ? 'Завантаження...' : 'Завантажити'}</span>
                      </div>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                    </label>
                  </div>
                  <Input
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="Або вставте URL зображення"
                    className="bg-gray-50 border-gray-200"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-700 font-medium">Посилання</Label>
                <Input
                  value={form.link_url}
                  onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                  placeholder="/products?sale=true"
                  className="mt-1.5 bg-gray-50 border-gray-200"
                />
              </div>

              <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.countdown_enabled}
                    onChange={(e) => setForm({ ...form, countdown_enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-gray-700 font-medium flex items-center gap-2">
                    <Calendar size={16} />
                    Таймер зворотного відліку
                  </span>
                </label>
                
                {form.countdown_enabled && (
                  <Input
                    type="datetime-local"
                    value={form.countdown_end_date}
                    onChange={(e) => setForm({ ...form, countdown_end_date: e.target.value })}
                    className="bg-white border-gray-200"
                  />
                )}
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-gray-600">Активна</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={resetForm} className="border-gray-200">
                  Скасувати
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                  <Save size={18} className="mr-2" />
                  {editingPromotion ? 'Зберегти' : 'Створити'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Promotions List */}
      <div className="grid gap-4 md:grid-cols-2">
        {promotions.map((promotion) => (
          <Card key={promotion.id} className="bg-white overflow-hidden shadow-sm border-0 hover:shadow-md transition-shadow">
            {promotion.image_url && (
              <div className="h-32 bg-gray-100">
                <img src={promotion.image_url} alt={promotion.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800 truncate">{promotion.title}</span>
                    {promotion.discount_text && (
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-bold">
                        {promotion.discount_text}
                      </span>
                    )}
                  </div>
                  {promotion.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{promotion.description}</p>
                  )}
                  {!promotion.active && (
                    <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">Прихована</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1 mt-4 pt-3 border-t border-gray-100">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleActive(promotion)}
                  className={promotion.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}
                >
                  {promotion.active ? <Eye size={16} /> : <EyeOff size={16} />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => startEdit(promotion)}
                  className="text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                >
                  <Edit size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(promotion.id)}
                  className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {promotions.length === 0 && (
        <Card className="text-center py-16 bg-white border-0 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Gift size={32} className="text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg">Акції не знайдено</p>
          <p className="text-gray-400 text-sm mt-1">Створіть першу акційну пропозицію</p>
          <Button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="mt-4 bg-gradient-to-r from-orange-600 to-red-600 text-white"
          >
            <Plus size={18} className="mr-2" />
            Створити акцію
          </Button>
        </Card>
      )}
    </div>
  );
};

export default PromotionsManagement;
