import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Eye, EyeOff, Image, X, Save, Upload, GripVertical } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const SlidesManagement = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    image_url: '',
    button_text: 'Детальніше',
    button_link: '/products',
    order: 0,
    active: true
  });

  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/admin/slides`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSlides(response.data);
    } catch (error) {
      console.error('Failed to fetch slides:', error);
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
      toast.error('Введіть заголовок');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      if (editingSlide) {
        await axios.put(`${API_URL}/api/admin/slides/${editingSlide.id}`, form, config);
        toast.success('Слайд оновлено');
      } else {
        await axios.post(`${API_URL}/api/admin/slides`, form, config);
        toast.success('Слайд створено');
      }
      
      resetForm();
      fetchSlides();
    } catch (error) {
      toast.error('Помилка збереження');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Видалити слайд?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/admin/slides/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Слайд видалено');
      fetchSlides();
    } catch (error) {
      toast.error('Помилка видалення');
    }
  };

  const toggleActive = async (slide) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/admin/slides/${slide.id}`, 
        { ...slide, active: !slide.active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchSlides();
    } catch (error) {
      toast.error('Помилка');
    }
  };

  const startEdit = (slide) => {
    setEditingSlide(slide);
    setForm({
      title: slide.title || '',
      subtitle: slide.subtitle || '',
      description: slide.description || '',
      image_url: slide.image_url || '',
      button_text: slide.button_text || 'Детальніше',
      button_link: slide.button_link || '/products',
      order: slide.order || 0,
      active: slide.active !== false
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingSlide(null);
    setShowForm(false);
    setForm({
      title: '',
      subtitle: '',
      description: '',
      image_url: '',
      button_text: 'Детальніше',
      button_link: '/products',
      order: 0,
      active: true
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <Image className="w-5 h-5 text-white" />
            </div>
            Слайдер банерів
          </h2>
          <p className="text-gray-500 mt-1">Керуйте банерами на головній сторінці</p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white"
        >
          <Plus size={18} className="mr-2" />
          Додати слайд
        </Button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {editingSlide ? 'Редагувати слайд' : 'Новий слайд'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label className="text-gray-700 font-medium">Заголовок *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Знижки до 50%"
                  className="mt-1.5 bg-gray-50 border-gray-200"
                />
              </div>

              <div>
                <Label className="text-gray-700 font-medium">Підзаголовок</Label>
                <Input
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  placeholder="На всю електроніку"
                  className="mt-1.5 bg-gray-50 border-gray-200"
                />
              </div>

              <div>
                <Label className="text-gray-700 font-medium">Опис</Label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Короткий опис акції"
                  rows={2}
                  className="mt-1.5 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-500"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700 font-medium">Текст кнопки</Label>
                  <Input
                    value={form.button_text}
                    onChange={(e) => setForm({ ...form, button_text: e.target.value })}
                    placeholder="Детальніше"
                    className="mt-1.5 bg-gray-50 border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium">Посилання</Label>
                  <Input
                    value={form.button_link}
                    onChange={(e) => setForm({ ...form, button_link: e.target.value })}
                    placeholder="/products"
                    className="mt-1.5 bg-gray-50 border-gray-200"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                  <span className="text-gray-600">Активний</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={resetForm} className="border-gray-200">
                  Скасувати
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-pink-600 to-rose-600 text-white">
                  <Save size={18} className="mr-2" />
                  {editingSlide ? 'Зберегти' : 'Створити'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Slides List */}
      <div className="grid gap-4">
        {slides.map((slide, index) => (
          <Card key={slide.id} className="bg-white p-4 shadow-sm border-0 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="text-gray-400 cursor-grab">
                <GripVertical size={20} />
              </div>
              
              <div className="w-24 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {slide.image_url ? (
                  <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Image size={24} />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800 truncate">{slide.title || 'Без заголовку'}</span>
                  {!slide.active && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">Прихований</span>
                  )}
                </div>
                {slide.subtitle && (
                  <p className="text-sm text-gray-500 truncate">{slide.subtitle}</p>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleActive(slide)}
                  className={slide.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}
                >
                  {slide.active ? <Eye size={16} /> : <EyeOff size={16} />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => startEdit(slide)}
                  className="text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                >
                  <Edit size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(slide.id)}
                  className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {slides.length === 0 && (
          <Card className="text-center py-16 bg-white border-0 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Image size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg">Слайди не знайдено</p>
            <p className="text-gray-400 text-sm mt-1">Створіть перший слайд для банера</p>
            <Button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="mt-4 bg-gradient-to-r from-pink-600 to-rose-600 text-white"
            >
              <Plus size={18} className="mr-2" />
              Створити слайд
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SlidesManagement;
