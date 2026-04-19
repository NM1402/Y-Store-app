/**
 * Shared Icon Configuration
 * Единый источник иконок для Category и PopularCategories
 */
import {
  Smartphone, Laptop, Monitor, Tv, Watch, Camera, Headphones, Gamepad,
  Home, Zap, ShoppingBag, Coffee, Microwave, Fan, Wind, Snowflake,
  Shirt, Heart, Book, Music, Car, Bike, Dumbbell, Baby,
  Pill, Leaf, Palette, Wrench, Hammer, Lightbulb, Wifi, Speaker,
  Gift, Utensils, PawPrint, Flower2, Bath, Plane, Glasses, Gem, Sofa
} from 'lucide-react';

// Icon mapping - key to component
export const iconComponents = {
  'Smartphone': Smartphone,
  'Laptop': Laptop,
  'Monitor': Monitor,
  'Tv': Tv,
  'Watch': Watch,
  'Camera': Camera,
  'Headphones': Headphones,
  'Gamepad': Gamepad,
  'Home': Home,
  'Zap': Zap,
  'ShoppingBag': ShoppingBag,
  'Coffee': Coffee,
  'Microwave': Microwave,
  'Fan': Fan,
  'Wind': Wind,
  'Snowflake': Snowflake,
  'Shirt': Shirt,
  'Heart': Heart,
  'Book': Book,
  'Music': Music,
  'Car': Car,
  'Bike': Bike,
  'Dumbbell': Dumbbell,
  'Baby': Baby,
  'Pill': Pill,
  'Leaf': Leaf,
  'Palette': Palette,
  'Wrench': Wrench,
  'Hammer': Hammer,
  'Lightbulb': Lightbulb,
  'Wifi': Wifi,
  'Speaker': Speaker,
  'Gift': Gift,
  'Utensils': Utensils,
  'PawPrint': PawPrint,
  'Flower2': Flower2,
  'Bath': Bath,
  'Plane': Plane,
  'Glasses': Glasses,
  'Gem': Gem,
  'Sofa': Sofa,
};

// Emoji icons for categories
export const emojiOptions = [
  { name: '💻', label: 'Ноутбуки' },
  { name: '📱', label: 'Смартфони' },
  { name: '🎮', label: 'Ігри' },
  { name: '🏠', label: 'Побутова техніка' },
  { name: '👕', label: 'Одяг' },
  { name: '🏡', label: 'Дім' },
  { name: '⚽', label: 'Спорт' },
  { name: '💄', label: 'Краса' },
  { name: '🧒', label: 'Дитячі' },
  { name: '🐕', label: 'Тварини' },
  { name: '🖥️', label: 'Комп\'ютери' },
  { name: '📺', label: 'Телевізори' },
  { name: '🎧', label: 'Аудіо' },
  { name: '⌚', label: 'Годинники' },
  { name: '⌨️', label: 'Клавіатури' },
  { name: '💾', label: 'Накопичувачі' },
  { name: '🧺', label: 'Пральні машини' },
  { name: '🧊', label: 'Холодильники' },
  { name: '🧹', label: 'Пилососи' },
  { name: '🍳', label: 'Кухня' },
  { name: '❄️', label: 'Клімат' },
  { name: '👔', label: 'Чоловічий одяг' },
  { name: '👗', label: 'Жіночий одяг' },
  { name: '👟', label: 'Взуття' },
  { name: '👜', label: 'Сумки' },
  { name: '💎', label: 'Прикраси' },
  { name: '🛋️', label: 'Меблі' },
  { name: '🌱', label: 'Сад' },
  { name: '🔧', label: 'Інструменти' },
  { name: '🏺', label: 'Декор' },
  { name: '💡', label: 'Освітлення' },
  { name: '🏋️', label: 'Фітнес' },
  { name: '🏕️', label: 'Туризм' },
  { name: '🚴', label: 'Велоспорт' },
  { name: '⛷️', label: 'Зимові' },
  { name: '🎣', label: 'Рибалка' },
  { name: '🌸', label: 'Парфумерія' },
  { name: '💇', label: 'Волосся' },
  { name: '🧴', label: 'Догляд' },
  { name: '💊', label: 'Здоров\'я' },
  { name: '👶', label: 'Немовлята' },
  { name: '🧸', label: 'Іграшки' },
  { name: '🍼', label: 'Догляд за дитиною' },
  { name: '📚', label: 'Школа' },
  { name: '🦴', label: 'Корми' },
  { name: '🎾', label: 'Іграшки для тварин' },
];

