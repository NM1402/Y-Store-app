#!/usr/bin/env python3
"""
PROTECTED: Category Seeding Script
This script ensures categories are always present in the database.
Run this script whenever categories disappear or need restoration.

Usage: python3 seed_categories.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
from datetime import datetime, timezone
import os

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# PROTECTED CATEGORIES - DO NOT MODIFY
# These are the core categories for Y-Store
# Icons are EMOJI, not text names!
CATEGORIES = [
    {
        'name': 'Смартфони',
        'slug': 'smartphones',
        'icon': '📱',  # EMOJI icons - this is what the frontend expects!
        'image': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
        'order': 1,
    },
    {
        'name': 'Ноутбуки та комп\'ютери',
        'slug': 'laptops',
        'icon': '💻',
        'image': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400',
        'order': 2,
    },
    {
        'name': 'Планшети',
        'slug': 'tablets',
        'icon': '🖥️',
        'image': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400',
        'order': 3,
    },
    {
        'name': 'Аксесуари',
        'slug': 'accessories',
        'icon': '🎧',
        'image': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
        'order': 4,
    },
    {
        'name': 'Розумні годинники',
        'slug': 'smartwatches',
        'icon': '⌚',
        'image': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
        'order': 5,
    },
    {
        'name': 'Телевізори',
        'slug': 'tvs',
        'icon': '📺',
        'image': 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400',
        'order': 6,
    },
    {
        'name': 'Аудіо',
        'slug': 'audio',
        'icon': '🔊',
        'image': 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=400',
        'order': 7,
    },
    {
        'name': 'Фото та відео',
        'slug': 'photo-video',
        'icon': '📷',
        'image': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400',
        'order': 8,
    },
]


async def seed_categories():
    """Seed or update categories in the database."""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print(f"Connecting to {MONGO_URL}/{DB_NAME}...")
    
    # Check existing categories
    existing_count = await db.categories.count_documents({})
    print(f"Found {existing_count} existing categories")
    
    for cat_data in CATEGORIES:
        # Check if category exists by slug
        existing = await db.categories.find_one({'slug': cat_data['slug']})
        
        if existing:
            # Update existing category (preserve id)
            await db.categories.update_one(
                {'slug': cat_data['slug']},
                {'$set': {
                    'name': cat_data['name'],
                    'icon': cat_data['icon'],
                    'image': cat_data['image'],
                    'order': cat_data['order'],
                    'is_active': True,
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }}
            )
            print(f"  Updated: {cat_data['name']}")
        else:
            # Create new category
            new_cat = {
                'id': str(uuid.uuid4()),
                'name': cat_data['name'],
                'slug': cat_data['slug'],
                'parent_id': None,
                'icon': cat_data['icon'],
                'image': cat_data['image'],
                'order': cat_data['order'],
                'is_active': True,
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            await db.categories.insert_one(new_cat)
            print(f"  Created: {cat_data['name']}")
    
    # Final count
    final_count = await db.categories.count_documents({})
    print(f"\nDone! Total categories: {final_count}")
    
    client.close()


if __name__ == '__main__':
    asyncio.run(seed_categories())
