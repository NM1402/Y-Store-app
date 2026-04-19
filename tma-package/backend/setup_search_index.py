"""
Setup MongoDB text search indexes for products
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def setup_search_indexes():
    """Create text search indexes for products collection"""
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'marketplace_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"📦 Using database: {db_name}")
    print("🔍 Setting up search indexes...")
    
    # Drop existing text index if any
    try:
        await db.products.drop_index("title_text_description_text")
        print("✅ Dropped old text index")
    except:
        print("ℹ️  No existing text index to drop")
    
    # Create text index on title (weight 10) and description (weight 5)
    # Higher weight = more relevance in search results
    await db.products.create_index([
        ("title", "text"),
        ("description", "text"),
        ("short_description", "text")
    ], weights={
        "title": 10,
        "description": 5,
        "short_description": 7
    }, name="product_text_search")
    
    print("✅ Created text search index with weights:")
    print("   - title: 10 (highest relevance)")
    print("   - short_description: 7")
    print("   - description: 5")
    
    # Create additional indexes for filtering
    await db.products.create_index([("category_id", 1)])
    print("✅ Created category_id index")
    
    await db.products.create_index([("price", 1)])
    print("✅ Created price index")
    
    await db.products.create_index([("rating", -1)])
    print("✅ Created rating index")
    
    await db.products.create_index([("created_at", -1)])
    print("✅ Created created_at index")
    
    await db.products.create_index([("views_count", -1)])
    print("✅ Created views_count index")
    
    # List all indexes
    indexes = await db.products.list_indexes().to_list(100)
    print("\n📋 All indexes on products collection:")
    for idx in indexes:
        print(f"   - {idx['name']}: {idx.get('key', {})}")
    
    print("\n🎉 Search indexes setup complete!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(setup_search_indexes())
