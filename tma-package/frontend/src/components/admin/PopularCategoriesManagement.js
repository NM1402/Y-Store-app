import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Eye, EyeOff, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
// Use shared icon configuration (removes duplication)
import { iconComponents, filterIcons } from './shared/iconConfig';
// Use centralized API client
import apiClient from '../../utils/api/apiClient';

const PopularCategoriesManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  const [form, setForm] = useState({
    name: '',
    icon: 'Smartphone',
    image_url: '',
    product_ids: [],
    order: 0,
    active: true
  });
  const [uploading, setUploading] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Use shared icon filter
  const filteredIcons = filterIcons(iconSearch);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/admin/popular-categories');
      console.log('Fetched categories:', response.data);
      setCategories(response.data || []);
    } catch (error) {
      console.error('Failed to fetch popular categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      setProducts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    try {
      const dataToSave = {
        ...form,
        product_ids: selectedProducts.map(p => p.id)
      };
      
      if (editingCategory) {
        await apiClient.put(`/admin/popular-categories/${editingCategory.id}`, dataToSave);
        toast.success('Категорію оновлено!');
      } else {
        await apiClient.post('/admin/popular-categories', dataToSave);
        toast.success('Категорію створено!');
      }
      
      setShowAddForm(false);
      setEditingCategory(null);
      setForm({ name: '', icon: 'Smartphone', image_url: '', product_ids: [], order: categories?.length || 0, active: true });
      setSelectedProducts([]);
      fetchCategories();
    } catch (error) {
      console.error('Failed to save category:', error);
      toast.error('Помилка збереження');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const imageUrl = `${process.env.REACT_APP_BACKEND_URL}${response.data.url}`;
      setForm(prev => ({ ...prev, image_url: imageUrl }));
      toast.success('Зображення завантажено!');
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Помилка завантаження зображення: ' + (error.message || 'Невідома помилка'));
    } finally {
      setUploading(false);
    }
  };


  const handleDelete = async (categoryId) => {
    if (!window.confirm('Видалити цю категорію?')) return;
    
    try {
      await apiClient.delete(`/admin/popular-categories/${categoryId}`);
      toast.success('Категорію видалено!');
      fetchCategories();
    } catch (error) {
      toast.error('Помилка видалення');
    }
  };

  const handleToggleActive = async (category) => {
    try {
      await apiClient.put(
        `/admin/popular-categories/${category.id}`,
        { active: !category.active }
      );
      toast.success(category.active ? 'Категорію приховано' : 'Категорію активовано');
      fetchCategories();
    } catch (error) {
      toast.error('Помилка зміни статусу');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      icon: category.icon || 'Smartphone',
      image_url: category.image_url || '',
      product_ids: category.product_ids || [],
      order: category.order,
      active: category.active
    });
    
    // Load selected products
    if (category.product_ids && category.product_ids.length > 0) {
      const selected = products.filter(p => category.product_ids.includes(p.id));
      setSelectedProducts(selected);
    } else {
      setSelectedProducts([]);
    }
    
    setShowAddForm(true);
  };

  const handleMove = async (categoryId, direction) => {
    const currentIndex = categories.findIndex(c => c.id === categoryId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === (categories?.length || 0) - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const cat1 = categories[currentIndex];
    const cat2 = categories[newIndex];

    try {
      await Promise.all([
        apiClient.put(`/admin/popular-categories/${cat1.id}`, { order: cat2.order }),
        apiClient.put(`/admin/popular-categories/${cat2.id}`, { order: cat1.order })
      ]);
      fetchCategories();
    } catch (error) {
      toast.error('Помилка зміни порядку');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Популярні категорії на головній</h2>
          <p className="text-gray-600 mt-1">Налаштуйте категорії які відображаються під баннером</p>
        </div>
        <Button 
          onClick={() => {
            setEditingCategory(null);
            setForm({ name: '', icon: 'Smartphone', image_url: '', order: categories?.length || 0, active: true });
            setShowAddForm(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Додати категорію
        </Button>
      </div>

      {/* Форма добавления/редактирования */}
      {showAddForm && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">
            {editingCategory ? 'Редагувати категорію' : 'Нова популярна категорія'}
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Назва категорії *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="СМАРТФОНИ"
                required
                className="uppercase"
              />
              <p className="text-xs text-gray-500 mt-1">
                Рекомендуємо коротку назву (до 12 символів)
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-lg font-semibold">Виберіть іконку *</Label>
                <p className="text-xs text-gray-500 mb-3">Оберіть іконку, яка найкраще відображає категорію</p>
                
                <div className="mb-3">
                  <Input
                    placeholder="🔍 Пошук іконки..."
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl max-h-96 overflow-y-auto border-2 border-blue-200">
                  {filteredIcons.map((iconOption) => {
                    const IconComponent = iconComponents[iconOption.name];
                    return (
                      <button
                        key={iconOption.name}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setForm({ ...form, icon: iconOption.name });
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 ${
                          form.icon === iconOption.name
                            ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 scale-105 shadow-lg'
                            : 'bg-white text-gray-700 hover:bg-blue-100 hover:scale-105 shadow-md'
                        }`}
                        title={iconOption.label}
                      >
                        <IconComponent className="w-8 h-8 mb-1" />
                        <span className="text-[9px] font-medium text-center leading-tight">
                          {iconOption.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {filteredIcons.length === 0 && (
                  <p className="text-center text-gray-500 py-8">Іконки не знайдено</p>
                )}

                <div className="mt-4 p-4 bg-white rounded-xl border-2 border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl">
                      {(() => {
                        const IconComponent = iconComponents[form.icon];
                        return <IconComponent className="w-10 h-10 text-blue-600" />;
                      })()}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-semibold">Вибрана іконка:</p>
                      <p className="text-lg font-bold text-gray-800">
                        {iconOptions.find(i => i.name === form.icon)?.label || form.icon}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t-2 border-gray-200 pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-sm text-gray-600">Зображення категорії (опційно)</Label>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Не обов'язково</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">Якщо додасте зображення, воно буде відображатись замість іконки</p>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-gray-100 file:text-gray-700
                      hover:file:bg-gray-200
                      disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={uploading}
                  />
                  {uploading && (
                    <p className="text-sm text-blue-600 mt-2 animate-pulse">⏳ Завантаження зображення...</p>
                  )}
                  {form.image_url && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-2">Попередній перегляд:</p>
                      <div className="relative inline-block">
                        <img
                          src={form.image_url}
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded-xl border-2 border-blue-300 shadow-md"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setForm({ ...form, image_url: '' });
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
                          title="Видалити зображення"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Product Selection */}
            <div className="border-t-2 border-gray-200 pt-6">
              <Label className="text-lg font-semibold mb-3 block">Вибір товарів для категорії</Label>
              <p className="text-sm text-gray-500 mb-4">
                Виберіть товари, які будуть відображатися в цій категорії (мінімум 4 рекомендовано)
              </p>

              {/* Search */}
              <div className="mb-4">
                <Input
                  placeholder="🔍 Пошук товарів за назвою..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Selected Products */}
              {selectedProducts.length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900 mb-2">
                    Вибрано товарів: {selectedProducts.length}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProducts.map(product => (
                      <div
                        key={product.id}
                        className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-blue-200"
                      >
                        <span className="text-sm">{product.title}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedProducts(prev => prev.filter(p => p.id !== product.id))}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Products */}
              <div className="max-h-96 overflow-y-auto border rounded-lg">
                {products
                  .filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  .filter(p => !selectedProducts.find(sp => sp.id === p.id))
                  .map(product => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b cursor-pointer"
                      onClick={() => setSelectedProducts(prev => [...prev, product])}
                    >
                      <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                        {product.images && product.images[0] ? (
                          <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ShoppingBag className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.title}</p>
                        <p className="text-xs text-gray-500">{product.price} грн</p>
                      </div>
                      <Plus className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <Label>Порядок (0 = перший)</Label>
              <Input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="active" className="cursor-pointer">
                Активна (відображається на сайті)
              </Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingCategory ? 'Зберегти зміни' : 'Створити категорію'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowAddForm(false);
                  setEditingCategory(null);
                  setForm({ name: '', icon: 'Smartphone', image_url: '', product_ids: [], order: 0, active: true });
                  setSelectedProducts([]);
                  setSearchQuery('');
                }}
              >
                Скасувати
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Список категорий */}
      <div className="grid gap-4">
        {(categories?.length || 0) === 0 ? (
          <Card className="p-12 text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">Немає популярних категорій</h3>
            <p className="text-gray-600 mb-6">Створіть категорії для відображення на головній сторінці</p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Додати категорію
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((category, index) => (
              <Card key={category.id} className={`p-4 ${!category.active ? 'opacity-60' : ''}`}>
                <div className="flex flex-col items-center">
                  {/* Предпросмотр */}
                  <div className="w-24 h-24 mb-3 flex items-center justify-center rounded-xl overflow-hidden border-2 border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50">
                    {category.image_url ? (
                      <img 
                        src={category.image_url} 
                        alt={category.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (() => {
                      const IconComponent = iconComponents[category.icon];
                      return IconComponent ? (
                        <IconComponent className="w-12 h-12 text-blue-600" />
                      ) : (
                        <div className="text-4xl">{category.icon}</div>
                      );
                    })()}
                  </div>
                  <h3 className="font-bold text-center mb-2">{category.name}</h3>
                  
                  <div className="flex flex-col items-center gap-1 mb-3">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {(category.product_ids?.length || 0)} товарів
                    </span>
                    
                    {!category.active && (
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                        Прихована
                      </span>
                    )}
                  </div>
                  
                  {/* Управление */}
                  <div className="flex flex-wrap gap-2 mt-auto">
                    <button
                      onClick={() => handleMove(category.id, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                      title="Вгору"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMove(category.id, 'down')}
                      disabled={index === (categories?.length || 0) - 1}
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                      title="Вниз"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-1 hover:bg-blue-100 rounded text-blue-600"
                      title="Редагувати"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(category)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title={category.active ? 'Приховати' : 'Показати'}
                    >
                      {category.active ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                      title="Видалити"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Предпросмотр */}
      {(categories?.length || 0) > 0 && (
        <Card className="p-6 bg-gray-50">
          <h3 className="font-bold mb-4">Попередній перегляд на сайті:</h3>
          <div className="bg-white py-6 rounded-xl border border-gray-200">
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3 px-4">
              {categories.filter(c => c.active).map((category) => {
                const IconComponent = iconComponents[category.icon];
                return (
                  <div
                    key={category.id}
                    className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all"
                  >
                    <div className="w-12 h-12 flex items-center justify-center mb-2 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                      {category.image_url ? (
                        <img src={category.image_url} alt={category.name} className="w-full h-full object-cover rounded-lg" />
                      ) : IconComponent ? (
                        <IconComponent className="w-8 h-8 text-blue-600" />
                      ) : (
                        <span className="text-2xl">{category.icon}</span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-gray-700 text-center leading-tight uppercase">
                      {category.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PopularCategoriesManagement;
