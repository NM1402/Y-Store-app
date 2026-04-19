"""
Seed routes — генерація початкових даних (категорії + товари).
Запускається автоматично при старті сервера, якщо БД порожня.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter

from core.db import db

router = APIRouter()


CATEGORIES = [
    {"slug": "smartphones", "name_uk": "Смартфони", "icon": "📱", "image": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400"},
    {"slug": "laptops", "name_uk": "Ноутбуки", "icon": "💻", "image": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400"},
    {"slug": "audio", "name_uk": "Аудіо", "icon": "🎧", "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400"},
    {"slug": "tablets", "name_uk": "Планшети", "icon": "📲", "image": "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400"},
    {"slug": "watches", "name_uk": "Годинники", "icon": "⌚", "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400"},
    {"slug": "tv", "name_uk": "Телевізори", "icon": "📺", "image": "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400"},
    {"slug": "gaming", "name_uk": "Ігрові", "icon": "🎮", "image": "https://images.unsplash.com/photo-1486572788966-cfd3df1f5b42?w=400"},
    {"slug": "accessories", "name_uk": "Аксесуари", "icon": "🔌", "image": "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400"},
]


PRODUCTS = [
    # Smartphones
    {
        "title": "iPhone 15 Pro Max 256GB",
        "brand": "Apple",
        "category_slug": "smartphones",
        "price": 59999,
        "old_price": 64999,
        "description": "Титановий корпус. Чіп A17 Pro. Камера 48 МП з оптичним зумом до 5×. Дисплей Super Retina XDR 6.7″ з ProMotion.",
        "images": [
            "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800",
            "https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=800",
        ],
        "is_bestseller": True,
        "rating": 4.9,
        "reviews_count": 124,
        "specifications": {"Екран": "6.7\"", "Пам'ять": "256 GB", "Камера": "48 МП", "Акумулятор": "4422 mAh"},
    },
    {
        "title": "iPhone 15 128GB Blue",
        "brand": "Apple",
        "category_slug": "smartphones",
        "price": 39999,
        "old_price": 43999,
        "description": "Новий iPhone 15 з Dynamic Island. Чіп A16 Bionic. Камера 48 МП. USB-C.",
        "images": ["https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800"],
        "is_bestseller": True,
        "rating": 4.8,
        "reviews_count": 87,
        "specifications": {"Екран": "6.1\"", "Пам'ять": "128 GB", "Камера": "48 МП"},
    },
    {
        "title": "Samsung Galaxy S24 Ultra 512GB",
        "brand": "Samsung",
        "category_slug": "smartphones",
        "price": 54999,
        "old_price": 59999,
        "description": "Флагман Samsung. S Pen у комплекті. Камера 200 МП. AI-функції Galaxy AI.",
        "images": ["https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800"],
        "is_bestseller": True,
        "rating": 4.8,
        "reviews_count": 96,
        "specifications": {"Екран": "6.8\"", "Пам'ять": "512 GB", "Камера": "200 МП"},
    },
    {
        "title": "Google Pixel 8 Pro 256GB",
        "brand": "Google",
        "category_slug": "smartphones",
        "price": 36999,
        "description": "Найчистіший Android. Чіп Tensor G3. Найкраща нічна зйомка. 7 років оновлень.",
        "images": ["https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800"],
        "rating": 4.7,
        "reviews_count": 42,
        "specifications": {"Екран": "6.7\"", "Пам'ять": "256 GB", "Камера": "50 МП"},
    },
    # Laptops
    {
        "title": "MacBook Pro 14 M3 Pro 512GB",
        "brand": "Apple",
        "category_slug": "laptops",
        "price": 99999,
        "old_price": 109999,
        "description": "Професійний ноутбук на чіпі M3 Pro. Liquid Retina XDR дисплей. До 22 годин роботи.",
        "images": ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800"],
        "is_bestseller": True,
        "rating": 4.9,
        "reviews_count": 54,
        "specifications": {"Екран": "14.2\"", "Процесор": "M3 Pro", "Пам'ять": "18 GB", "SSD": "512 GB"},
    },
    {
        "title": "MacBook Air 13 M2 256GB",
        "brand": "Apple",
        "category_slug": "laptops",
        "price": 44999,
        "description": "Тонкий і легкий. Чіп Apple M2. До 18 годин автономності.",
        "images": ["https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800"],
        "rating": 4.8,
        "reviews_count": 68,
        "specifications": {"Екран": "13.6\"", "Процесор": "M2", "Пам'ять": "8 GB", "SSD": "256 GB"},
    },
    {
        "title": "ASUS ROG Strix G16 RTX 4070",
        "brand": "ASUS",
        "category_slug": "laptops",
        "price": 69999,
        "description": "Ігровий ноутбук. Intel Core i9-14900HX. RTX 4070. 16″ 240 Hz.",
        "images": ["https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800"],
        "rating": 4.7,
        "reviews_count": 23,
        "specifications": {"Екран": "16\" 240Hz", "Процесор": "i9-14900HX", "Відео": "RTX 4070"},
    },
    # Audio
    {
        "title": "AirPods Pro 2 USB-C",
        "brand": "Apple",
        "category_slug": "audio",
        "price": 9999,
        "old_price": 11499,
        "description": "Активне шумопоглинання. Адаптивний аудіо. USB-C зарядний футляр.",
        "images": ["https://images.unsplash.com/photo-1606741965326-cb990ae01bb2?w=800"],
        "is_bestseller": True,
        "rating": 4.9,
        "reviews_count": 215,
    },
    {
        "title": "Sony WH-1000XM5",
        "brand": "Sony",
        "category_slug": "audio",
        "price": 14999,
        "description": "Бездротові навушники класу Hi-Fi з найкращим шумопоглинанням у світі.",
        "images": ["https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800"],
        "is_bestseller": True,
        "rating": 4.8,
        "reviews_count": 134,
    },
    {
        "title": "JBL Flip 6 Bluetooth Speaker",
        "brand": "JBL",
        "category_slug": "audio",
        "price": 3999,
        "old_price": 4499,
        "description": "Портативна колонка IP67. 12 годин роботи. Потужний звук Pro Sound.",
        "images": ["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800"],
        "rating": 4.7,
        "reviews_count": 58,
    },
    # Tablets
    {
        "title": "iPad Pro 11 M4 256GB Wi-Fi",
        "brand": "Apple",
        "category_slug": "tablets",
        "price": 52999,
        "description": "Ультра-тонкий iPad Pro з чіпом M4 та OLED-дисплеєм Ultra Retina XDR.",
        "images": ["https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800"],
        "rating": 4.9,
        "reviews_count": 37,
    },
    {
        "title": "iPad Air 11 M2 128GB",
        "brand": "Apple",
        "category_slug": "tablets",
        "price": 29999,
        "old_price": 32999,
        "description": "Продуктивність чіпа M2 у тонкому корпусі. Apple Pencil Pro сумісний.",
        "images": ["https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=800"],
        "is_bestseller": True,
        "rating": 4.8,
        "reviews_count": 45,
    },
    # Watches
    {
        "title": "Apple Watch Series 10 46mm",
        "brand": "Apple",
        "category_slug": "watches",
        "price": 18999,
        "description": "Найтонший Apple Watch. Новий чіп S10. Вимірювання глибини та температури.",
        "images": ["https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800"],
        "is_bestseller": True,
        "rating": 4.8,
        "reviews_count": 102,
    },
    {
        "title": "Samsung Galaxy Watch 7 44mm",
        "brand": "Samsung",
        "category_slug": "watches",
        "price": 12499,
        "description": "Розумний годинник з AI-аналізом сну та енергії.",
        "images": ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"],
        "rating": 4.6,
        "reviews_count": 34,
    },
    # TV
    {
        "title": "LG OLED55C4 55\" 4K",
        "brand": "LG",
        "category_slug": "tv",
        "price": 49999,
        "old_price": 54999,
        "description": "OLED evo панель. Процесор α9 Gen7. Dolby Vision та Atmos.",
        "images": ["https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800"],
        "rating": 4.9,
        "reviews_count": 41,
    },
    {
        "title": "Samsung Neo QLED QN90D 65\"",
        "brand": "Samsung",
        "category_slug": "tv",
        "price": 59999,
        "description": "Quantum Matrix технологія. Neural Quantum Processor 4K. 144 Hz gaming.",
        "images": ["https://images.unsplash.com/photo-1461151304267-38535e780c79?w=800"],
        "rating": 4.8,
        "reviews_count": 28,
    },
    # Gaming
    {
        "title": "PlayStation 5 Slim Digital",
        "brand": "Sony",
        "category_slug": "gaming",
        "price": 18999,
        "old_price": 21999,
        "description": "Slim версія PS5 без дисковода. 1 TB SSD. Швидке завантаження.",
        "images": ["https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800"],
        "is_bestseller": True,
        "rating": 4.9,
        "reviews_count": 178,
    },
    {
        "title": "Xbox Series X 1TB",
        "brand": "Microsoft",
        "category_slug": "gaming",
        "price": 19999,
        "description": "Найпотужніша ігрова консоль Xbox. 4K 120 FPS.",
        "images": ["https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=800"],
        "rating": 4.8,
        "reviews_count": 64,
    },
    # Accessories
    {
        "title": "Anker PowerCore 20000 PD",
        "brand": "Anker",
        "category_slug": "accessories",
        "price": 1899,
        "description": "Портативний акумулятор 20 000 mAh з швидкою зарядкою PD 22.5W.",
        "images": ["https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800"],
        "rating": 4.7,
        "reviews_count": 89,
    },
    {
        "title": "MagSafe Charger 15W",
        "brand": "Apple",
        "category_slug": "accessories",
        "price": 1499,
        "description": "Оригінальна бездротова зарядка MagSafe для iPhone.",
        "images": ["https://images.unsplash.com/photo-1628815113969-0487917fc6a1?w=800"],
        "rating": 4.6,
        "reviews_count": 112,
    },
]


async def auto_seed() -> dict:
    """Автоматичний сид, якщо БД порожня."""
    cat_count = await db.categories.count_documents({})
    prod_count = await db.products.count_documents({})
    if cat_count >= len(CATEGORIES) and prod_count >= len(PRODUCTS):
        return {"status": "skipped", "categories": cat_count, "products": prod_count}

    now_iso = datetime.now(timezone.utc).isoformat()

    # Categories
    for c in CATEGORIES:
        existing = await db.categories.find_one({"slug": c["slug"]})
        if existing:
            continue
        doc = {
            "id": str(uuid.uuid4()),
            "slug": c["slug"],
            "name": c["name_uk"],
            "name_uk": c["name_uk"],
            "icon": c["icon"],
            "image": c["image"],
            "product_count": 0,
            "created_at": now_iso,
        }
        await db.categories.insert_one(doc)

    # Products
    for p in PRODUCTS:
        existing = await db.products.find_one({"title": p["title"]})
        if existing:
            continue
        cat_slug = p["category_slug"]
        cat_doc = await db.categories.find_one({"slug": cat_slug})
        cat_id = cat_doc["id"] if cat_doc else None

        pid = str(uuid.uuid4())
        doc = {
            "id": pid,
            "title": p["title"],
            "slug": p["title"].lower().replace(" ", "-").replace("\"", "")[:60] + "-" + pid[:8],
            "brand": p.get("brand"),
            "category_id": cat_id,
            "category_slug": cat_slug,
            "description": p.get("description", ""),
            "price": float(p["price"]),
            "old_price": float(p["old_price"]) if p.get("old_price") else None,
            "images": p.get("images", []),
            "in_stock": True,
            "is_bestseller": bool(p.get("is_bestseller", False)),
            "rating": float(p.get("rating", 0)),
            "reviews_count": int(p.get("reviews_count", 0)),
            "specifications": p.get("specifications", {}),
            "created_at": now_iso,
            "updated_at": now_iso,
            "status": "published",
        }
        await db.products.insert_one(doc)

    # update product_count per category
    all_cats = await db.categories.find({}, {"_id": 0}).to_list(1000)
    for c in all_cats:
        count = await db.products.count_documents({"category_id": c["id"]})
        await db.categories.update_one({"id": c["id"]}, {"$set": {"product_count": count}})

    return {
        "status": "seeded",
        "categories": await db.categories.count_documents({}),
        "products": await db.products.count_documents({}),
    }


@router.post("/seed/run")
async def run_seed():
    res = await auto_seed()
    return res


@router.post("/seed/reset")
async def reset_seed():
    await db.categories.delete_many({})
    await db.products.delete_many({})
    res = await auto_seed()
    return res
