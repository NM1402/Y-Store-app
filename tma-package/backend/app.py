"""
Y-Store Marketplace - Main Application
Clean modular architecture for easy development and deployment
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from core.config import settings
from core.db import init_db, close_db

# Import routers from modules
from modules.auth import router as auth_router, auth_v2_router
from modules.products import router as products_router, categories_router
from modules.cart import router as cart_router
from modules.orders import router as orders_router, orders_v2_router
from modules.reviews import router as reviews_router
from modules.admin import router as admin_router
from modules.delivery import router as delivery_router
from modules.payments import router as payments_router
from modules.payments.payment_health_routes import router as payment_health_router
from modules.risk.risk_routes import router as risk_router
from modules.content import router as content_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("🚀 Starting Y-Store API...")
    await init_db()
    logger.info("✅ Database connected and indexes created")
    yield
    logger.info("👋 Shutting down...")
    await close_db()


# Create app
app = FastAPI(
    title="Y-Store Marketplace API",
    description="Modular e-commerce API",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router, prefix="/api")
app.include_router(auth_v2_router, prefix="/api")  # V2 Auth: Google OAuth + Guest Checkout
app.include_router(categories_router, prefix="/api")
app.include_router(products_router, prefix="/api")
app.include_router(cart_router, prefix="/api")
app.include_router(orders_router, prefix="/api")
app.include_router(orders_v2_router, prefix="/api")  # V2 Orders: Guest Checkout
app.include_router(reviews_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(delivery_router, prefix="/api")
app.include_router(payments_router, prefix="/api")
app.include_router(payment_health_router, prefix="/api")
app.include_router(risk_router, prefix="/api")
app.include_router(content_router, prefix="/api")


@app.get("/api")
async def root():
    """API health check"""
    return {
        "message": "Y-Store API v2.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/api/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}
