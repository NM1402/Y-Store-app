import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { 
  Plus, Trash2, Save, X, GripVertical, Search,
  Hash, Type, ToggleLeft, List, Star, Eye, ChevronDown, ChevronRight,
  Settings, Filter, Sliders, CheckSquare, ArrowUpDown
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

/**
 * Category Filter Schema Editor
 * Configure which attributes are used as filters for a category
 */
const CategoryFilterSchema = ({ categoryId, categoryName, onClose }) => {
  const [categoryAttrs, setCategoryAttrs] = useState([]);
  const [allAttributes, setAllAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAttr, setSelectedAttr] = useState(null);
  const [editConfig, setEditConfig] = useState(null);

  const uiOptions = [
    { value: 'range', label: 'Діапазон (слайдер)', icon: Sliders, types: ['number'] },
    { value: 'multiselect', label: 'Множинний вибір', icon: CheckSquare, types: ['string', 'enum', 'set'] },
    { value: 'select', label: 'Одиночний вибір', icon: List, types: ['string', 'enum'] },
    { value: 'boolean', label: 'Так/Ні', icon: ToggleLeft, types: ['boolean'] },
    { value: 'number_input', label: 'Числове поле', icon: Hash, types: ['number'] }
  ];

  const groupOptions = [
    'Основне', 'Екран', 'Пам\'ять', 'Камера', 'Батарея', 
    'Додатково', 'Гарантія', 'Інше'
  ];

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch category attributes
      const catRes = await fetch(`${API_URL}/api/v2/admin/categories/${categoryId}/attributes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const catData = await catRes.json();
      setCategoryAttrs(catData.items || []);

      // Fetch all attributes
      const attrRes = await fetch(`${API_URL}/api/v2/admin/attributes?limit=200`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const attrData = await attrRes.json();
      setAllAttributes(attrData.items || []);
    } catch (err) {
      toast.error('Помилка завантаження');
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddAttribute = async (attr) => {
    // Get default UI based on type
    const defaultUI = attr.type === 'number' ? 'range' 
      : attr.type === 'boolean' ? 'boolean' 
      : 'multiselect';

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/v2/admin/categories/${categoryId}/attributes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attribute_id: attr.id,
          filter_ui: defaultUI,
          group: 'Інше',
          sort: categoryAttrs.length,
          pinned: false,
          collapsed: false,
          required: false,
          show_in_card: true,
          show_in_list: false
        })
      });

      if (!res.ok) throw new Error('Failed to add');

      toast.success(`Атрибут "${attr.name}" додано`);
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      toast.error('Помилка додавання атрибута');
    }
  };

  const handleUpdateConfig = async () => {
    if (!editConfig) return;

    try {
      const token = localStorage.getItem('token');
      const { id, attribute_id, ...config } = editConfig;
      
      const res = await fetch(`${API_URL}/api/v2/admin/categories/${categoryId}/attributes/${attribute_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!res.ok) throw new Error('Failed to update');

      toast.success('Налаштування збережено');
      setEditConfig(null);
      fetchData();
    } catch (err) {
      toast.error('Помилка збереження');
    }
  };

  const handleRemoveAttribute = async (attrId) => {
    if (!window.confirm('Видалити цей фільтр з категорії?')) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/v2/admin/categories/${categoryId}/attributes/${attrId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('Фільтр видалено');
      fetchData();
    } catch (err) {
      toast.error('Помилка видалення');
    }
  };

  const handleReorder = async (fromIdx, toIdx) => {
    const newOrder = [...categoryAttrs];
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    
    setCategoryAttrs(newOrder);

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/v2/admin/categories/${categoryId}/attributes/reorder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newOrder.map(ca => ca.attribute_id))
      });
    } catch (err) {
      toast.error('Помилка сортування');
      fetchData();
    }
  };

  // Group attributes for display
  const attrsByGroup = categoryAttrs.reduce((acc, ca) => {
    const group = ca.group || 'Інше';
    if (!acc[group]) acc[group] = [];
    acc[group].push(ca);
    return acc;
  }, {});

  // Get available attributes (not yet added)
  const availableAttrs = allAttributes.filter(
    attr => !categoryAttrs.some(ca => ca.attribute_id === attr.id)
  );

  const getUILabel = (ui) => uiOptions.find(o => o.value === ui)?.label || ui;

  if (loading) {
    return <div className="p-8 text-center text-zinc-400">Завантаження...</div>;
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-700">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Filter className="text-amber-400" size={24} />
              Схема фільтрів: {categoryName}
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Налаштуйте які атрибути відображаються як фільтри
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add Button */}
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm text-zinc-400">
              {categoryAttrs.length} фільтрів налаштовано
            </span>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Plus size={18} className="mr-2" />
              Додати фільтр
            </Button>
          </div>

          {/* Filters by Group */}
          <div className="space-y-6">
            {Object.entries(attrsByGroup).map(([group, attrs]) => (
              <div key={group} className="space-y-2">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider px-2">
                  {group}
                </h3>
                <div className="space-y-2">
                  {attrs.map((ca, idx) => {
                    const attr = ca.attribute || {};
                    return (
                      <div
                        key={ca.id}
                        className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 hover:border-zinc-600 transition-colors group"
                      >
                        <button className="cursor-grab text-zinc-600 hover:text-zinc-400">
                          <GripVertical size={18} />
                        </button>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{attr.name || ca.attribute_id}</span>
                            <code className="text-xs text-zinc-500 bg-zinc-700/50 px-2 py-0.5 rounded">
                              {attr.code || ca.attribute_id}
                            </code>
                            {attr.unit && (
                              <span className="text-xs text-zinc-400">({attr.unit})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs">
                            <span className="text-amber-400/80">{getUILabel(ca.filter_ui)}</span>
                            {ca.pinned && <span className="text-yellow-400">★ Швидкий</span>}
                            {ca.collapsed && <span className="text-zinc-500">⌄ Згорнутий</span>}
                            {ca.required && <span className="text-red-400">* Обов'язковий</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setEditConfig({ ...ca })}
                          >
                            <Settings size={16} />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleRemoveAttribute(ca.attribute_id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {categoryAttrs.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                <Sliders size={48} className="mx-auto mb-4 opacity-50" />
                <p>Фільтри не налаштовані</p>
                <p className="text-sm mt-2">Додайте атрибути для створення фільтрів</p>
              </div>
            )}
          </div>
        </div>

        {/* Add Attribute Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-60">
            <div className="bg-zinc-800 rounded-xl p-6 w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Додати фільтр</h3>
                <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <Input
                placeholder="Пошук атрибутів..."
                className="mb-4 bg-zinc-700 border-zinc-600"
              />

              <div className="flex-1 overflow-y-auto space-y-2">
                {availableAttrs.map(attr => (
                  <button
                    key={attr.id}
                    onClick={() => handleAddAttribute(attr)}
                    className="w-full flex items-center gap-3 p-3 bg-zinc-700/50 rounded-lg hover:bg-zinc-700 text-left transition-colors"
                  >
                    <div className="w-8 h-8 rounded bg-zinc-600 flex items-center justify-center">
                      {attr.type === 'number' ? <Hash size={16} className="text-amber-400" /> :
                       attr.type === 'boolean' ? <ToggleLeft size={16} className="text-green-400" /> :
                       <Type size={16} className="text-blue-400" />}
                    </div>
                    <div>
                      <div className="text-white font-medium">{attr.name}</div>
                      <div className="text-xs text-zinc-400">
                        {attr.code} • {attr.type}
                        {attr.unit && ` • ${attr.unit}`}
                      </div>
                    </div>
                  </button>
                ))}

                {availableAttrs.length === 0 && (
                  <div className="text-center py-8 text-zinc-500">
                    Всі атрибути вже додані
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Config Modal */}
        {editConfig && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-60">
            <div className="bg-zinc-800 rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Налаштування фільтра</h3>
                <button onClick={() => setEditConfig(null)} className="text-zinc-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-zinc-300">Тип UI</Label>
                  <select
                    value={editConfig.filter_ui}
                    onChange={(e) => setEditConfig(prev => ({ ...prev, filter_ui: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white mt-1"
                  >
                    {uiOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-zinc-300">Група</Label>
                  <select
                    value={editConfig.group || 'Інше'}
                    onChange={(e) => setEditConfig(prev => ({ ...prev, group: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white mt-1"
                  >
                    {groupOptions.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editConfig.pinned}
                      onChange={(e) => setEditConfig(prev => ({ ...prev, pinned: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-zinc-300">Швидкий фільтр</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editConfig.collapsed}
                      onChange={(e) => setEditConfig(prev => ({ ...prev, collapsed: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-zinc-300">Згорнутий</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editConfig.required}
                      onChange={(e) => setEditConfig(prev => ({ ...prev, required: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-zinc-300">Обов'язковий</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editConfig.show_in_card}
                      onChange={(e) => setEditConfig(prev => ({ ...prev, show_in_card: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-zinc-300">В картці</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-700">
                  <Button variant="outline" onClick={() => setEditConfig(null)}>
                    Скасувати
                  </Button>
                  <Button onClick={handleUpdateConfig} className="bg-amber-500 hover:bg-amber-600 text-black">
                    <Save size={18} className="mr-2" />
                    Зберегти
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryFilterSchema;
