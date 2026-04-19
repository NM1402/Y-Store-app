"""
Y-Store Marketplace - Configuration
"""
import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    MONGO_URL: str = "mongodb://localhost:27017"
    DB_NAME: str = "marketplace_db"
    
    # Security
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: str = "*"
    
    # External Services
    EMERGENT_LLM_KEY: str = ""
    NOVAPOSHTA_API_KEY: str = ""
    ROZETKAPAY_LOGIN: str = ""
    ROZETKAPAY_PASSWORD: str = ""
    
    # Nova Poshta TTN Automation
    NP_API_KEY: str = ""
    NP_SENDER_CITY_REF: str = ""
    NP_SENDER_WAREHOUSE_REF: str = ""
    NP_SENDER_COUNTERPARTY_REF: str = ""
    NP_SENDER_CONTACT_REF: str = ""
    NP_SENDER_PHONE: str = ""
    NP_SENDER_NAME: str = "Y-Store"
    
    # Fondy Payment Gateway
    FONDY_MERCHANT_ID: str = ""
    FONDY_MERCHANT_PASSWORD: str = ""
    FONDY_CALLBACK_URL: str = ""
    FONDY_RETURN_URL: str = ""
    
    # Optional
    CLOUDINARY_URL: str = ""
    
    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
