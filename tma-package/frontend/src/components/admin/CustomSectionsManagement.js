import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Save, X, Layout, Eye, EyeOff, Package } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const CustomSectionsManagement = () => {
  const [sections, setSections] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [searchProduct, setSearchProduct] = useState('');
  
  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    product_ids: [],
    display_on_home: true,
    order: 0,
    active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [sectionsRes, productsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/custom-sections`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/products?limit=100`)
      ]);
      
      setSections(sectionsRes.data.sort((a, b) => a.order - b.order));
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!form.title) {
      toast.error('Введіть назву розділу');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      // Generate slug from title if empty
      const data = { 
        ...form, 
        slug: form.slug || form.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') 
      };
      
      if (editingSection) {
        await axios.put(`${API_URL}/api/admin/custom-sections/${editingSection.id}`, data, config);
        toast.success('Розділ оновлено');
      } else {
        await axios.post(`${API_URL}/api/admin/custom-sections`, data, config);
        toast.success('Розділ створено');
      }
      
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Помилка збереження');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Видалити розділ?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/admin/custom-sections/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Розділ видалено');
      fetchData();
    } catch (error) {
      toast.error('Помилка видалення');
    }
  };

  const toggleActive = async (section) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/admin/custom-sections/${section.id}`, 
        { ...section, active: !section.active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData();
    } catch (error) {
      toast.error('Помилка');
    }
  };

  const startEdit = (section) => {
    setEditingSection(section);
    setForm({
      title: section.title || '',
      slug: section.slug || '',
      description: section.description || '',
      product_ids: section.product_ids || [],
      display_on_home: section.display_on_home !== false,
      order: section.order || 0,
      active: section.active !== false
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingSection(null);
    setShowForm(false);
    setSearchProduct('');
    setForm({
      title: '',
      slug: '',
      description: '',
      product_ids: [],
      display_on_home: true,
      order: sections.length,
      active: true
    });
  };

  const toggleProduct = (productId) => {
    setForm(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter(id => id !== productId)
        : [...prev.product_ids, productId]
    }));
  };

  const filteredProducts = products.filter(p => 
    p.title?.toLowerCase().includes(searchProduct.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Layout className="w-5 h-5 text-white" />
            </div>
            Кастомні секції
          </h2>
          <p className="text-gray-500 mt-1">Створюйте власні добірки товарів</p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
        >
          <Plus size={18} className="mr-2" />
          Нова секція
        </Button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {editingSection ? 'Редагувати секцію' : 'Нова секція'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700 font-medium">Назва *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Хіти продажів"
                    className="mt-1.5 bg-gray-50 border-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium">Slug</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="hits-prodazhiv"
                    className="mt-1.5 bg-gray-50 border-gray-200"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-700 font-medium">Опис</Label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Короткий опис секції"
                  rows={2}
                  className="mt-1.5 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <Label className="text-gray-700 font-medium">Товари ({form.product_ids.length} обрано)</Label>
                <Input
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  placeholder="Пошук товарів..."
                  className="mt-1.5 bg-gray-50 border-gray-200"
                />
                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {filteredProducts.slice(0, 20).map(product => (
                    <label
                      key={product.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={form.product_ids.includes(product.id)}
                        onChange={() => toggleProduct(product.id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Package size={16} />
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-gray-700 truncate">{product.title}</span>
                    </label>
                  ))}
                  {filteredProducts.length === 0 && (
                    <p className="text-center text-gray-400 py-4">Товари не знайдено</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.display_on_home}
                    onChange={(e) => setForm({ ...form, display_on_home: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-gray-600">На головній</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-gray-600">Активна</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={resetForm} className="border-gray-200">
                  Скасувати
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                  <Save size={18} className="mr-2" />
                  {editingSection ? 'Зберегти' : 'Створити'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Sections List */}
      <div className="grid gap-4">
        {sections.map((section) => (
          <Card key={section.id} className="bg-white p-4 shadow-sm border-0 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                <Layout className="w-6 h-6 text-indigo-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">{section.title}</span>
                  <code className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">/{section.slug}</code>
                  {!section.active && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">Прихована</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {section.product_ids?.length || 0} товарів
                  {section.display_on_home && <span className="text-indigo-500"> • На головній</span>}
                </p>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleActive(section)}
                  className={section.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}
                >
                  {section.active ? <Eye size={16} /> : <EyeOff size={16} />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => startEdit(section)}
                  className="text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                >
                  <Edit size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(section.id)}
                  className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {sections.length === 0 && (
          <Card className="text-center py-16 bg-white border-0 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Layout size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg">Секції не знайдено</p>
            <p className="text-gray-400 text-sm mt-1">Створіть власну добірку товарів</p>
            <Button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
            >
              <Plus size={18} className="mr-2" />
              Створити секцію
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CustomSectionsManagement;
