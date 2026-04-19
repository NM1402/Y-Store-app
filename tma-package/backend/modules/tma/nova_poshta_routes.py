"""
TMA Nova Poshta autocomplete routes
• /api/tma/np/cities?q=ки     → suggestions of cities
• /api/tma/np/warehouses?city_ref=...&q=5  → filtered warehouse list
• Uses the shared /app/backend/novaposhta_service.py (NOVAPOSHTA_API_KEY in .env)
• Cached in-memory (TTL 10 min) to avoid hammering NP API
"""
from __future__ import annotations

import sys
import time
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query

# Make /app/backend importable regardless of how uvicorn loads the module
BACKEND_DIR = Path(__file__).parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from novaposhta_service import novaposhta_service  # noqa: E402

router = APIRouter(prefix="/tma/np", tags=["TMA · Nova Poshta"])

# Simple in-memory TTL cache ------------------------------------------------
_CACHE: dict[str, tuple[float, Any]] = {}
_CITIES_TTL = 600  # 10 min
_WH_TTL = 600


def _cache_get(key: str):
    v = _CACHE.get(key)
    if not v:
        return None
    exp, data = v
    if exp < time.time():
        _CACHE.pop(key, None)
        return None
    return data


def _cache_set(key: str, data, ttl: int):
    _CACHE[key] = (time.time() + ttl, data)


# ------------------------------------------------------------------ CITIES
@router.get("/cities")
async def tma_np_cities(
    q: str = Query(..., min_length=1, max_length=60, description="Введіть 1+ літер міста"),
    limit: int = Query(10, ge=1, le=25),
):
    """Autocomplete по містах Нової пошти (2+ символів достатньо, 1 — теж працює, але з меншою точністю)."""
    q_clean = q.strip()
    if not q_clean:
        raise HTTPException(400, "Empty query")

    cache_key = f"c:{q_clean.lower()}:{limit}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    result = novaposhta_service.search_cities(q_clean, limit=limit)
    if not result.get("success"):
        raise HTTPException(502, "Nova Poshta unavailable")

    # Нормалізуємо payload для фронта
    payload = {
        "success": True,
        "items": [
            {
                "ref": it.get("ref"),
                "name": it.get("city_name"),
                "full": it.get("description"),
                "region": it.get("region"),
            }
            for it in (result.get("data") or [])
            if it.get("ref")
        ],
    }
    _cache_set(cache_key, payload, _CITIES_TTL)
    return payload


# ------------------------------------------------------------------ WAREHOUSES
@router.get("/warehouses")
async def tma_np_warehouses(
    city_ref: str = Query(..., description="Ref міста (з /cities)"),
    q: str | None = Query(None, description="Фільтр по номеру/адресу"),
    limit: int = Query(30, ge=1, le=100),
):
    """Список відділень + поштоматів по місту з опц. фільтром."""
    cache_key = f"wh:{city_ref}"
    cached = _cache_get(cache_key)
    if cached is None:
        result = novaposhta_service.get_warehouses(city_ref)
        if not result.get("success"):
            raise HTTPException(502, "Nova Poshta unavailable")
        _cache_set(cache_key, result.get("data", []), _WH_TTL)
        cached = result.get("data", [])

    items = cached
    if q:
        q_low = q.strip().lower()
        filtered = []
        for w in items:
            num = str(w.get("number", ""))
            desc = (w.get("description") or "").lower()
            short = (w.get("short_address") or "").lower()
            if (
                num.startswith(q_low)
                or q_low in desc
                or q_low in short
            ):
                filtered.append(w)
        items = filtered

    items = items[:limit]

    return {
        "success": True,
        "items": [
            {
                "ref": w.get("ref"),
                "number": w.get("number"),
                "name": w.get("description"),
                "short": w.get("short_address"),
                "category": w.get("category_of_warehouse"),
            }
            for w in items
        ],
        "total": len(items),
    }
