"""
SEO Routes - Sitemap, Robots.txt
"""
from fastapi import APIRouter
from fastapi.responses import Response
from datetime import datetime
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "ystore")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

BASE_URL = "https://y-store.ua"


@router.get("/sitemap.xml")
async def sitemap():
    """Generate sitemap.xml"""
    
    # Get active products
    products = await db.products.find(
        {"is_active": {"$ne": False}},
        {"id": 1, "slug": 1, "updated_at": 1}
    ).to_list(50000)
    
    # Get active categories
    categories = await db.categories.find(
        {"is_active": {"$ne": False}},
        {"id": 1, "slug": 1}
    ).to_list(500)
    
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    # Main pages
    static_pages = [
        ("/", "1.0", "daily"),
        ("/products", "0.9", "daily"),
        ("/promotions", "0.8", "daily"),
        ("/contact", "0.5", "monthly"),
        ("/delivery-payment", "0.5", "monthly"),
        ("/exchange-return", "0.5", "monthly"),
        ("/about", "0.5", "monthly"),
    ]
    
    for page, priority, changefreq in static_pages:
        xml += f"""  <url>
    <loc>{BASE_URL}{page}</loc>
    <changefreq>{changefreq}</changefreq>
    <priority>{priority}</priority>
  </url>\n"""
    
    # Category pages
    for cat in categories:
        slug = cat.get("slug") or cat.get("id")
        xml += f"""  <url>
    <loc>{BASE_URL}/products?category={slug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>\n"""
    
    # Product pages
    for prod in products:
        prod_id = prod.get("id") or str(prod.get("_id"))
        updated = prod.get("updated_at")
        lastmod = ""
        if updated:
            if hasattr(updated, "strftime"):
                lastmod = f"\n    <lastmod>{updated.strftime('%Y-%m-%d')}</lastmod>"
        
        xml += f"""  <url>
    <loc>{BASE_URL}/product/{prod_id}</loc>{lastmod}
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n"""
    
    xml += '</urlset>'
    
    return Response(content=xml, media_type="application/xml")


@router.get("/robots.txt")
async def robots():
    """Generate robots.txt"""
    content = f"""User-agent: *
Allow: /

# Disallow admin and private pages
Disallow: /admin
Disallow: /admin/
Disallow: /profile
Disallow: /checkout
Disallow: /cart
Disallow: /login
Disallow: /register
Disallow: /seller/

# Sitemap
Sitemap: {BASE_URL}/sitemap.xml

# Crawl-delay for politeness
Crawl-delay: 1
"""
    return Response(content=content, media_type="text/plain")


@router.get("/api/v2/seo/meta/{page_type}/{slug}")
async def get_seo_meta(page_type: str, slug: str):
    """Get SEO meta for specific page"""
    
    if page_type == "product":
        product = await db.products.find_one(
            {"$or": [{"id": slug}, {"slug": slug}]},
            {"title": 1, "description": 1, "images": 1, "price": 1, "seo_title": 1, "seo_description": 1}
        )
        
        if not product:
            return {"error": "Product not found"}
        
        return {
            "title": product.get("seo_title") or f"{product.get('title')} - Y-Store",
            "description": product.get("seo_description") or product.get("description", "")[:160],
            "image": product.get("images", [None])[0],
            "url": f"{BASE_URL}/product/{slug}",
            "type": "product",
            "price": product.get("price")
        }
    
    elif page_type == "category":
        category = await db.categories.find_one(
            {"$or": [{"id": slug}, {"slug": slug}]},
            {"name": 1, "description": 1, "image": 1, "seo_title": 1, "seo_description": 1}
        )
        
        if not category:
            return {"error": "Category not found"}
        
        return {
            "title": category.get("seo_title") or f"{category.get('name')} - Y-Store",
            "description": category.get("seo_description") or category.get("description", "")[:160],
            "image": category.get("image"),
            "url": f"{BASE_URL}/products?category={slug}",
            "type": "category"
        }
    
    return {"error": "Invalid page type"}
