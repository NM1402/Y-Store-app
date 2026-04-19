"""
Nova Poshta API Integration Service
Provides city search and warehouse/branch lookup functionality
"""

import os
import logging
import requests
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class NovaPoshtaService:
    """Service for interacting with Nova Poshta API"""
    
    def __init__(self):
        self.api_url = "https://api.novaposhta.ua/v2.0/json/"
        # For testing without API key, we'll use public access
        # In production, get API key from: https://my.novaposhta.ua/settings/index#apikeys
        self.api_key = os.environ.get('NOVAPOSHTA_API_KEY', '')
        
        if not self.api_key:
            logger.warning("Nova Poshta API key not configured - using limited access")
    
    def _make_request(self, model_name: str, called_method: str, method_properties: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make API request to Nova Poshta
        
        Args:
            model_name: API model name (e.g., 'Address', 'AddressGeneral')
            called_method: Method to call (e.g., 'getCities', 'getWarehouses')
            method_properties: Method parameters
            
        Returns:
            API response data
        """
        try:
            payload = {
                "apiKey": self.api_key if self.api_key else "",
                "modelName": model_name,
                "calledMethod": called_method,
                "methodProperties": method_properties
            }
            
            response = requests.post(
                self.api_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            response.raise_for_status()
            result = response.json()
            
            if not result.get("success"):
                logger.error(f"Nova Poshta API error: {result.get('errors', [])}")
                return {
                    "success": False,
                    "errors": result.get("errors", [])
                }
            
            return {
                "success": True,
                "data": result.get("data", [])
            }
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Error calling Nova Poshta API: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }
    
    def search_cities(self, query: str, limit: int = 10) -> Dict[str, Any]:
        """
        Search for cities by name
        
        Args:
            query: Search query (city name)
            limit: Maximum number of results
            
        Returns:
            Dict with list of cities
        """
        result = self._make_request(
            model_name="Address",
            called_method="searchSettlements",
            method_properties={
                "CityName": query,
                "Limit": limit
            }
        )
        
        if not result.get("success"):
            return result
        
        # Parse and format city data
        cities = []
        data = result.get("data", [])
        
        # API returns nested structure with Addresses array
        if data and len(data) > 0:
            addresses = data[0].get("Addresses", [])
            for item in addresses:
                cities.append({
                    "ref": item.get("DeliveryCity"),  # City reference ID
                    "description": item.get("Present", ""),  # Full city name with region
                    "city_name": item.get("MainDescription", ""),  # City name only
                    "region": item.get("Area", ""),  # Region
                    "settlement_type": item.get("SettlementTypeCode", "")
                })
        
        return {
            "success": True,
            "data": cities
        }
    
    def get_warehouses(self, city_ref: str, warehouse_number: Optional[str] = None) -> Dict[str, Any]:
        """
        Get list of Nova Poshta warehouses/branches by city
        
        Args:
            city_ref: City reference ID
            warehouse_number: Optional warehouse number to filter (e.g., "1", "2")
            
        Returns:
            Dict with list of warehouses
        """
        method_properties = {
            "CityRef": city_ref,
            "Limit": 500
        }
        
        # Add warehouse number filter if provided
        if warehouse_number:
            method_properties["Number"] = warehouse_number
        
        result = self._make_request(
            model_name="AddressGeneral",
            called_method="getWarehouses",
            method_properties=method_properties
        )
        
        if not result.get("success"):
            return result
        
        # Parse and format warehouse data
        warehouses = []
        for item in result.get("data", []):
            # Skip if warehouse number doesn't match (partial matching)
            if warehouse_number and not item.get("Number", "").startswith(warehouse_number):
                continue
            
            warehouses.append({
                "ref": item.get("Ref"),
                "description": item.get("Description", ""),
                "short_address": item.get("ShortAddress", ""),
                "number": item.get("Number", ""),
                "city_ref": item.get("CityRef", ""),
                "city": item.get("CityDescription", ""),
                "category_of_warehouse": item.get("CategoryOfWarehouse", ""),
                "phone": item.get("Phone", ""),
                "schedule": {
                    "monday": item.get("Schedule", {}).get("Monday", ""),
                    "tuesday": item.get("Schedule", {}).get("Tuesday", ""),
                    "wednesday": item.get("Schedule", {}).get("Wednesday", ""),
                    "thursday": item.get("Schedule", {}).get("Thursday", ""),
                    "friday": item.get("Schedule", {}).get("Friday", ""),
                    "saturday": item.get("Schedule", {}).get("Saturday", ""),
                    "sunday": item.get("Schedule", {}).get("Sunday", "")
                },
                "coordinates": {
                    "latitude": item.get("Latitude", ""),
                    "longitude": item.get("Longitude", "")
                }
            })
        
        return {
            "success": True,
            "data": warehouses,
            "total": len(warehouses)
        }


# Create singleton instance
novaposhta_service = NovaPoshtaService()
