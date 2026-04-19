"""
Seed script to populate categories from CategorySidebar structure
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from uuid import uuid4

# Category structure from CategorySidebar.js
CATEGORIES = [
    {
        "id": "electronics",
        "name": "Ноутбуки та комп'ютери",
        "slug": "electronics",
        "subcategories": [
            {"id": "laptops", "name": "Ноутбуки", "slug": "laptops"},
            {"id": "computers", "name": "Комп'ютери", "slug": "computers"},
            {"id": "monitors", "name": "Монітори", "slug": "monitors"},
            {"id": "keyboards", "name": "Клавіатури та миші", "slug": "keyboards-mice"},
            {"id": "storage", "name": "Накопичувачі даних", "slug": "storage"}
        ]
    },
    {
        "id": "smartphones",
        "name": "Смартфони, ТВ і електроніка",
        "slug": "smartphones-tv",
        "subcategories": [
            {"id": "smartphones", "name": "Мобільні телефони", "slug": "mobile-phones"},
            {"id": "tablets", "name": "Планшети", "slug": "tablets"},
            {"id": "tvs", "name": "Телевізори", "slug": "tvs"},
            {"id": "audio", "name": "Аудіотехніка", "slug": "audio"},
            {"id": "accessories", "name": "Аксесуари для гаджетів", "slug": "gadget-accessories"}
        ]
    },
    {
        "id": "gaming",
        "name": "Товари для геймерів",
        "slug": "gaming",
        "subcategories": [
            {"id": "consoles", "name": "Ігрові консолі", "slug": "consoles"},
            {"id": "games", "name": "Відеоігри", "slug": "games"},
            {"id": "gaming-chairs", "name": "Геймерські крісла", "slug": "gaming-chairs"},
            {"id": "gaming-accessories", "name": "Аксесуари для геймерів", "slug": "gaming-accessories"}
        ]
    },
    {
        "id": "appliances",
        "name": "Побутова техніка",
        "slug": "appliances",
        "subcategories": [
            {"id": "washing", "name": "Пральні машини", "slug": "washing-machines"},
            {"id": "refrigerators", "name": "Холодильники", "slug": "refrigerators"},
            {"id": "vacuums", "name": "Пилососи", "slug": "vacuums"},
            {"id": "kitchen", "name": "Техніка для кухні", "slug": "kitchen"},
            {"id": "climate", "name": "Клімат техніка", "slug": "climate"}
        ]
    },
    {
        "id": "fashion",
        "name": "Одяг, взуття та прикраси",
        "slug": "fashion",
        "subcategories": [
            {"id": "mens-clothing", "name": "Чоловічий одяг", "slug": "mens-clothing"},
            {"id": "womens-clothing", "name": "Жіночий одяг", "slug": "womens-clothing"},
            {"id": "shoes", "name": "Взуття", "slug": "shoes"},
            {"id": "fashion-accessories", "name": "Аксесуари", "slug": "fashion-accessories"},
            {"id": "jewelry", "name": "Прикраси", "slug": "jewelry"}
        ]
    },
    {
        "id": "furniture",
        "name": "Дім, сад і будівництво",
        "slug": "home-garden",
        "subcategories": [
            {"id": "furniture", "name": "Меблі", "slug": "furniture"},
            {"id": "garden", "name": "Сад і город", "slug": "garden"},
            {"id": "tools", "name": "Інструменти", "slug": "tools"},
            {"id": "decor", "name": "Декор", "slug": "decor"},
            {"id": "lighting", "name": "Освітлення", "slug": "lighting"}
        ]
    },
    {
        "id": "sports",
        "name": "Спорт і захоплення",
        "slug": "sports",
        "subcategories": [
            {"id": "fitness", "name": "Фітнес", "slug": "fitness"},
            {"id": "outdoor", "name": "Туризм", "slug": "outdoor"},
            {"id": "cycling", "name": "Велоспорт", "slug": "cycling"},
            {"id": "winter", "name": "Зимові види спорту", "slug": "winter-sports"},
            {"id": "fishing", "name": "Рибалка", "slug": "fishing"}
        ]
    },
    {
        "id": "beauty",
        "name": "Краса та здоров'я",
        "slug": "beauty",
        "subcategories": [
            {"id": "cosmetics", "name": "Косметика", "slug": "cosmetics"},
            {"id": "perfume", "name": "Парфумерія", "slug": "perfume"},
            {"id": "haircare", "name": "Догляд за волоссям", "slug": "haircare"},
            {"id": "skincare", "name": "Догляд за шкірою", "slug": "skincare"},
            {"id": "health", "name": "Здоров'я", "slug": "health"}
        ]
    },
    {
        "id": "kids",
        "name": "Дитячі товари",
        "slug": "kids",
        "subcategories": [
            {"id": "baby-clothes", "name": "Дитячий одяг", "slug": "baby-clothes"},
            {"id": "toys", "name": "Іграшки", "slug": "toys"},
            {"id": "baby-care", "name": "Догляд за дитиною", "slug": "baby-care"},
            {"id": "strollers", "name": "Коляски", "slug": "strollers"},
            {"id": "school", "name": "Шкільні товари", "slug": "school"}
        ]
    },
    {
        "id": "pets",
        "name": "Товари для тварин",
        "slug": "pets",
        "subcategories": [
            {"id": "pet-food", "name": "Корми", "slug": "pet-food"},
            {"id": "pet-accessories", "name": "Аксесуари", "slug": "pet-accessories"},
            {"id": "pet-care", "name": "Догляд", "slug": "pet-care"},
            {"id": "pet-toys", "name": "Іграшки для тварин", "slug": "pet-toys"}
        ]
    }
]

async def seed_categories():
    """Seed categories into MongoDB"""
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'marketplace_db')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"📦 Using database: {db_name}")
    
    print("🌱 Starting category seeding...")
    
    # Clear existing categories
    await db.categories.delete_many({})
    print("✅ Cleared existing categories")
    
    categories_added = 0
    
    for category_data in CATEGORIES:
        # Create main category
        main_category = {
            "id": str(uuid4()),
            "name": category_data["name"],
            "slug": category_data["slug"],
            "parent_id": None,
            "image_url": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.categories.insert_one(main_category)
        categories_added += 1
        print(f"✅ Added category: {main_category['name']}")
        
        # Create subcategories
        for subcat in category_data.get("subcategories", []):
            subcategory = {
                "id": str(uuid4()),
                "name": subcat["name"],
                "slug": subcat["slug"],
                "parent_id": main_category["id"],
                "image_url": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.categories.insert_one(subcategory)
            categories_added += 1
            print(f"  ↳ Added subcategory: {subcategory['name']}")
    
    print(f"\n🎉 Successfully seeded {categories_added} categories!")
    
    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_categories())
