"""
Telegram Mini App — Backend server
Minimal FastAPI app focused on Mini App needs: catalog, cart, orders, users.
"""
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# DB
from core.db import db  # noqa: E402

# TMA router — главный для мини-аппы
from modules.tma.routes import router as tma_router  # noqa: E402

# Доп. общие маршруты (каталог, магазин, отзывы, поддержка) — см. ниже
from modules.shop_routes import router as shop_router  # noqa: E402
from modules.seed_routes import router as seed_router  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting Telegram Mini App backend...")
    # Создаём индексы
    try:
        await db.users.create_index("id", unique=True)
        await db.users.create_index("telegram_id", sparse=True)
        await db.products.create_index("id", unique=True)
        await db.products.create_index("category_id")
        await db.products.create_index("category_slug")
        await db.categories.create_index("id", unique=True)
        await db.categories.create_index("slug", unique=True)
        await db.orders.create_index("id", unique=True)
        await db.orders.create_index("buyer_id")
        await db.tma_sessions.create_index("token", unique=True)
        await db.tma_sessions.create_index("expires_at", expireAfterSeconds=0)
        await db.tma_favorites.create_index([("user_id", 1), ("product_id", 1)], unique=True)
        await db.tma_support_tickets.create_index("id", unique=True)
        logger.info("✅ Indexes ready")
    except Exception as e:
        logger.warning(f"Index creation issue: {e}")

    # Автоматический сид данных при первом запуске
    try:
        from modules.seed_routes import auto_seed
        await auto_seed()
    except Exception as e:
        logger.warning(f"Auto-seed failed: {e}")

    yield
    logger.info("👋 Shutting down...")


app = FastAPI(title="Telegram Mini App API", version="1.0.0", lifespan=lifespan)

cors_origins = os.environ.get("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
@app.get("/health")
async def health():
    return {"status": "ok", "service": "tma-api"}


@app.get("/api")
async def root():
    return {"message": "Telegram Mini App API", "status": "running"}


# Noop endpoints for legacy main-site calls (if someone opens / instead of /tma)
@app.post("/api/analytics/event")
async def _analytics_event():
    return {"status": "ok"}


@app.get("/api/cart")
async def _cart_noop():
    return {"items": [], "total": 0}


@app.get("/api/v2/auth/me")
async def _auth_me_noop():
    return {"user": None}


# Routers
app.include_router(tma_router, prefix="/api", tags=["Telegram Mini App"])
app.include_router(shop_router, prefix="/api", tags=["Shop"])
app.include_router(seed_router, prefix="/api", tags=["Seed"])

# Nova Poshta autocomplete для TMA Checkout
from modules.tma.nova_poshta_routes import router as tma_np_router  # noqa: E402
app.include_router(tma_np_router, prefix="/api", tags=["TMA · Nova Poshta"])

# Telegram BFF — mobile-optimized aggregated endpoints
from modules.telegram_bff import router as telegram_bff_router  # noqa: E402
app.include_router(telegram_bff_router, prefix="/api", tags=["Telegram BFF"])
