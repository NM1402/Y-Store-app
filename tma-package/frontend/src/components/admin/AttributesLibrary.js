import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { toast } from 'sonner';
import { 
  Plus, Edit, Trash2, Save, X, Search,
  Hash, Type, ToggleLeft, List, Filter, Sliders, ChevronDown, Check
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

/**
 * Custom Dropdown Component
 */
const CustomSelect = ({ value, onChange, options, placeholder = 'Оберіть...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 h-10 px-4 min-w-[140px] bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[160px] bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                value === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              }`}
            >
              {value === option.value && <Check size={16} className="text-blue-600" />}
              <span className={value === option.value ? 'font-medium' : ''}>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Attributes Library - Manage attribute definitions
 * Redesigned to match Y-Store admin theme
 */
const AttributesLibrary = () => {
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAttr, setEditingAttr] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_uk: '',
    name_ru: '',
    type: 'string',
    unit: '',
    unit_uk: '',
    facetable: true,
    searchable: false,
    comparable: true,
    is_global: false,
    options: []
  });

  const typeOptions = [
    { value: 'number', label: 'Число', icon: Hash, desc: 'Ціна, пам\'ять, розмір', color: 'text-blue-600 bg-blue-50' },
    { value: 'string', label: 'Текст', icon: Type, desc: 'Бренд, модель', color: 'text-purple-600 bg-purple-50' },
    { value: 'boolean', label: 'Так/Ні', icon: ToggleLeft, desc: 'NFC, 5G', color: 'text-green-600 bg-green-50' },
    { value: 'enum', label: 'Вибір', icon: List, desc: 'Колір, тип екрану', color: 'text-orange-600 bg-orange-50' },
    { value: 'set', label: 'Множинний', icon: List, desc: 'Декілька значень', color: 'text-pink-600 bg-pink-50' }
  ];

  const fetchAttributes = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      
      const res = await fetch(`${API_URL}/api/v2/admin/attributes?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAttributes(data.items || []);
    } catch (err) {
      toast.error('Помилка завантаження атрибутів');
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchAttributes();
  }, [fetchAttributes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.code || !formData.name) {
      toast.error('Заповніть обов\'язкові поля');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingAttr 
        ? `${API_URL}/api/v2/admin/attributes/${editingAttr.id}`
        : `${API_URL}/api/v2/admin/attributes`;
      
      const res = await fetch(url, {
        method: editingAttr ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error');
      }

      toast.success(editingAttr ? 'Атрибут оновлено' : 'Атрибут створено');
      setIsEditing(false);
      setEditingAttr(null);
      resetForm();
      fetchAttributes();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (attr) => {
    if (!window.confirm(`Видалити атрибут "${attr.name}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/v2/admin/attributes/${attr.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('Атрибут видалено');
      fetchAttributes();
    } catch (err) {
      toast.error('Помилка видалення');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      name_uk: '',
      name_ru: '',
      type: 'string',
      unit: '',
      unit_uk: '',
      facetable: true,
      searchable: false,
      comparable: true,
      is_global: false,
      options: []
    });
  };

  const startEdit = (attr) => {
    setEditingAttr(attr);
    setFormData({
      code: attr.code,
      name: attr.name,
      name_uk: attr.name_uk || '',
      name_ru: attr.name_ru || '',
      type: attr.type,
      unit: attr.unit || '',
      unit_uk: attr.unit_uk || '',
      facetable: attr.facetable !== false,
      searchable: attr.searchable || false,
      comparable: attr.comparable !== false,
      is_global: attr.is_global || false,
      options: attr.options || []
    });
    setIsEditing(true);
  };

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { value: '', label: '', color_hex: '', sort: prev.options.length }]
    }));
  };

  const updateOption = (idx, field, value) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === idx ? { ...opt, [field]: value } : opt)
    }));
  };

  const removeOption = (idx) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== idx)
    }));
  };

  const filteredAttributes = attributes.filter(attr => {
    if (search && !attr.name.toLowerCase().includes(search.toLowerCase()) && 
        !attr.code.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getTypeConfig = (type) => {
    return typeOptions.find(t => t.value === type) || typeOptions[1];
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sliders className="w-5 h-5 text-white" />
            </div>
            Бібліотека атрибутів
          </h2>
          <p className="text-gray-500 mt-1">
            Створюйте атрибути для використання в фільтрах категорій
          </p>
        </div>
        <Button
          onClick={() => { resetForm(); setIsEditing(true); setEditingAttr(null); }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
        >
          <Plus size={18} className="mr-2" />
          Новий атрибут
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white shadow-sm border-0">
        <div className="flex items-center gap-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Пошук атрибутів..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 bg-gray-50 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <CustomSelect
            value={typeFilter}
            onChange={setTypeFilter}
            placeholder="Всі типи"
            options={[
              { value: '', label: 'Всі типи' },
              ...typeOptions.map(t => ({ value: t.value, label: t.label }))
            ]}
          />
        </div>
      </Card>

      {/* Edit Form Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  {editingAttr ? <Edit className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
                </div>
                {editingAttr ? 'Редагувати атрибут' : 'Новий атрибут'}
              </h3>
              <button 
                onClick={() => { setIsEditing(false); setEditingAttr(null); }} 
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700 font-medium">Код (snake_case) *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                    placeholder="memory_gb"
                    disabled={!!editingAttr}
                    className="mt-1.5 bg-gray-50 border-gray-200 focus:border-blue-500"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium">Тип *</Label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 mt-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                  >
                    {typeOptions.map(t => (
                      <option key={t.value} value={t.value}>{t.label} - {t.desc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700 font-medium">Назва (UK) *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value, name_uk: e.target.value }))}
                    placeholder="Пам'ять"
                    className="mt-1.5 bg-gray-50 border-gray-200 focus:border-blue-500"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium">Назва (RU)</Label>
                  <Input
                    value={formData.name_ru}
                    onChange={(e) => setFormData(prev => ({ ...prev, name_ru: e.target.value }))}
                    placeholder="Память"
                    className="mt-1.5 bg-gray-50 border-gray-200 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700 font-medium">Одиниця виміру</Label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="GB, кг, мм"
                    className="mt-1.5 bg-gray-50 border-gray-200 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-end gap-6 pb-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.facetable}
                      onChange={(e) => setFormData(prev => ({ ...prev, facetable: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-600 group-hover:text-gray-800">Фільтр</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.is_global}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_global: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-600 group-hover:text-gray-800">Глобальний</span>
                  </label>
                </div>
              </div>

              {/* Options for enum/set */}
              {(formData.type === 'enum' || formData.type === 'set') && (
                <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-700 font-medium">Варіанти вибору</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addOption} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                      <Plus size={14} className="mr-1" /> Додати
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {formData.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200">
                        <Input
                          value={opt.value}
                          onChange={(e) => updateOption(idx, 'value', e.target.value)}
                          placeholder="Значення"
                          className="flex-1 bg-white border-gray-200 h-9 text-sm"
                        />
                        <Input
                          value={opt.label}
                          onChange={(e) => updateOption(idx, 'label', e.target.value)}
                          placeholder="Підпис"
                          className="flex-1 bg-white border-gray-200 h-9 text-sm"
                        />
                        {formData.code?.includes('color') && (
                          <input
                            type="color"
                            value={opt.color_hex || '#3B82F6'}
                            onChange={(e) => updateOption(idx, 'color_hex', e.target.value)}
                            className="w-9 h-9 rounded-lg cursor-pointer border border-gray-200"
                          />
                        )}
                        <button 
                          type="button" 
                          onClick={() => removeOption(idx)} 
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {formData.options.length === 0 && (
                      <p className="text-gray-400 text-sm text-center py-4">Додайте варіанти вибору</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { setIsEditing(false); setEditingAttr(null); }}
                  className="border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Скасувати
                </Button>
                <Button 
                  type="submit" 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  <Save size={18} className="mr-2" />
                  {editingAttr ? 'Зберегти' : 'Створити'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Attributes List */}
      <div className="grid gap-3">
        {filteredAttributes.map(attr => {
          const typeConfig = getTypeConfig(attr.type);
          const TypeIcon = typeConfig.icon;
          return (
            <Card
              key={attr.id}
              className="flex items-center justify-between p-4 bg-white shadow-sm border-0 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${typeConfig.color}`}>
                  <TypeIcon size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">{attr.name}</span>
                    <code className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-mono">{attr.code}</code>
                    {attr.unit && (
                      <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">({attr.unit})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-sm text-gray-500">{typeConfig.label}</span>
                    {attr.facetable && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">Фільтр</span>
                    )}
                    {attr.is_global && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">Глобальний</span>
                    )}
                    {attr.options?.length > 0 && (
                      <span className="text-xs text-gray-500">{attr.options.length} варіантів</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => startEdit(attr)}
                  className="text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                >
                  <Edit size={16} />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-gray-500 hover:text-red-600 hover:bg-red-50" 
                  onClick={() => handleDelete(attr)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </Card>
          );
        })}

        {filteredAttributes.length === 0 && (
          <Card className="text-center py-16 bg-white border-0 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Filter size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg">Атрибути не знайдено</p>
            <p className="text-gray-400 text-sm mt-1">Створіть новий атрибут для початку роботи</p>
            <Button
              onClick={() => { resetForm(); setIsEditing(true); setEditingAttr(null); }}
              className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              <Plus size={18} className="mr-2" />
              Створити атрибут
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AttributesLibrary;
