import React, { useState, useEffect } from 'react';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

/**
 * Structured Specifications Editor - Rozetka Style
 * 
 * Structure: 
 * [
 *   {
 *     group_name: "Основные характеристики",
 *     fields: [
 *       { key: "Материал", value: "Хлопок" },
 *       { key: "Цвет", value: "Синий" }
 *     ]
 *   }
 * ]
 */

// Универсальный список характеристик для разных категорий
const COMMON_SPECIFICATIONS = {
  // Электроника и компьютеры
  electronics: {
    'Основные характеристики': [
      'Производитель', 'Модель', 'Страна производства', 'Год выпуска', 'Гарантия'
    ],
    'Экран': [
      'Діагональ екрана', 'Роздільна здатність екрана', 'Тип матриці', 'Частота оновлення', 'Яскравість', 'Покриття екрана'
    ],
    'Процесор': [
      'Модель процесора', 'Кількість ядер', 'Частота процесора', 'Кеш-пам\'ять'
    ],
    'Пам\'ять': [
      'Оперативна пам\'ять (RAM)', 'Тип пам\'яті', 'Вбудована пам\'ять', 'Підтримка карт пам\'яті'
    ],
    'Камера': [
      'Основна камера', 'Фронтальна камера', 'Спалах', 'Запис відео', 'Стабілізація'
    ],
    'Акумулятор': [
      'Ємність акумулятора', 'Тип акумулятора', 'Швидка зарядка', 'Бездротова зарядка', 'Час роботи'
    ],
    'Зв\'язок і комунікації': [
      'Wi-Fi', 'Bluetooth', 'GPS', 'NFC', 'Мобільна мережа'
    ],
    'Розміри та вага': [
      'Висота', 'Ширина', 'Товщина', 'Вага'
    ]
  },
  
  // Одяг і взуття
  fashion: {
    'Основні характеристики': [
      'Бренд', 'Артикул', 'Країна виробництва', 'Сезон', 'Стать'
    ],
    'Розміри': [
      'Розмір', 'Розмір на етикетці', 'Міжнародний розмір', 'Довжина', 'Ширина', 'Обхват грудей', 'Обхват талії', 'Обхват стегон'
    ],
    'Матеріали': [
      'Матеріал', 'Склад', 'Матеріал підкладки', 'Матеріал утеплювача'
    ],
    'Особливості': [
      'Колір', 'Малюнок', 'Стиль', 'Застібка', 'Кишені', 'Капюшон'
    ],
    'Догляд': [
      'Температура прання', 'Хімчистка', 'Прасування', 'Відбілювання'
    ]
  },
  
  // Мебель
  furniture: {
    'Основные характеристики': [
      'Производитель', 'Страна производства', 'Гарантия', 'Артикул'
    ],
    'Размеры': [
      'Высота', 'Ширина', 'Глубина', 'Вес'
    ],
    'Материалы': [
      'Материал каркаса', 'Материал обивки', 'Наполнитель', 'Цвет'
    ],
    'Конструкция': [
      'Тип конструкции', 'Механизм трансформации', 'Спальное место', 'Нагрузка'
    ],
    'Особенности': [
      'Стиль', 'Количество мест', 'Ящик для белья', 'Съемный чехол'
    ]
  },
  
  // Бытовая техника
  appliances: {
    'Основные характеристики': [
      'Производитель', 'Модель', 'Страна производства', 'Гарантия', 'Тип'
    ],
    'Технические характеристики': [
      'Мощность', 'Напряжение', 'Энергопотребление', 'Класс энергоэффективности'
    ],
    'Размеры и вес': [
      'Высота', 'Ширина', 'Глубина', 'Вес'
    ],
    'Функции': [
      'Количество программ', 'Таймер', 'Дисплей', 'Автоотключение'
    ],
    'Комплектация': [
      'Комплект поставки', 'Дополнительные аксессуары'
    ]
  },
  
  // Продукты питания
  food: {
    'Основные характеристики': [
      'Производитель', 'Бренд', 'Страна производства', 'Срок годности'
    ],
    'Состав': [
      'Ингредиенты', 'Пищевая ценность', 'Белки', 'Жиры', 'Углеводы', 'Калорийность'
    ],
    'Упаковка': [
      'Тип упаковки', 'Вес нетто', 'Вес брутто', 'Объем'
    ],
    'Особенности': [
      'Вкус', 'Без глютена', 'Веганский', 'Органический', 'БИО'
    ],
    'Условия хранения': [
      'Температура хранения', 'Условия после вскрытия'
    ]
  },
  
  // Спорт и отдых
  sports: {
    'Основные характеристики': [
      'Производитель', 'Бренд', 'Артикул', 'Страна производства', 'Пол', 'Возраст'
    ],
    'Размеры': [
      'Размер', 'Длина', 'Ширина', 'Высота', 'Вес'
    ],
    'Материалы': [
      'Материал', 'Водонепроницаемость', 'Дышащий материал'
    ],
    'Особенности': [
      'Цвет', 'Сезон', 'Тип активности', 'Уровень подготовки'
    ]
  },
  
  // Косметика и парфюмерия
  beauty: {
    'Основные характеристики': [
      'Бренд', 'Производитель', 'Страна производства', 'Пол', 'Возраст'
    ],
    'Характеристики продукта': [
      'Тип', 'Назначение', 'Тип кожи', 'Объем', 'Вес'
    ],
    'Состав': [
      'Активные ингредиенты', 'Без парабенов', 'Гипоаллергенно', 'Натуральный состав'
    ],
    'Применение': [
      'Способ применения', 'Частота использования'
    ],
    'Упаковка': [
      'Тип упаковки', 'Дозатор'
    ]
  },
  
  // Детские товары
  kids: {
    'Основные характеристики': [
      'Производитель', 'Бренд', 'Возраст', 'Пол', 'Гарантия'
    ],
    'Размеры': [
      'Размер', 'Длина', 'Ширина', 'Высота', 'Вес'
    ],
    'Материалы': [
      'Материал', 'Гипоаллергенный', 'Экологичный', 'Безопасность'
    ],
    'Особенности': [
      'Цвет', 'Регулировка', 'Складной', 'Съемный чехол'
    ]
  }
};

