"""
Seed products for Y-Store
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone
import uuid
import re

load_dotenv(Path(__file__).parent / '.env')

PRODUCTS = [
    # Смартфони
    {
        "title": "iPhone 15 Pro Max 256GB",
        "description": "Найпотужніший iPhone з титановим корпусом, чіпом A17 Pro та покращеною камерою 48MP. Підтримка USB-C та Action Button.",
        "category_slug": "smartphones",
        "price": 59999,
        "compare_price": 64999,
        "stock_level": 15,
        "images": ["https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800"],
        "is_bestseller": True,
        "is_featured": True
    },
    {
        "title": "iPhone 15 Pro 128GB",
        "description": "Потужний смартфон Apple з титановим корпусом, A17 Pro чіпом та професійною камерою.",
        "category_slug": "smartphones",
        "price": 49999,
        "compare_price": 54999,
        "stock_level": 20,
        "images": ["https://images.unsplash.com/photo-1696446702183-cbd13d78e1e7?w=800"],
        "is_bestseller": True
    },
    {
        "title": "Samsung Galaxy S24 Ultra 256GB",
        "description": "Флагман Samsung з AI функціями Galaxy AI, S Pen та неперевершеною камерою 200MP. Титановий корпус.",
        "category_slug": "smartphones",
        "price": 54999,
        "compare_price": 59999,
        "stock_level": 18,
        "images": ["https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800"],
        "is_bestseller": True,
        "is_featured": True
    },
    {
        "title": "Samsung Galaxy S24+ 256GB",
        "description": "Преміум смартфон Samsung з великим AMOLED дисплеєм та Galaxy AI.",
        "category_slug": "smartphones",
        "price": 42999,
        "compare_price": 46999,
        "stock_level": 22,
        "images": ["https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=800"]
    },
    {
        "title": "Samsung Galaxy A55 5G 128GB",
        "description": "Збалансований смартфон з підтримкою 5G, Super AMOLED дисплеєм та потужною батареєю.",
        "category_slug": "smartphones",
        "price": 15999,
        "compare_price": 17999,
        "stock_level": 35,
        "images": ["https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800"]
    },
    {
        "title": "Xiaomi 14 Ultra 512GB",
        "description": "Флагман Xiaomi з камерою Leica, Snapdragon 8 Gen 3 та швидкою зарядкою 90W.",
        "category_slug": "smartphones",
        "price": 47999,
        "compare_price": 52999,
        "stock_level": 10,
        "images": ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800"],
        "is_featured": True
    },
    {
        "title": "Google Pixel 8 Pro 256GB",
        "description": "Смартфон Google з найкращою камерою та AI функціями. Tensor G3 чіп.",
        "category_slug": "smartphones",
        "price": 39999,
        "compare_price": 44999,
        "stock_level": 12,
        "images": ["https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800"]
    },
    # Ноутбуки
    {
        "title": "MacBook Pro 14 M3 Pro 18GB/512GB",
        "description": "Професійний ноутбук Apple з чіпом M3 Pro, 18 ГБ памяті та дисплеєм Liquid Retina XDR. До 17 годин роботи.",
        "category_slug": "laptops",
        "price": 99999,
        "compare_price": 109999,
        "stock_level": 8,
        "images": ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800"],
        "is_bestseller": True,
        "is_featured": True
    },
    {
        "title": "MacBook Air 15 M3 8GB/256GB",
        "description": "Тонкий та легкий MacBook Air з чіпом M3 та великим 15-дюймовим дисплеєм.",
        "category_slug": "laptops",
        "price": 54999,
        "compare_price": 59999,
        "stock_level": 15,
        "images": ["https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800"],
        "is_bestseller": True
    },
    {
        "title": "ASUS ROG Strix G16 RTX 4070",
        "description": "Ігровий ноутбук з Intel Core i9, RTX 4070 та дисплеєм 240Hz. Ідеальний для геймерів.",
        "category_slug": "laptops",
        "price": 74999,
        "compare_price": 82999,
        "stock_level": 6,
        "images": ["https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800"],
        "is_featured": True
    },
    {
        "title": "Lenovo ThinkPad X1 Carbon Gen 11",
        "description": "Бізнес-ноутбук преміум-класу з Intel Core i7, 16GB RAM та 2.8K OLED дисплеєм.",
        "category_slug": "laptops",
        "price": 69999,
        "compare_price": 75999,
        "stock_level": 10,
        "images": ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800"]
    },
    {
        "title": "HP Pavilion 15 Ryzen 7",
        "description": "Універсальний ноутбук для роботи та розваг з AMD Ryzen 7 та 16GB RAM.",
        "category_slug": "laptops",
        "price": 28999,
        "compare_price": 32999,
        "stock_level": 25,
        "images": ["https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800"]
    },
    # Планшети
    {
        "title": "iPad Pro 12.9 M2 256GB",
        "description": "Професійний планшет Apple з чіпом M2, дисплеєм Liquid Retina XDR та підтримкою Apple Pencil 2.",
        "category_slug": "tablets",
        "price": 52999,
        "compare_price": 57999,
        "stock_level": 12,
        "images": ["https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800"],
        "is_bestseller": True
    },
    {
        "title": "iPad Air 11 M2 128GB",
        "description": "Потужний та легкий планшет з чіпом M2 та 11-дюймовим Liquid Retina дисплеєм.",
        "category_slug": "tablets",
        "price": 27999,
        "compare_price": 30999,
        "stock_level": 20,
        "images": ["https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800"]
    },
    {
        "title": "Samsung Galaxy Tab S9 Ultra",
        "description": "Преміум планшет Samsung з 14.6 AMOLED дисплеєм та S Pen в комплекті.",
        "category_slug": "tablets",
        "price": 47999,
        "compare_price": 52999,
        "stock_level": 8,
        "images": ["https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=800"],
        "is_featured": True
    },
    # Аудіо
    {
        "title": "AirPods Pro 2 USB-C",
        "description": "Бездротові навушники з активним шумопоглинанням H2, адаптивним еквалайзером та USB-C зарядкою.",
        "category_slug": "audio",
        "price": 10999,
        "compare_price": 12499,
        "stock_level": 40,
        "images": ["https://images.unsplash.com/photo-1606741965326-cb990ae01bb2?w=800"],
        "is_bestseller": True,
        "is_featured": True
    },
    {
        "title": "AirPods Max Silver",
        "description": "Преміум навушники Apple з Hi-Fi звуком, активним шумопоглинанням та до 20 годин роботи.",
        "category_slug": "audio",
        "price": 22999,
        "compare_price": 25999,
        "stock_level": 15,
        "images": ["https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?w=800"]
    },
    {
        "title": "Sony WH-1000XM5",
        "description": "Найкращі навушники з шумопоглинанням від Sony. 30 годин роботи, LDAC кодек.",
        "category_slug": "audio",
        "price": 14999,
        "compare_price": 17999,
        "stock_level": 25,
        "images": ["https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800"],
        "is_bestseller": True
    },
    {
        "title": "JBL Charge 5",
        "description": "Портативна Bluetooth колонка з потужним звуком, захистом IP67 та функцією PowerBank.",
        "category_slug": "audio",
        "price": 6499,
        "compare_price": 7499,
        "stock_level": 30,
        "images": ["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800"]
    },
    # Телевізори
    {
        "title": "Samsung QN85D Neo QLED 65",
        "description": "Преміум телевізор з технологією Neo QLED, 4K 120Hz та підтримкою Gaming Hub.",
        "category_slug": "tv",
        "price": 64999,
        "compare_price": 72999,
        "stock_level": 5,
        "images": ["https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800"],
        "is_featured": True
    },
    {
        "title": "LG OLED C4 55",
        "description": "OLED телевізор з ідеальним чорним кольором, Dolby Vision та HDMI 2.1 для геймінгу.",
        "category_slug": "tv",
        "price": 52999,
        "compare_price": 59999,
        "stock_level": 8,
        "images": ["https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800"],
        "is_bestseller": True
    },
    {
        "title": "Sony Bravia XR A80L 65",
        "description": "OLED телевізор Sony з когнітивним процесором XR та звуком Acoustic Surface Audio+.",
        "category_slug": "tv",
        "price": 69999,
        "compare_price": 77999,
        "stock_level": 4,
        "images": ["https://images.unsplash.com/photo-1558888401-3cc1de77652d?w=800"]
    },
    # Аксесуари
    {
        "title": "Apple Watch Series 9 45mm",
        "description": "Смарт-годинник Apple з чіпом S9, Double Tap жестом та яскравим Always-On дисплеєм.",
        "category_slug": "accessories",
        "price": 18999,
        "compare_price": 21999,
        "stock_level": 25,
        "images": ["https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=800"],
        "is_bestseller": True,
        "is_featured": True
    },
    {
        "title": "Apple Watch Ultra 2",
        "description": "Найміцніший Apple Watch для екстремальних умов. Титановий корпус, GPS двохчастотний.",
        "category_slug": "accessories",
        "price": 35999,
        "compare_price": 39999,
        "stock_level": 10,
        "images": ["https://images.unsplash.com/photo-1551816230-ef5deaed4a26?w=800"]
    },
    {
        "title": "Samsung Galaxy Watch 6 Classic 47mm",
        "description": "Класичний смарт-годинник з обертовим безелем та BioActive сенсором.",
        "category_slug": "accessories",
        "price": 14999,
        "compare_price": 17999,
        "stock_level": 18,
        "images": ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]
    },
    {
        "title": "MagSafe Charger 15W",
        "description": "Бездротова зарядка Apple MagSafe з магнітним кріпленням та швидкою зарядкою 15W.",
        "category_slug": "accessories",
        "price": 1899,
        "compare_price": 2199,
        "stock_level": 50,
        "images": ["https://images.unsplash.com/photo-1622445275463-afa2ab738c34?w=800"]
    },
    # Ігри та консолі
    {
        "title": "PlayStation 5 Slim",
        "description": "Нова компактна версія PS5 з SSD 1TB та DualSense контролером в комплекті.",
        "category_slug": "gaming",
        "price": 22999,
        "compare_price": 25999,
        "stock_level": 12,
        "images": ["https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800"],
        "is_bestseller": True,
        "is_featured": True
    },
    {
        "title": "Xbox Series X",
        "description": "Найпотужніша консоль Xbox з підтримкою 4K 120fps та швидким SSD 1TB.",
        "category_slug": "gaming",
        "price": 21999,
        "compare_price": 24999,
        "stock_level": 10,
        "images": ["https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=800"]
    },
    {
        "title": "Nintendo Switch OLED",
        "description": "Портативна консоль Nintendo з OLED дисплеєм та покращеною підставкою.",
        "category_slug": "gaming",
        "price": 14999,
        "compare_price": 16999,
        "stock_level": 20,
        "images": ["https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=800"],
        "is_bestseller": True
    },
    {
        "title": "DualSense Edge Controller",
        "description": "Преміум контролер для PS5 з налаштуванням кнопок та змінними стіками.",
        "category_slug": "gaming",
        "price": 8999,
        "compare_price": 9999,
        "stock_level": 15,
        "images": ["https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=800"]
    },
    # Розумний дім
    {
        "title": "HomePod mini",
        "description": "Компактна розумна колонка Apple з Siri та підтримкою HomeKit.",
        "category_slug": "smart-home",
        "price": 4499,
        "compare_price": 4999,
        "stock_level": 30,
        "images": ["https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=800"]
    },
    {
        "title": "Apple TV 4K 128GB",
        "description": "Медіаплеєр Apple з підтримкою 4K HDR, Dolby Atmos та ігор Apple Arcade.",
        "category_slug": "smart-home",
        "price": 7499,
        "compare_price": 8499,
        "stock_level": 20,
        "images": ["https://images.unsplash.com/photo-1528928441742-b4ccac1bb04c?w=800"]
    },
    # Фото та відео
    {
        "title": "Sony A7 IV Body",
        "description": "Повнокадрова камера Sony з матрицею 33MP, 4K 60p відео та швидким автофокусом.",
        "category_slug": "photo-video",
        "price": 89999,
        "compare_price": 99999,
        "stock_level": 5,
        "images": ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800"],
        "is_featured": True
    },
    {
        "title": "Canon EOS R6 Mark II",
        "description": "Професійна камера Canon з 24.2MP, 6K відео та системою автофокуса Dual Pixel.",
        "category_slug": "photo-video",
        "price": 94999,
        "compare_price": 104999,
        "stock_level": 4,
        "images": ["https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800"]
    },
    {
        "title": "GoPro HERO12 Black",
        "description": "Екшн-камера з 5.3K відео, HyperSmooth 6.0 стабілізацією та водозахистом до 10м.",
        "category_slug": "photo-video",
        "price": 17999,
        "compare_price": 19999,
        "stock_level": 15,
        "images": ["https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800"],
        "is_bestseller": True
    },
    {
        "title": "DJI Mini 4 Pro",
        "description": "Компактний дрон з камерою 4K/60fps, 34 хв польоту та ActiveTrack 360.",
        "category_slug": "photo-video",
        "price": 34999,
        "compare_price": 39999,
        "stock_level": 8,
        "images": ["https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800"]
    },
    # Побутова техніка
    {
        "title": "Dyson V15 Detect",
        "description": "Бездротовий пилосос з лазерним виявленням пилу та LCD дисплеєм.",
        "category_slug": "appliances",
        "price": 29999,
        "compare_price": 34999,
        "stock_level": 10,
        "images": ["https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800"],
        "is_bestseller": True
    },
    {
        "title": "Roborock S8 Pro Ultra",
        "description": "Робот-пилосос з самоочисною базою, мопом та розумною навігацією.",
        "category_slug": "appliances",
        "price": 42999,
        "compare_price": 47999,
        "stock_level": 7,
        "images": ["https://images.unsplash.com/photo-1518818608552-195ed130cda4?w=800"],
        "is_featured": True
    },
    {
        "title": "Philips Airfryer XXL",
        "description": "Мультипіч великого обєму з технологією RapidAir та 5 програмами.",
        "category_slug": "appliances",
        "price": 8999,
        "compare_price": 10499,
        "stock_level": 20,
        "images": ["https://images.unsplash.com/photo-1585664811087-47f65abbad64?w=800"]
    },
    {
        "title": "DeLonghi Magnifica S",
        "description": "Автоматична кавомашина з вбудованою кавомолкою та капучинатором.",
        "category_slug": "appliances",
        "price": 16999,
        "compare_price": 18999,
        "stock_level": 12,
        "images": ["https://images.unsplash.com/photo-1517353317345-4701ad3e5c0e?w=800"],
        "is_bestseller": True
    }
]

async def seed_products():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Get category map
    categories = await db.categories.find({}, {'_id': 0}).to_list(100)
    cat_map = {c['slug']: c['id'] for c in categories}
    
    created = 0
    for prod in PRODUCTS:
        # Check if exists
        existing = await db.products.find_one({'title': prod['title']})
        if existing:
            continue
        
        category_id = cat_map.get(prod['category_slug'], 'other')
        slug = re.sub(r'[^a-z0-9]+', '-', prod['title'].lower()).strip('-')
        
        product_doc = {
            'id': str(uuid.uuid4()),
            'seller_id': 'system',
            'title': prod['title'],
            'slug': f"{slug}-{str(uuid.uuid4())[:8]}",
            'description': prod['description'],
            'short_description': prod['description'][:100] + '...' if len(prod['description']) > 100 else prod['description'],
            'category_id': category_id,
            'category_name': prod['category_slug'],
            'price': prod['price'],
            'compare_price': prod.get('compare_price'),
            'currency': 'UAH',
            'stock_level': prod['stock_level'],
            'images': prod['images'],
            'videos': [],
            'specifications': [],
            'status': 'published',
            'rating': round(4.0 + (hash(prod['title']) % 10) / 10, 1),
            'reviews_count': hash(prod['title']) % 50 + 5,
            'views_count': hash(prod['title']) % 500 + 100,
            'is_bestseller': prod.get('is_bestseller', False),
            'is_featured': prod.get('is_featured', False),
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        await db.products.insert_one(product_doc)
        created += 1
        print(f'Created: {prod["title"]}')
    
    print(f'\nTotal products created: {created}')
    total = await db.products.count_documents({})
    print(f'Total products in DB: {total}')

if __name__ == '__main__':
    asyncio.run(seed_products())
