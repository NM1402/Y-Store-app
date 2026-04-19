"""
Delivery Module - Nova Poshta Integration
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
import aiohttp

from core.config import settings

router = APIRouter(prefix="/api/delivery", tags=["Delivery"])

NP_API_URL = "https://api.novaposhta.ua/v2.0/json/"


async def np_request(method: str, model: str, props: dict = None):
    """Make request to Nova Poshta API"""
    payload = {
        "apiKey": settings.NOVAPOSHTA_API_KEY,
        "modelName": model,
        "calledMethod": method,
        "methodProperties": props or {}
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(NP_API_URL, json=payload) as resp:
            data = await resp.json()
            if not data.get("success"):
                return []
            return data.get("data", [])


@router.get("/cities")
async def search_cities(query: str, limit: int = 10):
    """Search Nova Poshta cities"""
    if len(query) < 2:
        return []
    
    data = await np_request("searchSettlements", "Address", {
        "CityName": query,
        "Limit": str(limit)
    })
    
    if not data:
        return []
    
    addresses = data[0].get("Addresses", []) if data else []
    return [
        {
            "ref": a.get("Ref"),
            "name": a.get("Present"),
            "delivery_city": a.get("DeliveryCity")
        }
        for a in addresses[:limit]
    ]


@router.get("/warehouses")
async def get_warehouses(city_ref: str, number: Optional[str] = None):
    """Get Nova Poshta warehouses in city"""
    props = {"CityRef": city_ref, "Limit": "50"}
    if number:
        props["FindByString"] = number
    
    data = await np_request("getWarehouses", "Address", props)
    
    return [
        {
            "ref": w.get("Ref"),
            "number": w.get("Number"),
            "description": w.get("Description"),
            "short_address": w.get("ShortAddress")
        }
        for w in data
    ]


@router.get("/calculate")
async def calculate_delivery(
    city_ref: str,
    weight: float = 1,
    cost: float = 1000
):
    """Calculate delivery cost"""
    data = await np_request("getDocumentPrice", "InternetDocument", {
        "CitySender": "8d5a980d-391c-11dd-90d9-001a92567626",  # Kyiv
        "CityRecipient": city_ref,
        "Weight": str(weight),
        "Cost": str(cost),
        "ServiceType": "WarehouseWarehouse",
        "CargoType": "Cargo"
    })
    
    if not data:
        return {"cost": 0, "delivery_date": None}
    
    return {
        "cost": data[0].get("Cost", 0),
        "delivery_date": data[0].get("DeliveryDate", {}).get("date")
    }


@router.get("/estimate")
async def estimate_delivery_time(city_ref: str):
    """Estimate delivery time to city"""
    data = await np_request("getDocumentDeliveryDate", "InternetDocument", {
        "CitySender": "8d5a980d-391c-11dd-90d9-001a92567626",  # Kyiv
        "CityRecipient": city_ref,
        "ServiceType": "WarehouseWarehouse"
    })
    
    if not data:
        return {"delivery_date": None, "days": None}
    
    delivery_date = data[0].get("DeliveryDate", {})
    return {
        "delivery_date": delivery_date.get("date"),
        "days": 1 if delivery_date else 2  # Default estimate
    }


@router.post("/v2/calculate")
async def calculate_delivery_v2(payload: dict):
    """
    Enhanced delivery calculation with free delivery threshold
    """
    city_ref = payload.get("city_ref")
    cart_total = payload.get("cart_total", 0)
    weight = payload.get("weight", 1)
    
    FREE_DELIVERY_THRESHOLD = 2000
    
    # Calculate base cost
    data = await np_request("getDocumentPrice", "InternetDocument", {
        "CitySender": "8d5a980d-391c-11dd-90d9-001a92567626",
        "CityRecipient": city_ref,
        "Weight": str(weight),
        "Cost": str(cart_total),
        "ServiceType": "WarehouseWarehouse",
        "CargoType": "Cargo"
    })
    
    base_cost = data[0].get("Cost", 0) if data else 70  # Default 70 UAH
    delivery_date = data[0].get("DeliveryDate", {}).get("date") if data else None
    
    # Check free delivery
    is_free = cart_total >= FREE_DELIVERY_THRESHOLD
    final_cost = 0 if is_free else base_cost
    
    return {
        "base_cost": base_cost,
        "final_cost": final_cost,
        "is_free": is_free,
        "free_delivery_threshold": FREE_DELIVERY_THRESHOLD,
        "amount_for_free": max(0, FREE_DELIVERY_THRESHOLD - cart_total),
        "delivery_date": delivery_date,
        "estimated_days": 1 if city_ref else 2
    }