const StructuredSpecificationsEditor = ({ specifications = [], onChange }) => {
  const [groups, setGroups] = useState(
    specifications.length > 0 
      ? specifications 
      : [{ group_name: 'Основные характеристики', fields: [{ key: '', value: '' }] }]
  );
  
  const [selectedCategory, setSelectedCategory] = useState('electronics');
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    // Initialize all groups as expanded
    const expanded = {};
    groups.forEach((_, index) => {
      expanded[index] = true;
    });
    setExpandedGroups(expanded);
  }, []);

  const toggleGroup = (index) => {
    setExpandedGroups(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleGroupNameChange = (groupIndex, value) => {
    const newGroups = [...groups];
    newGroups[groupIndex].group_name = value;
    setGroups(newGroups);
    onChange(newGroups);
  };

  const handleFieldChange = (groupIndex, fieldIndex, fieldType, value) => {
    const newGroups = [...groups];
    newGroups[groupIndex].fields[fieldIndex][fieldType] = value;
    setGroups(newGroups);
    onChange(newGroups);
  };

  const addField = (groupIndex) => {
    const newGroups = [...groups];
    newGroups[groupIndex].fields.push({ key: '', value: '' });
    setGroups(newGroups);
    onChange(newGroups);
  };

  const removeField = (groupIndex, fieldIndex) => {
    const newGroups = [...groups];
    if (newGroups[groupIndex].fields.length > 1) {
      newGroups[groupIndex].fields.splice(fieldIndex, 1);
      setGroups(newGroups);
      onChange(newGroups);
    }
  };

  const addGroup = () => {
    const newGroups = [...groups, { 
      group_name: 'Новая группа', 
      fields: [{ key: '', value: '' }] 
    }];
    setGroups(newGroups);
    onChange(newGroups);
    // Expand newly added group
    setExpandedGroups(prev => ({
      ...prev,
      [newGroups.length - 1]: true
    }));
  };

  const removeGroup = (groupIndex) => {
    if (groups.length > 1) {
      const newGroups = groups.filter((_, index) => index !== groupIndex);
      setGroups(newGroups);
      onChange(newGroups);
    }
  };

  const applyTemplate = (categoryKey, groupName, fields) => {
    const newGroup = {
      group_name: groupName,
      fields: fields.map(fieldKey => ({ key: fieldKey, value: '' }))
    };
    const newGroups = [...groups, newGroup];
    setGroups(newGroups);
    onChange(newGroups);
    // Expand newly added group
    setExpandedGroups(prev => ({
      ...prev,
      [newGroups.length - 1]: true
    }));
  };

  return (
    <div className="space-y-6">
      {/* Template Selector */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-bold text-lg mb-4 text-gray-900">Шаблоны характеристик</h3>
        <div className="space-y-4">
          <div>
            <Label>Выберите категорию товара</Label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="electronics">Электроника и компьютеры</option>
              <option value="fashion">Одежда и обувь</option>
              <option value="furniture">Мебель</option>
              <option value="appliances">Бытовая техника</option>
              <option value="food">Продукты питания</option>
              <option value="sports">Спорт и отдых</option>
              <option value="beauty">Косметика и парфюмерия</option>
              <option value="kids">Детские товары</option>
            </select>
          </div>

          <div>
            <Label>Добавить группу из шаблона</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {Object.entries(COMMON_SPECIFICATIONS[selectedCategory]).map(([groupName, fields]) => (
                <Button
                  key={groupName}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate(selectedCategory, groupName, fields)}
                  className="text-left justify-start"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {groupName}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-4">
        {(groups || []).map((group, groupIndex) => (
          <div key={groupIndex} className="bg-gray-50 rounded-xl border-2 border-gray-200">
            {/* Group Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-4 flex-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(groupIndex)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  {expandedGroups[groupIndex] ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
                <Input
                  value={group.group_name}
                  onChange={(e) => handleGroupNameChange(groupIndex, e.target.value)}
                  placeholder="Название группы"
                  className="flex-1 font-semibold"
                />
              </div>
              {groups.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeGroup(groupIndex)}
                  className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Group Fields */}
            {expandedGroups[groupIndex] && (
              <div className="p-4 space-y-3">
                {(group.fields || []).map((field, fieldIndex) => (
                  <div key={fieldIndex} className="flex items-start gap-3">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <Input
                          value={field.key}
                          onChange={(e) => handleFieldChange(groupIndex, fieldIndex, 'key', e.target.value)}
                          placeholder="Характеристика (например: Материал)"
                        />
                      </div>
                      <div>
                        <Input
                          value={field.value}
                          onChange={(e) => handleFieldChange(groupIndex, fieldIndex, 'value', e.target.value)}
                          placeholder="Значение (например: Хлопок)"
                        />
                      </div>
                    </div>
                    {group.fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeField(groupIndex, fieldIndex)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg mt-0.5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addField(groupIndex)}
                  className="w-full mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить поле
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Group Button */}
      <Button
        type="button"
        variant="outline"
        onClick={addGroup}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Добавить группу характеристик
      </Button>

      {/* Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-900">
          <strong>Совет:</strong> Используйте шаблоны выше для быстрого добавления стандартных групп характеристик. 
          Вы можете создавать собственные группы и поля для любой категории товаров.
        </p>
      </div>
    </div>
  );
};

export default StructuredSpecificationsEditor;
