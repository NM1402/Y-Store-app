import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { sellerAPI, productsAPI, categoriesAPI, aiAPI } from '../utils/api';
import { generateProductDescription, generateSEO } from '../services/aiService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import { Plus, Package, DollarSign, ShoppingBag, Sparkles, Edit, Trash2, Wand2 } from 'lucide-react';

const SellerDashboard = () => {
  const { user, isSeller } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    short_description: '',
    category_id: '',
    price: '',
    compare_price: '',
    stock_level: '',
    images: '',
    status: 'published'
  });

  useEffect(() => {
    if (!isSeller) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isSeller]);

  const fetchData = async () => {
    try {
      const [statsRes, productsRes, ordersRes, categoriesRes] = await Promise.all([
        sellerAPI.getStats(),
        sellerAPI.getProducts(),
        sellerAPI.getOrders(),
        categoriesAPI.getAll()
      ]);
      setStats(statsRes.data);
      setProducts(productsRes.data);
      setOrders(ordersRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === 'title') {
      setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }));
    }
  };

  const handleGenerateDescription = async () => {
    if (!formData.title || !formData.category_id) {
      toast.error('Заполните название и категорию');
      return;
    }

    setAiLoading(true);
    try {
      const category = categories.find(c => c.id === formData.category_id);
      
      // Use new OpenAI service (TEST VERSION)
      const response = await generateProductDescription({
        productName: formData.title,
        category: category?.name || 'General',
        price: formData.price ? parseFloat(formData.price) : null,
        features: formData.features ? formData.features.split(',') : []
      });
      
      if (response.success) {
        setFormData({
          ...formData,
          description: response.description,
          short_description: response.shortDescription
        });
        toast.success('✨ Описание сгенерировано AI! (OpenAI Test)');
      } else {
        toast.error('Ошибка генерации описания');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Ошибка генерации описания');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        compare_price: formData.compare_price ? parseFloat(formData.compare_price) : null,
        stock_level: parseInt(formData.stock_level),
        images: formData.images.split('\n').filter(img => img.trim())
      };

      await productsAPI.create(productData);
      toast.success('Товар добавлен!');
      setShowAddProduct(false);
      setFormData({
        title: '',
        slug: '',
        description: '',
        short_description: '',
        category_id: '',
        price: '',
        compare_price: '',
        stock_level: '',
        images: '',
        status: 'published'
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка добавления товара');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Удалить товар?')) return;

    try {
      await productsAPI.delete(productId);
      toast.success('Товар удален');
      fetchData();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  if (!isSeller) return null;

  return (
    <div data-testid="seller-dashboard" className="min-h-screen bg-gray-50 py-8">
      <div className="container-main">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Панель продавца</h1>
            <p className="text-gray-600">Добро пожаловать, {user?.full_name}</p>
          </div>
          <Button data-testid="add-product-button" onClick={() => setShowAddProduct(!showAddProduct)}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить товар
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Товары</p>
                  <p className="text-2xl font-bold">{stats.total_products}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Выручка</p>
                  <p className="text-2xl font-bold">${stats.total_revenue.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Заказы</p>
                  <p className="text-2xl font-bold">{stats.total_orders}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Product Form */}
        {showAddProduct && (
          <div className="bg-white rounded-2xl p-8 border border-gray-200 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Добавить новый товар</h2>
              <Button
                data-testid="ai-generate-button"
                variant="outline"
                onClick={handleGenerateDescription}
                disabled={aiLoading}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {aiLoading ? 'Генерация...' : 'AI Описание'}
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="title">Название товара *</Label>
                  <Input
                    data-testid="product-title"
                    id="title"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="MacBook Pro 16"
                  />
                </div>
                <div>
                  <Label htmlFor="category_id">Категория *</Label>
                  <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                    <SelectTrigger data-testid="category-select">
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="short_description">Краткое описание</Label>
                <Input
                  data-testid="short-description"
                  id="short_description"
                  name="short_description"
                  value={formData.short_description}
                  onChange={handleChange}
                  placeholder="Мощный ноутбук для профессионалов"
                />
              </div>

              <div>
                <Label htmlFor="description">Полное описание *</Label>
                <Textarea
                  data-testid="description"
                  id="description"
                  name="description"
                  required
                  value={formData.description}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Подробное описание товара..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="price">Цена *</Label>
                  <Input
                    data-testid="price"
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="299.99"
                  />
                </div>
                <div>
                  <Label htmlFor="compare_price">Старая цена</Label>
                  <Input
                    data-testid="compare-price"
                    id="compare_price"
                    name="compare_price"
                    type="number"
                    step="0.01"
                    value={formData.compare_price}
                    onChange={handleChange}
                    placeholder="399.99"
                  />
                </div>
                <div>
                  <Label htmlFor="stock_level">Количество *</Label>
                  <Input
                    data-testid="stock-level"
                    id="stock_level"
                    name="stock_level"
                    type="number"
                    required
                    value={formData.stock_level}
                    onChange={handleChange}
                    placeholder="50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="images">URL изображений (по одному на строку) *</Label>
                <Textarea
                  data-testid="images"
                  id="images"
                  name="images"
                  required
                  value={formData.images}
                  onChange={handleChange}
                  rows={3}
                  placeholder="https://images.unsplash.com/photo-...\nhttps://images.unsplash.com/photo-..."
                />
              </div>

              <div className="flex gap-4">
                <Button data-testid="submit-product" type="submit" disabled={loading}>
                  {loading ? 'Добавление...' : 'Добавить товар'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddProduct(false)}>
                  Отмена
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Products List */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200">
          <h2 className="text-2xl font-bold mb-6">Мои товары</h2>
          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:shadow-md">
                {product.images && product.images[0] && (
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{product.title}</h3>
                  <p className="text-sm text-gray-600">
                    ${product.price} • Склад: {product.stock_level} • Рейтинг: {product.rating}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(product.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;