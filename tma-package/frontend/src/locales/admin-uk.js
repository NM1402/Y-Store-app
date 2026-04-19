/**
 * Y-Store Admin - Українська локалізація
 * Єдина мова для всієї адмін-панелі
 */

export const ADMIN_LABELS = {
  // Common Actions
  actions: {
    add: 'Додати',
    edit: 'Редагувати',
    delete: 'Видалити',
    hide: 'Приховати',
    show: 'Показати',
    save: 'Зберегти',
    cancel: 'Скасувати',
    close: 'Закрити',
    search: 'Пошук',
    filter: 'Фільтр',
    export: 'Експорт',
    import: 'Імпорт',
    refresh: 'Оновити',
    back: 'Назад',
    next: 'Далі',
    prev: 'Попередня',
    confirm: 'Підтвердити',
    apply: 'Застосувати',
    reset: 'Скинути',
    view: 'Переглянути',
    copy: 'Копіювати',
    duplicate: 'Дублювати',
    archive: 'Архівувати',
    restore: 'Відновити',
    moveUp: 'Вгору',
    moveDown: 'Вниз',
  },

  // Status Labels
  status: {
    active: 'Активний',
    inactive: 'Неактивний',
    published: 'Опубліковано',
    draft: 'Чернетка',
    pending: 'Очікує',
    approved: 'Схвалено',
    rejected: 'Відхилено',
    processing: 'В обробці',
    completed: 'Завершено',
    cancelled: 'Скасовано',
    inStock: 'В наявності',
    outOfStock: 'Немає в наявності',
    lowStock: 'Закінчується',
  },

  // Module Names
  modules: {
    dashboard: 'Дашборд',
    catalog: 'Каталог',
    orders: 'Замовлення',
    crm: 'CRM',
    marketing: 'Маркетинг',
    finance: 'Фінанси',
    settings: 'Налаштування',
  },

  // Catalog
  catalog: {
    categories: 'Категорії',
    products: 'Товари',
    popular: 'Популярні',
    filters: 'Фільтри',
    addCategory: 'Додати категорію',
    addProduct: 'Додати товар',
    addSubcategory: 'Підкатегорія',
    categoryName: 'Назва категорії',
    slug: 'Слаг',
    productsCount: 'товарів',
    subcategories: 'підкатегорій',
    parentCategory: 'Батьківська категорія',
    childOf: 'Дочірня:',
    noProducts: 'Немає товарів',
    filterSchema: 'Схема фільтрів',
    attributes: 'Атрибути',
  },

  // Orders
  orders: {
    orders: 'Замовлення',
    returns: 'Повернення',
    policies: 'Політики',
    payouts: 'Виплати',
    orderNumber: 'Номер замовлення',
    customer: 'Покупець',
    total: 'Сума',
    status: 'Статус',
    date: 'Дата',
    items: 'Товари',
    shipping: 'Доставка',
    payment: 'Оплата',
    detailedStats: 'Детальна статистика замовлень',
    exportCSV: 'Експорт CSV',
    allTime: 'Весь час',
    allCategories: 'Усі категорії',
  },

  // Marketing
  marketing: {
    slider: 'Слайдер',
    promotions: 'Акції',
    sections: 'Секції',
    bannerSlider: 'Слайдер банерів',
    popularCategories: 'Популярні категорії',
    currentOffers: 'Актуальні пропозиції',
    addSlide: 'Додати слайд',
    slideTitle: 'Заголовок слайду',
    slideSubtitle: 'Підзаголовок',
    slideDescription: 'Опис',
    buttonText: 'Текст кнопки',
    buttonLink: 'Посилання кнопки',
    slideManagement: 'Керування слайдером головної сторінки',
    slideManagementDesc: 'Створюйте та редагуйте слайди для банера',
    banner: 'Банер',
    promo: 'Промо',
    product: 'Товар',
  },

  // CRM
  crm: {
    customers: 'Клієнти',
    crmDashboard: 'CRM панель',
    support: 'Підтримка',
    reviews: 'Відгуки',
    totalCustomers: 'Всього клієнтів',
    newCustomers: 'Нових клієнтів',
    activeCustomers: 'Активних клієнтів',
  },

  // Finance
  finance: {
    payments: 'Платежі',
    risks: 'Ризики',
    revenue: 'Дохід',
    abTests: 'A/B Тести',
    totalRevenue: 'Загальний дохід',
    ordersCount: 'Замовлень',
    productsSold: 'Товарів продано',
    customers: 'Покупців',
  },

  // Settings
  settings: {
    siteSettings: 'Налаштування сайту',
    siteName: 'Назва сайту',
    siteDescription: 'Опис сайту',
    phones: 'Телефони',
    email: 'Email',
    socialLinks: 'Соціальні мережі',
    workingHours: 'Графік роботи',
    address: 'Адреса',
    currency: 'Валюта',
  },

  // Dashboard Stats
  stats: {
    revenue: 'Виручка',
    orders: 'Замовлень',
    productsSold: 'Товарів продано',
    customers: 'Покупців',
    averageOrder: 'Середній чек',
    conversionRate: 'Конверсія',
    statsbyCategory: 'Статистика за категоріями',
    category: 'Категорія',
    quantity: 'Кількість',
  },

  // Table Headers
  table: {
    category: 'Категорія',
    slug: 'Слаг',
    products: 'Товари',
    actions: 'Дії',
    name: 'Назва',
    price: 'Ціна',
    stock: 'Наявність',
    status: 'Статус',
    created: 'Створено',
    updated: 'Оновлено',
  },

  // Form Labels
  form: {
    nameUk: 'Назва (укр)',
    nameRu: 'Назва (рос)',
    description: 'Опис',
    descriptionUk: 'Опис (укр)',
    descriptionRu: 'Опис (рос)',
    price: 'Ціна',
    oldPrice: 'Стара ціна',
    sku: 'Артикул',
    quantity: 'Кількість',
    weight: 'Вага',
    dimensions: 'Розміри',
    images: 'Зображення',
    mainImage: 'Головне зображення',
    additionalImages: 'Додаткові зображення',
    seoTitle: 'SEO заголовок',
    seoDescription: 'SEO опис',
    selectCategory: 'Оберіть категорію',
    selectStatus: 'Оберіть статус',
  },

  // Messages
  messages: {
    loading: 'Завантаження...',
    saving: 'Збереження...',
    saved: 'Збережено',
    error: 'Помилка',
    success: 'Успішно',
    confirmDelete: 'Ви впевнені, що хочете видалити?',
    deleteSuccess: 'Успішно видалено',
    updateSuccess: 'Успішно оновлено',
    createSuccess: 'Успішно створено',
    noData: 'Немає даних',
    noResults: 'Нічого не знайдено',
    emptyList: 'Список порожній',
    loadMore: 'Завантажити ще',
    moduleNotFound: 'Модуль не знайдено',
  },

  // Time periods
  time: {
    today: 'Сьогодні',
    yesterday: 'Вчора',
    thisWeek: 'Цей тиждень',
    thisMonth: 'Цей місяць',
    lastMonth: 'Минулий місяць',
    thisYear: 'Цей рік',
    allTime: 'Весь час',
    last7days: 'Останні 7 днів',
    last30days: 'Останні 30 днів',
    custom: 'Власний період',
  },
};

export default ADMIN_LABELS;
