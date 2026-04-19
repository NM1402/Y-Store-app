"""
Update products with brand field based on title
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / '.env')

# Brand mapping based on product title keywords
BRAND_KEYWORDS = {
    "Apple": ["iPhone", "MacBook", "iPad", "AirPods", "Apple Watch", "iMac", "Mac Mini", "Mac Studio"],
    "Samsung": ["Samsung", "Galaxy"],
    "Xiaomi": ["Xiaomi", "Redmi", "POCO"],
    "Google": ["Google", "Pixel"],
    "Sony": ["Sony", "PlayStation", "DualSense"],
    "Canon": ["Canon", "EOS"],
    "Nikon": ["Nikon"],
    "DJI": ["DJI", "Mavic", "Osmo"],
    "LG": ["LG"],
    "Philips": ["Philips"],
    "Bosch": ["Bosch"],
    "Dyson": ["Dyson"],
    "JBL": ["JBL"],
    "Bose": ["Bose"],
    "Logitech": ["Logitech"],
    "Microsoft": ["Microsoft", "Xbox", "Surface"],
    "ASUS": ["ASUS", "ROG"],
    "Dell": ["Dell", "Alienware"],
    "HP": ["HP"],
    "Lenovo": ["Lenovo", "ThinkPad"],
    "OnePlus": ["OnePlus"],
    "Huawei": ["Huawei"],
    "GoPro": ["GoPro"],
    "Garmin": ["Garmin"],
    "Fitbit": ["Fitbit"],
}

def detect_brand(title: str) -> str:
    """Detect brand from product title"""
    title_upper = title.upper()
    for brand, keywords in BRAND_KEYWORDS.items():
        for keyword in keywords:
            if keyword.upper() in title_upper:
                return brand
    return "Other"

async def update_brands():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'marketplace_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Get all products
    products = await db.products.find({}, {"_id": 1, "id": 1, "title": 1, "brand": 1}).to_list(1000)
    
    updated = 0
    for p in products:
        title = p.get("title", "")
        current_brand = p.get("brand")
        
        # Skip if already has brand
        if current_brand:
            continue
        
        new_brand = detect_brand(title)
        
        await db.products.update_one(
            {"_id": p["_id"]},
            {"$set": {"brand": new_brand}}
        )
        updated += 1
        print(f"Updated: {title[:40]} -> {new_brand}")
    
    print(f"\nTotal updated: {updated}")
    client.close()

if __name__ == "__main__":
    asyncio.run(update_brands())
