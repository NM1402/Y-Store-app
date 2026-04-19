"""
Site Settings Module - Header config, socials, etc.
Provides API for admin to configure site-wide settings
WITH STRICT VALIDATION
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, validator
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from urllib.parse import urlparse
import os
import re

router = APIRouter()

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'marketplace_db')]

# ============= VALIDATION HELPERS =============

E164_RE = re.compile(r"^\+?[1-9]\d{7,14}$")
ALLOWED_SOCIALS = {"telegram", "instagram", "tiktok", "facebook"}

def normalize_phone(phone: str) -> str:
    """Normalize phone to E.164 format"""
    p = (phone or "").strip()
    p = re.sub(r"[^\d+]", "", p)
    
    # Ukrainian format: 050... -> +38050...
    if p.startswith("0") and len(p) == 10:
        p = "+38" + p
    elif p.startswith("38") and len(p) == 12:
        p = "+" + p
    elif not p.startswith("+"):
        p = "+" + p
    
    if not E164_RE.match(p):
        raise ValueError(f"Invalid phone format: {phone}")
    return p

def detect_social_type(url: str) -> str:
    """Auto-detect social network type by domain"""
    try:
        u = urlparse(url)
        host = (u.netloc or "").lower().replace("www.", "")
        
        if "t.me" in host or "telegram.me" in host:
            return "telegram"
        if "instagram.com" in host:
            return "instagram"
        if "tiktok.com" in host:
            return "tiktok"
        if "facebook.com" in host or "fb.com" in host:
            return "facebook"
        return "unknown"
    except:
        return "unknown"

def normalize_url(url: str) -> str:
    """Normalize URL with https"""
    url = (url or "").strip()
    if not url:
        raise ValueError("URL is required")
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    u = urlparse(url)
    if not u.netloc:
        raise ValueError(f"Invalid URL: {url}")
    return url

def validate_social(social_data: dict) -> dict:
    """Validate and normalize a social link"""
    url = normalize_url(social_data.get("url", ""))
    
    # Auto-detect type from URL
    detected_type = detect_social_type(url)
    provided_type = social_data.get("type", "")
    
    # URL must match a known social network
    if detected_type == "unknown":
        raise ValueError(f"URL does not match a supported social network (Telegram, Instagram, TikTok, Facebook). URL: {url}")
    
    # If type is provided, it must match detected type
    if provided_type and provided_type in ALLOWED_SOCIALS:
        if provided_type != detected_type:
            raise ValueError(f"URL type mismatch: expected {provided_type}, but URL looks like {detected_type}. URL: {url}")
    
    return {
        "type": detected_type,
        "url": url,
        "enabled": social_data.get("enabled", True)
    }

# ============= MODELS =============

class SocialLink(BaseModel):
    type: str
    url: str
    enabled: bool = True

class HeaderConfig(BaseModel):
    showTopbar: bool = True
    topbarStyle: str = "dark"
    phones: List[str] = ["050-247-41-61", "063-724-77-03"]
    socials: List[SocialLink] = []
    workingHours: Optional[str] = "Пн-Пт: 9:00-19:00, Сб: 10:00-17:00"
    navLinks: List[dict] = []

class SiteSettings(BaseModel):
    header: HeaderConfig = Field(default_factory=HeaderConfig)

class SiteSettingsUpdate(BaseModel):
    header: Optional[dict] = None

# Default config (fallback)
DEFAULT_HEADER_CONFIG = {
    "showTopbar": True,
    "topbarStyle": "dark",
    "phones": ["+380502474161", "+380637247703"],
    "socials": [
        {"type": "telegram", "url": "https://t.me/ystore", "enabled": True},
        {"type": "instagram", "url": "https://instagram.com/ystore", "enabled": True},
        {"type": "tiktok", "url": "https://tiktok.com/@ystore", "enabled": True},
        {"type": "facebook", "url": "https://facebook.com/ystore", "enabled": True},
    ],
    "workingHours": "Пн-Пт: 9:00-19:00, Сб: 10:00-17:00",
    "navLinks": [
        {"label": "Контакти", "href": "/contact"},
        {"label": "Доставка і оплата", "href": "/delivery-payment"},
        {"label": "Обмін і повернення", "href": "/exchange-return"},
        {"label": "Про нас", "href": "/about"},
        {"label": "Акції", "href": "/promotions", "highlight": True}
    ]
}

# ============= HELPER FUNCTIONS =============

async def get_or_create_settings():
    """Get site settings or create with defaults"""
    settings = await db.site_settings.find_one({"_id": "main"}, {"_id": 0})
    if not settings:
        default = {"_id": "main", "header": DEFAULT_HEADER_CONFIG}
        await db.site_settings.insert_one(default)
        return {"header": DEFAULT_HEADER_CONFIG}
    return settings

# ============= PUBLIC ENDPOINTS =============

@router.get("/site/header")
async def get_header_config():
    """
    Public endpoint: Get header configuration
    Used by frontend HeaderCore component
    Returns fallback if no settings found
    """
    try:
        settings = await get_or_create_settings()
        return settings.get("header", DEFAULT_HEADER_CONFIG)
    except Exception as e:
        return DEFAULT_HEADER_CONFIG

# ============= ADMIN ENDPOINTS =============

@router.get("/admin/site-settings")
async def get_site_settings():
    """Admin: Get all site settings"""
    settings = await get_or_create_settings()
    return settings

@router.patch("/admin/site-settings")
async def update_site_settings(update: SiteSettingsUpdate):
    """Admin: Update site settings WITH VALIDATION"""
    current = await get_or_create_settings()
    
    if update.header is None:
        return current
    
    header_data = update.header
    validated_header = {}
    
    # Validate topbar settings
    validated_header["showTopbar"] = bool(header_data.get("showTopbar", True))
    validated_header["topbarStyle"] = header_data.get("topbarStyle", "dark")
    if validated_header["topbarStyle"] not in ("dark", "light"):
        validated_header["topbarStyle"] = "dark"
    
    # Validate working hours
    validated_header["workingHours"] = (header_data.get("workingHours") or "")[:100]
    
    # Validate phones with strict E.164
    phones_raw = header_data.get("phones", [])
    if not isinstance(phones_raw, list):
        raise HTTPException(status_code=400, detail="phones must be an array")
    
    validated_phones = []
    for p in phones_raw[:4]:  # Max 4 phones
        if not p or not str(p).strip():
            continue
        try:
            validated_phones.append(normalize_phone(str(p)))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    validated_header["phones"] = validated_phones
    
    # Validate socials with auto-detect
    socials_raw = header_data.get("socials", [])
    if not isinstance(socials_raw, list):
        raise HTTPException(status_code=400, detail="socials must be an array")
    
    validated_socials = []
    seen_types = set()
    for s in socials_raw[:4]:  # Max 4 socials
        if not s or not isinstance(s, dict):
            continue
        try:
            validated = validate_social(s)
            # Only one of each type
            if validated["type"] not in seen_types:
                validated_socials.append(validated)
                seen_types.add(validated["type"])
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    validated_header["socials"] = validated_socials
    
    # Validate nav links
    nav_raw = header_data.get("navLinks", [])
    if isinstance(nav_raw, list):
        validated_nav = []
        for item in nav_raw[:12]:
            if not isinstance(item, dict):
                continue
            label = (item.get("label") or "").strip()[:50]
            href = (item.get("href") or "").strip()
            highlight = bool(item.get("highlight", False))
            
            if len(label) < 2:
                continue
            if not href.startswith("/"):
                continue
            
            validated_nav.append({"label": label, "href": href, "highlight": highlight})
        validated_header["navLinks"] = validated_nav
    
    # Save validated config
    await db.site_settings.update_one(
        {"_id": "main"},
        {"$set": {"header": validated_header}},
        upsert=True
    )
    
    return await get_or_create_settings()

@router.post("/admin/site-settings/reset")
async def reset_site_settings():
    """Admin: Reset settings to defaults"""
    default = {"_id": "main", "header": DEFAULT_HEADER_CONFIG}
    await db.site_settings.replace_one({"_id": "main"}, default, upsert=True)
    return {"message": "Settings reset to defaults", "settings": default}

# ============= LEGAL CONTENT =============

DEFAULT_LEGAL = {
    "terms": {
        "title": "Угода користувача",
        "content": """
        <h3>1. Загальні положення</h3>
        <p>Ця Угода користувача (далі - Угода) регулює відносини між Y-store (далі - Магазин) та користувачем (далі - Покупець) щодо використання інтернет-магазину.</p>
        
        <h3>2. Предмет угоди</h3>
        <p>Магазин надає Покупцю можливість придбання товарів, представлених на сайті, за цінами, вказаними на сайті.</p>
        
        <h3>3. Права та обов'язки сторін</h3>
        <p>Покупець зобов'язується надавати достовірну інформацію при оформленні замовлення.</p>
        <p>Магазин зобов'язується забезпечити належну якість товарів та своєчасну доставку.</p>
        
        <h3>4. Відповідальність</h3>
        <p>Сторони несуть відповідальність за невиконання своїх зобов'язань відповідно до законодавства України.</p>
        """
    },
    "privacy": {
        "title": "Політика конфіденційності",
        "content": """
        <h3>1. Збір інформації</h3>
        <p>Ми збираємо інформацію, яку ви надаєте при реєстрації та оформленні замовлення: ім'я, контактні дані, адресу доставки.</p>
        
        <h3>2. Використання інформації</h3>
        <p>Зібрана інформація використовується для:</p>
        <ul>
            <li>Обробки та доставки замовлень</li>
            <li>Зв'язку з покупцем</li>
            <li>Покращення якості обслуговування</li>
        </ul>
        
        <h3>3. Захист даних</h3>
        <p>Ми застосовуємо сучасні методи захисту персональних даних та не передаємо їх третім особам без вашої згоди.</p>
        
        <h3>4. Ваші права</h3>
        <p>Ви маєте право на доступ, виправлення або видалення своїх персональних даних.</p>
        """
    },
    "cookies": {
        "title": "Політика Cookie",
        "content": """
        <h3>Що таке Cookie?</h3>
        <p>Cookie - це невеликі текстові файли, які зберігаються на вашому пристрої під час відвідування сайту.</p>
        
        <h3>Як ми використовуємо Cookie?</h3>
        <p>Ми використовуємо Cookie для:</p>
        <ul>
            <li>Збереження налаштувань користувача</li>
            <li>Аналітики відвідувань сайту</li>
            <li>Покращення роботи сайту</li>
            <li>Персоналізації контенту</li>
        </ul>
        
        <h3>Як керувати Cookie?</h3>
        <p>Ви можете налаштувати браузер для блокування Cookie, але це може вплинути на функціональність сайту.</p>
        """
    }
}

@router.get("/site/legal")
async def get_legal_content():
    """Public: Get legal content (Terms, Privacy, Cookies)"""
    settings = await db.site_settings.find_one({"_id": "legal"})
    if settings and "content" in settings:
        return settings["content"]
    return DEFAULT_LEGAL

@router.put("/admin/site-settings/legal")
async def update_legal_content(data: dict):
    """Admin: Update legal content"""
    await db.site_settings.update_one(
        {"_id": "legal"},
        {"$set": {"content": data}},
        upsert=True
    )
    return {"message": "Legal content updated"}