// Icon options with labels (Lucide)
export const iconOptions = [
  { name: 'Smartphone', label: 'Смартфони' },
  { name: 'Laptop', label: 'Ноутбуки' },
  { name: 'Monitor', label: 'Монітори' },
  { name: 'Tv', label: 'Телевізори' },
  { name: 'Watch', label: 'Годинники' },
  { name: 'Camera', label: 'Камери' },
  { name: 'Headphones', label: 'Навушники' },
  { name: 'Gamepad', label: 'Ігри' },
  { name: 'Home', label: 'Для дому' },
  { name: 'Zap', label: 'Електроніка' },
  { name: 'ShoppingBag', label: 'Покупки' },
  { name: 'Coffee', label: 'Кава' },
  { name: 'Microwave', label: 'Техніка' },
  { name: 'Fan', label: 'Вентилятор' },
  { name: 'Wind', label: 'Кондиціонер' },
  { name: 'Snowflake', label: 'Холодильник' },
  { name: 'Shirt', label: 'Одяг' },
  { name: 'Heart', label: 'Здоров\'я' },
  { name: 'Book', label: 'Книги' },
  { name: 'Music', label: 'Музика' },
  { name: 'Car', label: 'Авто' },
  { name: 'Bike', label: 'Велосипеди' },
  { name: 'Dumbbell', label: 'Спорт' },
  { name: 'Baby', label: 'Дитяче' },
  { name: 'Pill', label: 'Медицина' },
  { name: 'Leaf', label: 'Еко' },
  { name: 'Palette', label: 'Творчість' },
  { name: 'Wrench', label: 'Інструменти' },
  { name: 'Hammer', label: 'Будівництво' },
  { name: 'Lightbulb', label: 'Освітлення' },
  { name: 'Wifi', label: 'WiFi' },
  { name: 'Speaker', label: 'Акустика' },
  { name: 'Gift', label: 'Подарунки' },
  { name: 'Utensils', label: 'Кухня' },
  { name: 'PawPrint', label: 'Тварини' },
  { name: 'Flower2', label: 'Сад' },
  { name: 'Bath', label: 'Ванна' },
  { name: 'Plane', label: 'Подорожі' },
  { name: 'Glasses', label: 'Аксесуари' },
  { name: 'Gem', label: 'Прикраси' },
  { name: 'Sofa', label: 'Меблі' },
];

/**
 * Get icon component by name
 * @param {string} name - Icon name
 * @returns {React.Component|null} - Icon component or null
 */
export const getIconComponent = (name) => {
  return iconComponents[name] || Smartphone;
};

/**
 * Filter icons by search query (both Lucide and Emoji)
 * @param {string} search - Search query
 * @returns {Array} - Filtered icon options
 */
export const filterIcons = (search) => {
  const allIcons = [...emojiOptions, ...iconOptions];
  if (!search) return allIcons;
  const searchLower = search.toLowerCase();
  return allIcons.filter(icon =>
    icon.label.toLowerCase().includes(searchLower) ||
    icon.name.toLowerCase().includes(searchLower)
  );
};

/**
 * Check if icon is emoji
 * @param {string} icon - Icon string
 * @returns {boolean}
 */
export const isEmoji = (icon) => {
  if (!icon) return false;
  return icon.length <= 4 && !/^[A-Za-z]+$/.test(icon);
};

export default iconComponents;
